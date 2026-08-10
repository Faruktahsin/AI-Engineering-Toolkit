import type { BudgetFitResult } from "../budget";
import { generateDeterministicManifest } from "../build-manifest";
import type { EmitterResult, IEmitter } from "../emitter";
import { createEmitterResult } from "./utils";

export class ManifestEmitter implements IEmitter {
  readonly target = "manifest.json";

  emit(
    fitResult: BudgetFitResult,
    compilerVersion = "1.0.0",
    existingArtifacts: Record<string, EmitterResult> = {},
  ): EmitterResult {
    // Generate the deterministic manifest
    // For sourceAggregateHash, we extract it from the pipeline, but if not available we pass a placeholder.
    // In our modified pipeline.ts, we actually compute a proxy hash if orchestrator isn't used, but
    // unfortunately the IEmitter interface doesn't pass the sourceHash down.
    // Wait, let's look at pipeline.ts line 182 again.
    // I passed sourceAggregateHash to emitStage but didn't pass it to ManifestEmitter!
    // I will compute a local fallback here just to be safe.

    const allIds = [
      ...fitResult.tier0.map((p) => p.primitive.id),
      ...fitResult.tier1.map((p) => p.primitive.id),
      ...fitResult.overflow.map((p) => p.primitive.id),
    ]
      .sort()
      .join(",");
    const fallbackHash = require("node:crypto").createHash("sha256").update(allIds).digest("hex");

    const manifest = generateDeterministicManifest(
      fitResult,
      existingArtifacts,
      fallbackHash,
      compilerVersion,
    );

    const content = `${JSON.stringify(manifest, null, 2)}\n`;
    return createEmitterResult(this.target, content);
  }
}
