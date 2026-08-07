import { InvalidIDFormatError, PAKBErrorCode } from "@aiet/schema";
import { ulid } from "ulid";

export type PrimitiveType = "entity" | "directive" | "assertion" | "event" | "relation";

export const PREFIX_MAP: Record<PrimitiveType, string> = {
  entity: "ent_",
  directive: "dir_",
  assertion: "ast_",
  event: "evt_",
  relation: "rel_",
} as const;

export const ULID_REGEX = /^(ent|dir|ast|evt|rel)_[0-9A-HJKMNP-TV-Z]{26}$/;

/**
 * Returns the canonical 4-character prefix (e.g. "ent_") for a primitive type.
 */
export function getPrimitivePrefix(primitiveType: PrimitiveType): string {
  const prefix = PREFIX_MAP[primitiveType];
  if (!prefix) {
    throw new InvalidIDFormatError(
      `Unknown primitive type: '${String(primitiveType)}'`,
      PAKBErrorCode.INVALID_ID_FORMAT_ERROR,
    );
  }
  return prefix;
}

/**
 * Generates a canonical Prefixed Base32 ULID (e.g., "ent_01J4X89K9Z1A2B3C4D5E6F7G8H") per ADR-001.
 */
export function generateULID(primitiveType: PrimitiveType): string {
  const prefix = getPrimitivePrefix(primitiveType);
  const rawUlid = ulid().toUpperCase();
  const id = `${prefix}${rawUlid}`;

  if (!ULID_REGEX.test(id)) {
    throw new InvalidIDFormatError(
      `Generated ULID failed format validation: '${id}'`,
      PAKBErrorCode.INVALID_ID_FORMAT_ERROR,
      id,
    );
  }

  return id;
}

/**
 * Validates an ID string against ADR-001 rules.
 * Normalizes lowercase Crockford Base32 characters to uppercase before checking.
 */
export function validateULID(id: string): boolean {
  if (typeof id !== "string" || id.length !== 30) {
    return false;
  }

  const parts = id.split("_");
  if (parts.length !== 2) {
    return false;
  }

  const [prefix, body] = parts;
  if (!prefix || !body || body.length !== 26) {
    return false;
  }

  const normalizedId = `${prefix}_${body.toUpperCase()}`;
  return ULID_REGEX.test(normalizedId);
}
