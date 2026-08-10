import { containsZeroWidth, sanitizeText, validateOrThrow } from "@aiet/domain";
import {
  type AnyPrimitive,
  IDCollisionError,
  PAKBErrorCode,
  SchemaValidationError,
} from "@aiet/schema";
import type { BudgetFitResult } from "./budget";
import {
  type PipelineContext,
  type PipelineOptions,
  type PipelineResult,
  createPipelineContext,
} from "./context";
import type { EmitterResult } from "./emitter";
import { AgentsEmitter, ClaudeEmitter, CursorEmitter, ManifestEmitter } from "./emitters";
import { filterPrimitives } from "./filter";
import { computeInputFingerprint } from "./fingerprint";
import { BudgetFitter } from "./fitting";
import type { CompilationResult } from "./index";
import { normalizePrimitive } from "./normalize";
import type { RankedPrimitive } from "./ranking";
import { RankingEngine } from "./ranking";
import { PIPELINE_STAGE_ORDER, PipelineStage } from "./stages";

export type { PipelineOptions, PipelineResult };

/**
 * Computes canonical hash from an array of already normalized primitives.
 */
export function computeHashFromNormalized(normalizedPrimitives: readonly AnyPrimitive[]): string {
  const sortedForHash = [...normalizedPrimitives].sort((a, b) => a.id.localeCompare(b.id));
  return computeInputFingerprint(sortedForHash).aggregate_hash;
}

export class CompilerPipeline {
  /**
   * Executes Stage 1: INGEST
   * Rejects null, undefined, non-objects, and duplicate primitive IDs.
   */
  public ingestStage(primitives: readonly AnyPrimitive[]): readonly AnyPrimitive[] {
    if (!Array.isArray(primitives)) {
      throw new SchemaValidationError(
        "Ingest stage failed: input must be an array of primitive objects.",
        PAKBErrorCode.SCHEMA_VALIDATION_ERROR,
      );
    }

    const seenIds = new Set<string>();
    const ingested: AnyPrimitive[] = [];

    for (let i = 0; i < primitives.length; i++) {
      const item = primitives[i];

      if (item === null || item === undefined || typeof item !== "object") {
        throw new SchemaValidationError(
          `Ingest stage failed: primitive at index ${i} is null, undefined, or non-object.`,
          PAKBErrorCode.SCHEMA_VALIDATION_ERROR,
        );
      }

      const id = (item as { id?: unknown }).id;
      if (typeof id !== "string" || id.length === 0) {
        throw new SchemaValidationError(
          `Ingest stage failed: primitive at index ${i} is missing a valid 'id' property.`,
          PAKBErrorCode.SCHEMA_VALIDATION_ERROR,
        );
      }

      if (seenIds.has(id)) {
        throw new IDCollisionError(
          `Ingest stage failed: duplicate primitive ID '${id}' detected at index ${i}.`,
          PAKBErrorCode.ID_COLLISION_ERROR,
          id,
        );
      }

      seenIds.add(id);
      ingested.push(item);
    }

    return Object.freeze(ingested);
  }

  /**
   * Executes Stage 2: SANITIZE
   * Removes Unicode Cf format/zero-width characters from string fields.
   */
  public sanitizeStage(primitives: readonly AnyPrimitive[]): readonly AnyPrimitive[] {
    const sanitizedList: AnyPrimitive[] = [];

    for (const primitive of primitives) {
      const cloned = JSON.parse(JSON.stringify(primitive)) as Record<string, unknown>;

      for (const key of Object.keys(cloned)) {
        if (
          key === "id" ||
          key === "created_at" ||
          key === "updated_at" ||
          key === "schema_version"
        ) {
          continue; // Preserve IDs and timestamps untouched
        }

        const value = cloned[key];
        if (typeof value === "string" && containsZeroWidth(value)) {
          const res = sanitizeText(value);
          cloned[key] = res.sanitized;
        }
      }

      sanitizedList.push(cloned as unknown as AnyPrimitive);
    }

    return Object.freeze(sanitizedList);
  }

  /**
   * Executes Stage 3: VALIDATE
   * Schema validates every primitive against pakb-schema-v1.json. Fail-fast.
   */
  public validateStage(primitives: readonly AnyPrimitive[]): readonly AnyPrimitive[] {
    const validatedList: AnyPrimitive[] = [];

    for (const primitive of primitives) {
      try {
        const validated = validateOrThrow(primitive);
        validatedList.push(validated);
      } catch (err) {
        if (err instanceof SchemaValidationError) {
          throw err;
        }
        throw new SchemaValidationError(
          `Validation stage failed for primitive '${primitive.id}': ${err instanceof Error ? err.message : String(err)}`,
          PAKBErrorCode.SCHEMA_VALIDATION_ERROR,
          primitive.id,
        );
      }
    }

    return Object.freeze(validatedList);
  }

  /**
   * Executes Stage 4: NORMALIZE
   * Sorts object keys recursively, normalizes line endings to LF, trims strings.
   */
  public normalizeStage(primitives: readonly AnyPrimitive[]): readonly AnyPrimitive[] {
    const normalizedList = primitives.map((prim) => normalizePrimitive(prim));
    return Object.freeze(normalizedList as AnyPrimitive[]);
  }

  /**
   * Executes Stage 5: FILTER
   * Removes archived, superseded, expired, and restricted primitives.
   */
  public filterStage(
    primitives: readonly AnyPrimitive[],
    context: PipelineContext,
  ): readonly AnyPrimitive[] {
    const filtered = filterPrimitives(primitives, context.options);
    return Object.freeze(filtered);
  }

  /**
   * Executes Stage 6: RANK
   * Scores and ranks primitives deterministically according to ADR-004.
   */
  public rankStage(primitives: readonly AnyPrimitive[]): readonly RankedPrimitive[] {
    const rankingEngine = new RankingEngine();
    return rankingEngine.rank(primitives);
  }

  /**
   * Executes Stage 7: FIT
   * Deterministically fits ranked primitives into Tier 0, Tier 1, and Overflow.
   */
  public fitStage(rankedPrimitives: readonly RankedPrimitive[], maxBudget = 500): BudgetFitResult {
    const budgetFitter = new BudgetFitter();
    return budgetFitter.fit(rankedPrimitives, maxBudget);
  }

  /**
   * Executes Stage 8: EMIT
   * Deterministically generates target artifacts (AGENTS.md, CLAUDE.md, .cursorrules, manifest.json)
   * from BudgetFitResult.
   */
  public emitStage(
    fitResult: BudgetFitResult,
    compilerVersion = "1.0.0",
    sourceAggregateHash = "",
  ): Record<string, EmitterResult> {
    const agentsEmitter = new AgentsEmitter();
    const claudeEmitter = new ClaudeEmitter();
    const cursorEmitter = new CursorEmitter();
    const manifestEmitter = new ManifestEmitter();

    const agentsResult = agentsEmitter.emit(fitResult);
    const claudeResult = claudeEmitter.emit(fitResult);
    const cursorResult = cursorEmitter.emit(fitResult);
    const partialArtifacts = {
      [agentsResult.target]: agentsResult,
      [claudeResult.target]: claudeResult,
      [cursorResult.target]: cursorResult,
    };

    const manifestResult = manifestEmitter.emit(
      fitResult,
      compilerVersion,
      partialArtifacts as Record<string, EmitterResult>,
      sourceAggregateHash,
    );

    // Add the manifest result to the final emitted artifacts
    partialArtifacts[manifestResult.target as keyof typeof partialArtifacts] = manifestResult;

    return Object.freeze(partialArtifacts);
  }

  /**
   * Runs a single pipeline stage deterministically.
   */
  public runStage(
    stage: PipelineStage,
    primitives: readonly AnyPrimitive[] | readonly RankedPrimitive[] | BudgetFitResult,
    context: PipelineContext,
  ):
    | readonly AnyPrimitive[]
    | readonly RankedPrimitive[]
    | BudgetFitResult
    | Record<string, EmitterResult> {
    switch (stage) {
      case PipelineStage.INGEST:
        return this.ingestStage(primitives as readonly AnyPrimitive[]);
      case PipelineStage.SANITIZE:
        return this.sanitizeStage(primitives as readonly AnyPrimitive[]);
      case PipelineStage.VALIDATE:
        return this.validateStage(primitives as readonly AnyPrimitive[]);
      case PipelineStage.NORMALIZE:
        return this.normalizeStage(primitives as readonly AnyPrimitive[]);
      case PipelineStage.FILTER:
        return this.filterStage(primitives as readonly AnyPrimitive[], context);
      case PipelineStage.RANK:
        return this.rankStage(primitives as readonly AnyPrimitive[]);
      case PipelineStage.FIT:
        return this.fitStage(
          primitives as readonly RankedPrimitive[],
          context.options.max_tier0_budget ?? 500,
        );
      case PipelineStage.EMIT: {
        // Note: runStage signature uses primitives param for all input types.
        // If runStage(EMIT) is invoked directly with a BudgetFitResult, we cannot safely re-compute
        // the source aggregate hash here since the original normalized primitives are lost.
        // We pass an empty string, expecting orchestrator/pipeline to call emitStage directly instead.
        return this.emitStage(
          primitives as BudgetFitResult,
          context.options.compiler_version ?? "1.0.0",
          "",
        );
      }
      default: {
        const _exhaustiveCheck: never = stage;
        throw new SchemaValidationError(
          `Invalid pipeline stage: '${String(_exhaustiveCheck)}'`,
          PAKBErrorCode.SCHEMA_VALIDATION_ERROR,
        );
      }
    }
  }

  /**
   * Runs the pipeline sequentially up to targetStage.
   */
  public runUntil(
    targetStage: PipelineStage,
    primitives: readonly AnyPrimitive[],
    options?: PipelineOptions,
  ): {
    primitives:
      | readonly AnyPrimitive[]
      | readonly RankedPrimitive[]
      | BudgetFitResult
      | Record<string, EmitterResult>;
    lastStage: PipelineStage;
  } {
    const context = createPipelineContext(options);
    let currentData:
      | readonly AnyPrimitive[]
      | readonly RankedPrimitive[]
      | BudgetFitResult
      | Record<string, EmitterResult> = primitives;
    let lastExecutedStage = PipelineStage.INGEST;

    for (const stage of PIPELINE_STAGE_ORDER) {
      if (stage === PipelineStage.RANK) {
        currentData = this.rankStage(currentData as readonly AnyPrimitive[]);
      } else if (stage === PipelineStage.FIT) {
        currentData = this.fitStage(
          currentData as readonly RankedPrimitive[],
          context.options.max_tier0_budget ?? 500,
        );
      } else if (stage === PipelineStage.EMIT) {
        currentData = this.emitStage(
          currentData as BudgetFitResult,
          context.options.compiler_version ?? "1.0.0",
        );
      } else {
        currentData = this.runStage(stage, currentData as readonly AnyPrimitive[], context);
      }
      lastExecutedStage = stage;
      if (stage === targetStage) {
        break;
      }
    }

    return {
      primitives: currentData,
      lastStage: lastExecutedStage,
    };
  }

  /**
   * Computes the canonical source aggregate hash from raw primitives.
   * Runs the pipeline sequentially up to the NORMALIZE stage to ensure correctness.
   */
  public computeSourceHash(primitives: readonly AnyPrimitive[], options?: PipelineOptions): string {
    const { primitives: normalized } = this.runUntil(PipelineStage.NORMALIZE, primitives, options);
    return computeHashFromNormalized(normalized as readonly AnyPrimitive[]);
  }

  /**
   * Runs the complete pipeline including INGEST ➔ SANITIZE ➔ VALIDATE ➔ NORMALIZE ➔ FILTER ➔ RANK ➔ FIT ➔ EMIT.
   */
  public run(primitives: readonly AnyPrimitive[], options?: PipelineOptions): PipelineResult {
    const startTime = performance.now();
    const context = createPipelineContext(options);

    const stageResults: Record<PipelineStage, number> = {
      INGEST: 0,
      SANITIZE: 0,
      VALIDATE: 0,
      NORMALIZE: 0,
      FILTER: 0,
      RANK: 0,
      FIT: 0,
      EMIT: 0,
    };

    let current = primitives;

    // Stage 1: INGEST
    current = this.runStage(PipelineStage.INGEST, current, context) as readonly AnyPrimitive[];
    stageResults.INGEST = current.length;

    // Stage 2: SANITIZE
    current = this.runStage(PipelineStage.SANITIZE, current, context) as readonly AnyPrimitive[];
    stageResults.SANITIZE = current.length;

    // Stage 3: VALIDATE
    current = this.runStage(PipelineStage.VALIDATE, current, context) as readonly AnyPrimitive[];
    stageResults.VALIDATE = current.length;

    // Stage 4: NORMALIZE
    current = this.runStage(PipelineStage.NORMALIZE, current, context) as readonly AnyPrimitive[];
    stageResults.NORMALIZE = current.length;

    // Compute canonical source aggregate hash from normalized primitives
    const sourceAggregateHash = computeHashFromNormalized(current);

    // Stage 5: FILTER
    current = this.runStage(PipelineStage.FILTER, current, context) as readonly AnyPrimitive[];
    stageResults.FILTER = current.length;

    // Stage 6: RANK
    const rankedPrimitives = this.rankStage(current);
    stageResults.RANK = rankedPrimitives.length;

    // Stage 7: FIT
    const fitResult = this.fitStage(rankedPrimitives, context.options.max_tier0_budget ?? 500);
    stageResults.FIT = fitResult.tier0.length;

    // Stage 8: EMIT
    const emittedArtifacts = this.emitStage(
      fitResult,
      context.options.compiler_version ?? "1.0.0",
      sourceAggregateHash,
    );
    stageResults.EMIT = Object.keys(emittedArtifacts).length;

    const endTime = performance.now();
    const durationMs = Math.round((endTime - startTime) * 100) / 100;

    return {
      original_count: primitives.length,
      sanitized_count: stageResults.SANITIZE,
      validated_count: stageResults.VALIDATE,
      normalized_count: stageResults.NORMALIZE,
      filtered_count: stageResults.FILTER,
      ranked_count: stageResults.RANK,
      fitted_count: stageResults.FIT,
      emitted_count: stageResults.EMIT,
      duration_ms: durationMs,
      stage_results: stageResults,
      primitives: current,
      ranked_primitives: rankedPrimitives,
      fit_result: fitResult,
      emitted_artifacts: emittedArtifacts,
    };
  }

  public compile(input: unknown): CompilationResult {
    if (
      typeof input !== "object" ||
      input === null ||
      !("primitives" in input) ||
      !Array.isArray((input as { primitives?: unknown }).primitives)
    ) {
      return {
        artifacts: {},
        emitted_artifacts: {},
        manifest: input,
        warnings: ["Invalid compile input: expected primitives array."],
      };
    }

    const { primitives, budget, compiler_version } = input as {
      primitives: readonly AnyPrimitive[];
      budget?: number;
      strict_mode?: boolean;
      compiler_version?: string;
    };

    const pipelineOptions: PipelineOptions = {
      compiler_version: compiler_version ?? "1.0.0",
      ...(typeof budget === "number" ? { max_tier0_budget: budget } : {}),
    };

    const pipelineResult = this.run(primitives, pipelineOptions);

    return {
      artifacts: pipelineResult.emitted_artifacts,
      emitted_artifacts: pipelineResult.emitted_artifacts,
      manifest: {
        original_count: pipelineResult.original_count,
        filtered_count: pipelineResult.filtered_count,
        ranked_count: pipelineResult.ranked_count,
        fitted_count: pipelineResult.fitted_count,
        emitted_count: pipelineResult.emitted_count,
      },
      warnings: [],
    };
  }
}
