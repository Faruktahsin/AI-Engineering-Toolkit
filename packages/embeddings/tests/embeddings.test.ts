import { describe, expect, it } from "vitest";
import {
  MockEmbeddingProvider,
  cosineSimilarity,
  deserializeVector,
  serializeVector,
} from "../src";

describe("@aiet/embeddings", () => {
  describe("MockEmbeddingProvider", () => {
    it("should generate deterministic float vector of specified dimension", async () => {
      const provider = new MockEmbeddingProvider(128);
      const vec1 = await provider.embed("CloudScale AI Platform");
      const vec2 = await provider.embed("CloudScale AI Platform");

      expect(vec1.length).toBe(128);
      expect(vec1).toEqual(vec2);
    });

    it("should generate batch embeddings", async () => {
      const provider = new MockEmbeddingProvider(64);
      const batch = await provider.embedBatch(["Text 1", "Text 2"]);

      expect(batch.length).toBe(2);
      expect(batch[0]?.length).toBe(64);
    });
  });

  describe("Vector Math & Serialization Utilities", () => {
    it("should calculate cosine similarity correctly", () => {
      const a = new Float32Array([1, 0, 0]);
      const b = new Float32Array([1, 0, 0]);
      const c = new Float32Array([0, 1, 0]);

      expect(cosineSimilarity(a, b)).toBeCloseTo(1.0);
      expect(cosineSimilarity(a, c)).toBeCloseTo(0.0);
    });

    it("should throw error when vector dimensions mismatch", () => {
      const a = new Float32Array([1, 0]);
      const b = new Float32Array([1, 0, 0]);

      expect(() => cosineSimilarity(a, b)).toThrow("dimension mismatch");
    });

    it("should serialize and deserialize float vector to Buffer lossless", () => {
      const original = new Float32Array([0.25, -0.5, 0.75, 1.0]);
      const serialized = serializeVector(original);
      const deserialized = deserializeVector(serialized);

      expect(deserialized.length).toBe(original.length);
      expect(Array.from(deserialized)).toEqual(Array.from(original));
    });
  });
});
