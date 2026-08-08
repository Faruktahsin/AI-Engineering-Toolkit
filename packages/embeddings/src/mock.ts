import type { AIETEmbeddingProvider } from "./types";

export class MockEmbeddingProvider implements AIETEmbeddingProvider {
  public readonly name = "mock-deterministic-embeddings";
  public readonly dimensions: number;

  constructor(dimensions = 128) {
    this.dimensions = dimensions;
  }

  public async embed(text: string): Promise<Float32Array> {
    const vec = new Float32Array(this.dimensions);
    let hash = 0;

    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }

    let norm = 0;
    for (let i = 0; i < this.dimensions; i++) {
      const val = Math.sin(hash + i);
      vec[i] = val;
      norm += val * val;
    }

    const sqrtNorm = Math.sqrt(norm);
    if (sqrtNorm > 0) {
      for (let i = 0; i < this.dimensions; i++) {
        const val = vec[i] ?? 0;
        vec[i] = val / sqrtNorm;
      }
    }

    return vec;
  }

  public async embedBatch(texts: readonly string[]): Promise<Float32Array[]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }
}
