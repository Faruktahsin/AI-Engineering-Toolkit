export interface AIETEmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;
  embed(text: string): Promise<Float32Array>;
  embedBatch(texts: readonly string[]): Promise<Float32Array[]>;
}

export type EmbeddingProvider = AIETEmbeddingProvider;
