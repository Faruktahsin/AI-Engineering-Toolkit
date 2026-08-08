import type { AIETEmbeddingProvider } from "@aiet/embeddings";

export interface OpenAIEmbeddingOptions {
  readonly apiKey?: string | undefined;
  readonly model?: string | undefined;
  readonly dimensions?: number | undefined;
  readonly baseUrl?: string | undefined;
  readonly fetchFn?: typeof fetch | undefined;
}

export class OpenAIEmbeddingProvider implements AIETEmbeddingProvider {
  public readonly name: string;
  public readonly dimensions: number;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: OpenAIEmbeddingOptions = {}) {
    this.apiKey = options.apiKey ?? process.env["OPENAI_API_KEY"] ?? "";
    this.model = options.model ?? "text-embedding-3-small";
    this.dimensions = options.dimensions ?? 1536;
    this.baseUrl = (options.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
    this.name = `openai-${this.model}`;
  }

  public async embed(text: string): Promise<Float32Array> {
    const results = await this.embedBatch([text]);
    const vec = results[0];
    if (!vec) {
      throw new Error("OpenAI Embedding API returned empty vector result.");
    }
    return vec;
  }

  public async embedBatch(texts: readonly string[]): Promise<Float32Array[]> {
    if (texts.length === 0) {
      return [];
    }

    const response = await this.fetchFn(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
        dimensions: this.dimensions,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI Embedding API HTTP ${response.status} Error: ${errorText}`);
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
    };

    data.data.sort((a, b) => a.index - b.index);
    return data.data.map((item) => new Float32Array(item.embedding));
  }
}
