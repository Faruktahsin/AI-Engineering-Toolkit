import type { TokenUsage } from "./model";

export type EmbeddingVector = readonly number[];

export interface EmbeddingRequest {
  readonly input: string | readonly string[];
  readonly model?: string;
  readonly dimensions?: number;
  readonly user?: string;
}

export interface EmbeddingItem {
  readonly index: number;
  readonly embedding: EmbeddingVector;
}

export interface EmbeddingResponse {
  readonly model: string;
  readonly data: readonly EmbeddingItem[];
  readonly usage: TokenUsage;
}

export interface EmbeddingProvider {
  readonly name: string;
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}
