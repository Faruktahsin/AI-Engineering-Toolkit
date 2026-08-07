/**
 * Splits an array into sub-arrays of maximum chunkSize elements.
 */
export function chunkArray<T>(items: readonly T[], chunkSize: number): T[][] {
  if (!Array.isArray(items) || chunkSize <= 0) {
    return [];
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Returns a new array containing unique elements based on an optional keySelector function.
 */
export function uniqueArray<T, K = T>(items: readonly T[], keySelector?: (item: T) => K): T[] {
  if (!Array.isArray(items)) {
    return [];
  }
  const seen = new Set<unknown>();
  const result: T[] = [];

  for (const item of items) {
    const key = keySelector ? keySelector(item) : item;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

/**
 * Groups array items into a Map keyed by the return value of keySelector.
 */
export function groupBy<T, K extends string | number | symbol>(
  items: readonly T[],
  keySelector: (item: T) => K,
): Record<K, T[]> {
  const result = {} as Record<K, T[]>;
  if (!Array.isArray(items)) {
    return result;
  }

  for (const item of items) {
    const key = keySelector(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key]?.push(item);
  }

  return result;
}
