import { createHash } from "node:crypto";

export function computeInputFingerprint(input: unknown) {
  return {
    aggregate_hash: createHash("sha256").update(JSON.stringify(input)).digest("hex"),
  };
}
