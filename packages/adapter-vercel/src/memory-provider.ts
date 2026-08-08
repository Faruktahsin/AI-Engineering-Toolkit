import type { PAKBStorageRepository } from "@aiet/storage";

export interface AIETMemoryQueryOptions {
  readonly limit?: number | undefined;
  readonly headerTitle?: string | undefined;
  readonly includeAttribution?: boolean | undefined;
}

export async function getRelevantMemoryContext(
  storage: PAKBStorageRepository,
  query: string,
  options: AIETMemoryQueryOptions = {},
): Promise<string> {
  const limit = options.limit ?? 5;
  const headerTitle = options.headerTitle ?? "Retrieved Agent Memory";

  const searchResult = await storage.searchFTS5(query, { limit });

  if (searchResult.results.length === 0) {
    return "";
  }

  const memoryLines = searchResult.results.map((res, idx) => {
    const cleanSnippet = res.snippet.replace(/<\/?b>/g, "");
    const attribution = options.includeAttribution
      ? ` [Score: ${res.score.toFixed(2)} | Source: ${res.primitive_type}]`
      : "";
    return `${idx + 1}. [${res.primitive_type.toUpperCase()}] ${cleanSnippet}${attribution}`;
  });

  return `# ${headerTitle}\n${memoryLines.join("\n")}`;
}

export function formatStreamingMemoryEvents(
  matches: Array<{ id: string; snippet: string; score: number }>,
): string {
  return matches
    .map((m) =>
      JSON.stringify({
        event: "memory_matched",
        id: m.id,
        snippet: m.snippet,
        score: m.score,
        timestamp: new Date().toISOString(),
        attribution: {
          confidence_score: 0.9,
          sensitivity: "public",
          selection_rationale: "Vercel AI SDK streaming memory match",
        },
      }),
    )
    .map((json) => `data: ${json}\n\n`)
    .join("");
}

export interface AIETMemoryProvider {
  getMemoryContext(query: string, options?: AIETMemoryQueryOptions | undefined): Promise<string>;
  getPrimitive(id: string): ReturnType<PAKBStorageRepository["getPrimitive"]>;
  search(
    query: string,
    limit?: number | undefined,
  ): ReturnType<PAKBStorageRepository["searchFTS5"]>;
  streamEvents(query: string, limit?: number): Promise<string>;
}

export function createAIETMemoryProvider(storage: PAKBStorageRepository): AIETMemoryProvider {
  return {
    async getMemoryContext(query: string, options: AIETMemoryQueryOptions = {}): Promise<string> {
      return getRelevantMemoryContext(storage, query, options);
    },
    async getPrimitive(id: string) {
      return storage.getPrimitive(id);
    },
    async search(query: string, limit = 5) {
      return storage.searchFTS5(query, { limit });
    },
    async streamEvents(query: string, limit = 5) {
      const searchRes = await storage.searchFTS5(query, { limit });
      return formatStreamingMemoryEvents(searchRes.results);
    },
  };
}
