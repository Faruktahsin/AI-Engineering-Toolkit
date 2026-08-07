export interface DocumentMetadata {
  readonly id: string;
  readonly title?: string;
  readonly source?: string;
  readonly mimeType?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly customFields?: Record<string, unknown>;
}

export interface DocumentChunk {
  readonly id: string;
  readonly documentId: string;
  readonly content: string;
  readonly chunkIndex: number;
  readonly tokenCount?: number;
  readonly embedding?: readonly number[];
}

export interface Document {
  readonly metadata: DocumentMetadata;
  readonly content: string;
  readonly chunks?: readonly DocumentChunk[];
}
