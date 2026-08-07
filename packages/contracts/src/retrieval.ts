import type { Document, DocumentChunk, DocumentMetadata } from "./document";

export interface SearchResult<T = DocumentChunk> {
  readonly item: T;
  readonly score: number; // Relevance score
  readonly distance?: number;
}

export interface EmbeddingIndex {
  upsert(id: string, vector: readonly number[], metadata?: Record<string, unknown>): Promise<void>;
  query(vector: readonly number[], topK?: number): Promise<readonly SearchResult<string>[]>;
  delete(id: string): Promise<boolean>;
}

export interface DocumentStore {
  save(document: Document): Promise<void>;
  get(id: string): Promise<Document | undefined>;
  delete(id: string): Promise<boolean>;
  list(offset?: number, limit?: number): Promise<readonly DocumentMetadata[]>;
}

export interface Retriever {
  retrieve(query: string, topK?: number): Promise<readonly SearchResult<DocumentChunk>[]>;
}
