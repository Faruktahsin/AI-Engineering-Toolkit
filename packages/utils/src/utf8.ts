/**
 * Converts a UTF-8 string to a Uint8Array of bytes.
 */
export function toUtf8Bytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Converts a Uint8Array of UTF-8 bytes back to string.
 */
export function fromUtf8Bytes(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Checks if a string contains zero-width or formatting Unicode Cf characters.
 */
export function hasZeroWidth(text: string): boolean {
  if (typeof text !== "string" || text.length === 0) {
    return false;
  }
  return /\p{Cf}/u.test(text);
}

/**
 * Strips zero-width and formatting Unicode Cf characters from a string.
 */
export function stripZeroWidth(text: string): string {
  if (typeof text !== "string" || text.length === 0) {
    return text ?? "";
  }
  return text.replace(/\p{Cf}/gu, "");
}
