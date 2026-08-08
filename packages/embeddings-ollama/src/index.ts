import type { AIETEmbeddingProvider } from "@aiet/embeddings";

export interface OllamaEmbeddingOptions {
  readonly model?: string | undefined;
  readonly dimensions?: number | undefined;
  readonly baseUrl?: string | undefined;
  readonly fetchFn?: typeof fetch | undefined;
}

export class OllamaEmbeddingProvider implements AIETEmbeddingProvider {
  public readonly name: string;
  public readonly dimensions: number;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: OllamaEmbeddingOptions = {}) {
    this.model = options.model ?? "nomic-embed-text";
    this.dimensions = options.dimensions ?? 768;
    this.baseUrl = (options.baseUrl ?? "http://localhost:11434").replace(/\/+$/, "");
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
    this.name = `ollama-${this.model}`;
  }

  public async embed(text: string): Promise<Float32Array> {
    const response = await this.fetchFn(`${this.baseUrl}/api/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        prompt: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama Local Embedding API HTTP ${response.status} Error: ${errorText}`);
    }

    const data = (await response.json()) as { embedding: number[] };
    return new Float32Array(data.embedding);
  }

  public async embedBatch(texts: readonly string[]): Promise<Float32Array[]> {
    return Promise.all(texts.map((text) => this.embed(text)));
  }
}
