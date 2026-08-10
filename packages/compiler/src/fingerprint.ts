import { createHash } from "node:crypto";

function canonicalStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalStringify).join(",")}]`;
  }
  const keys = Object.keys(obj).sort();
  const keyValues = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalStringify((obj as Record<string, unknown>)[k])}`,
  );
  return `{${keyValues.join(",")}}`;
}

export function computeInputFingerprint(input: unknown) {
  return {
    aggregate_hash: createHash("sha256").update(canonicalStringify(input)).digest("hex"),
  };
}
