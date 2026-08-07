import { createHash } from "node:crypto";
import type { AnyPrimitive } from "@aiet/schema";
import canonicalize from "canonicalize";

/**
 * Computes deterministic RFC 8785 JSON Canonicalization Scheme (JCS) SHA-256 hash.
 * ADR-001 §3.2 / Errata-001.
 */
export function calculateJCSHash(primitive: AnyPrimitive): string {
  const canonicalJson = canonicalize(primitive);
  if (typeof canonicalJson !== "string") {
    throw new Error("Failed to compute RFC 8785 canonical JSON string.");
  }
  return createHash("sha256").update(canonicalJson, "utf8").digest("hex");
}
