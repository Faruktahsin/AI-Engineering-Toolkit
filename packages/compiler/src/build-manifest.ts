import { createHash } from "node:crypto";
import type { BudgetFitResult } from "./budget";
import type { EmitterResult } from "./emitter";

export interface ArtifactBuildMeta {
  readonly filename: string;
  readonly sha256: string;
  readonly byte_size: number;
  readonly line_count: number;
}

export interface DeterministicBuildManifest {
  readonly compiler_version: string;
  readonly schema_version: string;
  readonly build_target_list: readonly string[];
  readonly emitted_artifacts: readonly ArtifactBuildMeta[];
  readonly tier0_primitive_ids: readonly string[];
  readonly tier1_primitive_ids: readonly string[];
  readonly overflow_primitive_ids: readonly string[];
  readonly selection_tokens_tier0: number;
  readonly selection_budget: number;
  readonly _design_note: string;
  readonly source_aggregate_hash: string;
  readonly manifest_hash: string;
}

/**
 * Generates a deterministic build manifest containing zero non-deterministic metadata (no timestamps, hostnames, or usernames).
 */
export function generateDeterministicManifest(
  fitResult: BudgetFitResult,
  artifacts: Record<string, EmitterResult>,
  sourceAggregateHash: string,
  compilerVersion = "1.0.0",
  schemaVersion = "1.0.0",
): DeterministicBuildManifest {
  const sortedTargets = Object.keys(artifacts).sort();

  const artifactMetas: ArtifactBuildMeta[] = [];
  for (const targetName of sortedTargets) {
    const art = artifacts[targetName];
    if (!art) continue;
    artifactMetas.push({
      filename: art.target,
      sha256: art.sha256,
      byte_size: art.bytes,
      line_count: art.line_count,
    });
  }

  const tier0Ids = Object.freeze(fitResult.tier0.map((r) => r.primitive.id).sort());
  const tier1Ids = Object.freeze(fitResult.tier1.map((r) => r.primitive.id).sort());
  const overflowIds = Object.freeze(fitResult.overflow.map((r) => r.primitive.id).sort());

  const partialManifest = {
    compiler_version: compilerVersion,
    schema_version: schemaVersion,
    build_target_list: sortedTargets,
    emitted_artifacts: artifactMetas,
    tier0_primitive_ids: tier0Ids,
    tier1_primitive_ids: tier1Ids,
    overflow_primitive_ids: overflowIds,
    selection_tokens_tier0: fitResult.tier0_tokens,
    selection_budget: fitResult.budget,
    _design_note:
      "Token counts represent primitive selection budget, not strict serialized artifact sizes.",
    source_aggregate_hash: sourceAggregateHash,
  };

  const canonicalString = `${JSON.stringify(partialManifest, null, 2)}\n`;
  const manifestHash = createHash("sha256").update(canonicalString, "utf8").digest("hex");

  return {
    ...partialManifest,
    manifest_hash: manifestHash,
  };
}
