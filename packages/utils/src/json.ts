import canonicalize from "canonicalize";

/**
 * Returns RFC 8785 canonical JSON string for any object.
 */
export function canonicalizeJson(obj: unknown): string {
  const result = canonicalize(obj);
  if (typeof result !== "string") {
    throw new Error("Failed to compute canonical JSON string.");
  }
  return result;
}
