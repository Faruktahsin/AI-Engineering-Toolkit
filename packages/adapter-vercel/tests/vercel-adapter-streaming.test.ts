import { PAKBStorageRepository } from "@aiet/storage";
import { describe, expect, it } from "vitest";
import { createAIETMemoryProvider, formatStreamingMemoryEvents } from "../src/memory-provider";

describe("Vercel AI SDK Adapter Streaming & Attribution Suite", () => {
  it("should format streaming memory events as SSE data blocks", () => {
    const matches = [{ id: "dir_123", snippet: "Always use Biome", score: 0.95 }];
    const streamStr = formatStreamingMemoryEvents(matches);

    expect(streamStr).toContain("data: {");
    expect(streamStr).toContain("memory_matched");
    expect(streamStr).toContain("attribution");
  });

  it("should stream events via memory provider", async () => {
    const repo = new PAKBStorageRepository({ db_path: ":memory:" });
    const provider = createAIETMemoryProvider(repo);

    const streamData = await provider.streamEvents("test query");
    expect(typeof streamData).toBe("string");

    await repo.close();
  });
});
