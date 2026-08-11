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
    sourceAggregateHash = "",
  ): EmitterResult {
    const manifest = generateDeterministicManifest(
      fitResult,
      existingArtifacts,
      sourceAggregateHash,
      compilerVersion,
    );

    const content = `${JSON.stringify(manifest, null, 2)}\n`;
    return createEmitterResult(this.target, content);
  }
}
