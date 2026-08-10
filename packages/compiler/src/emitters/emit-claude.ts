import type { BudgetFitResult } from "../budget";
import type { EmitterResult, IEmitter } from "../emitter";
import { createEmitterResult, formatPrimitiveForMarkdown, sortPrimitives } from "./utils";

export class ClaudeEmitter implements IEmitter {
  readonly target = "CLAUDE.md";

  emit(fitResult: BudgetFitResult): EmitterResult {
    let content = "# Claude Configuration\n\n";

    if (fitResult.tier0.length === 0) {
      content += "No active directives or context.\n";
    } else {
      content += "## System Instructions\n\n";
      const sorted = sortPrimitives(fitResult.tier0);
      for (const p of sorted) {
        content += `${formatPrimitiveForMarkdown(p, false)}\n`;
      }
    }

    // Add Primitive Selection Budget footer
    content += `\n---\n<!-- Primitive Selection Budget: ${fitResult.tier0_tokens}/${fitResult.budget} -->\n`;

    return createEmitterResult(this.target, content);
  }
}
