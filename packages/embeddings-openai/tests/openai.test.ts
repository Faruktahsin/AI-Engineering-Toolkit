import { describe, expect, it, vi } from "vitest";
import { OpenAIEmbeddingProvider } from "../src/index";

describe("@aiet/embeddings-openai", () => {
  it("should initialize with default parameters", () => {
    const provider = new OpenAIEmbeddingProvider({ apiKey: "test-key" });
    expect(provider.name).toBe("openai-text-embedding-3-small");
    expect(provider.dimensions).toBe(1536);
  });

  it("should execute embedding batch API request using fetchFn mock", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { index: 0, embedding: [0.1, 0.2, 0.3] },
          { index: 1, embedding: [0.4, 0.5, 0.6] },
        ],
      }),
    });

    const provider = new OpenAIEmbeddingProvider({
      apiKey: "sk-mock-key",
      dimensions: 3,
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const results = await provider.embedBatch(["Hello", "World"]);

    expect(results).toHaveLength(2);
    const vec0 = Array.from(results[0] ?? []);
    const vec1 = Array.from(results[1] ?? []);

    expect(vec0[0]).toBeCloseTo(0.1);
    expect(vec0[1]).toBeCloseTo(0.2);
    expect(vec0[2]).toBeCloseTo(0.3);

    expect(vec1[0]).toBeCloseTo(0.4);
    expect(vec1[1]).toBeCloseTo(0.5);
    expect(vec1[2]).toBeCloseTo(0.6);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/embeddings",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it.each(["https://example.test/v1", "https://example.test/v1/", "https://example.test/v1////"])(
    "should normalize trailing slashes in custom base URL %s",
    async (baseUrl) => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ index: 0, embedding: [0.1] }] }),
      });
      const provider = new OpenAIEmbeddingProvider({
        apiKey: "test-key",
        baseUrl,
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      await provider.embed("hello");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.test/v1/embeddings",
        expect.anything(),
      );
    },
  );
});
