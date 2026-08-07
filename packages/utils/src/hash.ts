import { createHash } from "node:crypto";
import canonicalize from "canonicalize";

/**
 * Computes SHA-256 hex hash of string or Buffer.
 */
export function sha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Computes MD5 hex hash of string or Buffer.
 */
export function md5(content: string | Buffer): string {
  return createHash("md5").update(content).digest("hex");
}

/**
 * Computes RFC 8785 JSON Canonicalization Scheme (JCS) SHA-256 hash for any object.
 */
export function hashCanonicalJson(obj: unknown): string {
  const canonicalString = canonicalize(obj);
  if (typeof canonicalString !== "string") {
    throw new Error("Failed to canonicalize object for hashing.");
  }
  return sha256(canonicalString);
}
