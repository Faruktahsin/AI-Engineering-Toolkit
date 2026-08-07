import type { AnyPrimitive } from "@aiet/schema";
import type { BudgetFitResult } from "./budget";
import type { EmitterResult } from "./emitter";
import type { RankedPrimitive } from "./ranking";
import type { PipelineStage } from "./stages";

export interface PipelineOptions {
  readonly cutoff_timestamp?: string | null;
  readonly include_archived?: boolean;
  readonly include_superseded?: boolean;
  readonly max_tier0_budget?: number;
  readonly compiler_version?: string;
}

export interface PipelineContext {
  readonly options: PipelineOptions;
  readonly stage_counts: Record<PipelineStage, number>;
}

export interface StageResult {
  readonly stage: PipelineStage;
  readonly input_count: number;
  readonly output_count: number;
  readonly primitives: readonly AnyPrimitive[];
}

export interface PipelineResult {
  readonly original_count: number;
  readonly sanitized_count: number;
  readonly validated_count: number;
  readonly normalized_count: number;
  readonly filtered_count: number;
  readonly ranked_count: number;
  readonly fitted_count: number;
  readonly emitted_count: number;
  readonly duration_ms: number;
  readonly stage_results: Record<PipelineStage, number>;
  readonly primitives: readonly AnyPrimitive[];
  readonly ranked_primitives: readonly RankedPrimitive[];
  readonly fit_result: BudgetFitResult;
  readonly emitted_artifacts: Record<string, EmitterResult>;
}

/**
 * Creates an immutable initial PipelineContext object.
 */
export function createPipelineContext(options?: PipelineOptions): PipelineContext {
  return {
    options: {
      cutoff_timestamp: options?.cutoff_timestamp ?? null,
      include_archived: options?.include_archived ?? false,
      include_superseded: options?.include_superseded ?? false,
      max_tier0_budget: options?.max_tier0_budget ?? 500,
      compiler_version: options?.compiler_version ?? "1.0.0",
    },
    stage_counts: {
      INGEST: 0,
      SANITIZE: 0,
      VALIDATE: 0,
      NORMALIZE: 0,
      FILTER: 0,
      RANK: 0,
      FIT: 0,
      EMIT: 0,
    },
  };
}
