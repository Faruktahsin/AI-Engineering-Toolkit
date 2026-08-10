import type { BudgetFitResult } from "../budget";
import type { EmitterResult, IEmitter } from "../emitter";
import {
  createEmitterResult,
  formatPrimitiveForMarkdown,
  groupPrimitives,
  sortPrimitives,
} from "./utils";

export class AgentsEmitter implements IEmitter {
  readonly target = "AGENTS.md";

  emit(fitResult: BudgetFitResult): EmitterResult {
    let content = "# Agents Artifact\n\nGenerated deterministic AIET agents artifact.\n\n";

    content += "## Core Directives & Context (Tier 0)\n\n";
    if (fitResult.tier0.length === 0) {
      content += "No Tier 0 primitives.\n";
    } else {
      const sorted = sortPrimitives(fitResult.tier0);
      const groups = groupPrimitives(sorted);
      for (const [type, primitives] of Object.entries(groups)) {
        content += `### ${type}\n`;
        for (const p of primitives) {
          content += `${formatPrimitiveForMarkdown(p)}\n`;
        }
        content += "\n";
      }
    }

    content += "## Supplemental Context (Tier 1)\n\n";
    if (fitResult.tier1.length === 0) {
      content += "No Tier 1 primitives.\n";
    } else {
      const sorted = sortPrimitives(fitResult.tier1);
      const groups = groupPrimitives(sorted);
      for (const [type, primitives] of Object.entries(groups)) {
        content += `### ${type}\n`;
        for (const p of primitives) {
          content += `${formatPrimitiveForMarkdown(p)}\n`;
        }
        content += "\n";
      }
    }

    // Add Primitive Selection Budget footer
    content += `<!-- Primitive Selection Budget: Tier 0: ${fitResult.tier0_tokens}/${fitResult.budget} | Tier 1: ${fitResult.tier1_tokens} -->\n`;

    return createEmitterResult(this.target, content);
  }
}
