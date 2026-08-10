import type { AnyPrimitive } from "@aiet/schema";
import { type DeterministicBuildManifest, generateDeterministicManifest } from "./build-manifest";

import { CompilerPipeline, type PipelineOptions } from "./pipeline";
import { verifyArtifactsOrThrow } from "./verifier";

export interface BuildOrchestrationResult {
  readonly status: "COMPLETED" | "UP_TO_DATE";
  readonly manifest: DeterministicBuildManifest;
  readonly is_incremental: boolean;
}

export class BuildOrchestrator {
  private readonly pipeline: CompilerPipeline;

  constructor() {
    this.pipeline = new CompilerPipeline();
  }

  /**
   * Executes deterministic build orchestration.
   * Performs input fingerprinting for incremental build detection.
   * If input fingerprint matches priorManifest.source_aggregate_hash, returns UP_TO_DATE without invoking emitters.
   */
  public build(
    primitives: readonly AnyPrimitive[],
    options?: PipelineOptions,
    priorManifest?: DeterministicBuildManifest | null,
  ): BuildOrchestrationResult {
    // 1. Compute Input Fingerprint (Canonical normalized hash)
    const sourceAggregateHash = this.pipeline.computeSourceHash(primitives, options);

    // 2. Incremental Build Detection
    if (priorManifest && priorManifest.source_aggregate_hash === sourceAggregateHash) {
      const currentTier0Budget = options?.max_tier0_budget ?? 500;
      const priorTier0Budget = priorManifest.selection_budget;
      const currentCompilerVersion = options?.compiler_version ?? "1.0.0";
      const priorCompilerVersion = priorManifest.compiler_version;

      if (
        priorTier0Budget === currentTier0Budget &&
        priorCompilerVersion === currentCompilerVersion
      ) {
        return {
          status: "UP_TO_DATE",
          manifest: priorManifest,
          is_incremental: true,
        };
      }
    }

    // 3. Execute Compiler Pipeline
    const pipelineResult = this.pipeline.run(primitives, options);

    // 4. Generate Deterministic Manifest
    const manifest = generateDeterministicManifest(
      pipelineResult.fit_result,
      pipelineResult.emitted_artifacts,
      sourceAggregateHash,
      options?.compiler_version ?? "1.0.0",
    );

    // 5. Verify Artifact Integrity
    verifyArtifactsOrThrow(pipelineResult.emitted_artifacts, manifest);

    return {
      status: "COMPLETED",
      manifest,
      is_incremental: false,
    };
  }
}
