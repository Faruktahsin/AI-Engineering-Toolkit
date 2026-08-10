import crypto from "node:crypto";
import type { EmitterResult } from "../emitter";
import { type RankedPrimitive, RankingEngine } from "../ranking";

export function createEmitterResult(target: string, content: string): EmitterResult {
  const hash = crypto.createHash("sha256").update(content, "utf8").digest("hex");
  return {
    target,
    content,
    bytes: Buffer.byteLength(content, "utf8"),
    sha256: hash,
    line_count: content.split("\n").length,
  };
}

export function escapeMarkdown(text: string): string {
  // Prevent unclosed codeblocks and basic markdown injection
  return text.replace(/`/g, "\\`").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatPrimitiveForMarkdown(p: RankedPrimitive, shouldEscape = false): string {
  const type = p.primitive.id.split("_")[0]?.toUpperCase() ?? "PRIM";

  let body = "";
  if ("statement" in p.primitive) {
    body = String(p.primitive.statement);
  } else if ("claim" in p.primitive) {
    body = String(p.primitive.claim);
  } else if ("name" in p.primitive && "description" in p.primitive) {
    body = `${p.primitive.name}: ${p.primitive.description}`;
  } else if ("summary" in p.primitive) {
    body = String(p.primitive.summary);
  } else {
    body = JSON.stringify(p.primitive);
  }

  if (shouldEscape) {
    body = escapeMarkdown(body);
  }

  return `- **[${type}]** (${p.primitive.id}): ${body}`;
}

export function groupPrimitives(
  primitives: readonly RankedPrimitive[],
): Record<string, RankedPrimitive[]> {
  const groups: Record<string, RankedPrimitive[]> = {};
  for (const p of primitives) {
    const type = p.primitive.id.split("_")[0]?.toUpperCase() ?? "PRIM";
    if (!groups[type]) groups[type] = [];
    groups[type].push(p);
  }
  return groups;
}

export function sortPrimitives(primitives: readonly RankedPrimitive[]): RankedPrimitive[] {
  const rankingEngine = new RankingEngine();
  return rankingEngine.stableSort(primitives);
}
