import path from "node:path";

/**
 * Normalizes file path to use single forward slashes (/) for cross-platform consistency.
 */
export function normalizePath(p: string): string {
  if (typeof p !== "string") {
    return "";
  }
  return p.replace(/\\/g, "/").replace(/\/+/g, "/");
}

/**
 * Joins path segments and returns normalized path with forward slashes.
 */
export function joinPaths(...segments: string[]): string {
  return normalizePath(path.join(...segments));
}
