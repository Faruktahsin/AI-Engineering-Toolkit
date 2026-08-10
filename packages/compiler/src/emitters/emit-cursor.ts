import type { BudgetFitResult } from "../budget";
import type { EmitterResult, IEmitter } from "../emitter";
import { createEmitterResult, formatPrimitiveForMarkdown, sortPrimitives } from "./utils";

export class CursorEmitter implements IEmitter {
  readonly target = ".cursorrules";

  emit(fitResult: BudgetFitResult): EmitterResult {
    let content = "# Cursor Rules\n\n";

    if (fitResult.tier0.length === 0) {
      content += "No active rules.\n";
    } else {
      content += "## System Instructions\n\n";
      const sorted = sortPrimitives(fitResult.tier0);
      for (const p of sorted) {
        content += `${formatPrimitiveForMarkdown(p, true)}\n`;
      }
    }

    // Add Token Budget footer
    content += `\n---\n<!-- AIET Budget: ${fitResult.tier0_tokens}/${fitResult.budget} -->\n`;

    return createEmitterResult(this.target, content);
  }
}
