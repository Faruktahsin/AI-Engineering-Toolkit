import { describe, expect, it, vi } from "vitest";
import { OllamaEmbeddingProvider } from "../src/index";

describe("@aiet/embeddings-ollama", () => {
  it("should initialize with default parameters", () => {
    const provider = new OllamaEmbeddingProvider();
    expect(provider.name).toBe("ollama-nomic-embed-text");
    expect(provider.dimensions).toBe(768);
  });

  it("should execute embedding API request to local Ollama daemon", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        embedding: [0.1, -0.2, 0.3, 0.4],
      }),
    });

    const provider = new OllamaEmbeddingProvider({
      model: "nomic-embed-text",
      dimensions: 4,
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const result = await provider.embed("Test prompt for Ollama");

    expect(result.length).toBe(4);
    const vec = Array.from(result);
    expect(vec[0]).toBeCloseTo(0.1);
    expect(vec[1]).toBeCloseTo(-0.2);
    expect(vec[2]).toBeCloseTo(0.3);
    expect(vec[3]).toBeCloseTo(0.4);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:11434/api/embeddings",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
