import { createHash } from "node:crypto";
import canonicalize from "canonicalize";

/**
 * Computes deterministic RFC 8785 JSON Canonicalization Scheme (JCS) SHA-256 hash.
 * ADR-001 §3.2 / Errata-001.
 */
export function calculateJCSHash(value: unknown): string {
  const canonicalJson = canonicalize(value);
  if (typeof canonicalJson !== "string") {
    throw new Error("Failed to compute RFC 8785 canonical JSON string.");
  }
  return createHash("sha256").update(canonicalJson, "utf8").digest("hex");
}
