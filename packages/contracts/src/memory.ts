import type { ChatMessage } from "./model";

export interface ConversationMemory {
  addMessage(sessionId: string, message: ChatMessage): Promise<void>;
  getHistory(sessionId: string, limit?: number): Promise<readonly ChatMessage[]>;
  clearHistory(sessionId: string): Promise<void>;
}

export interface SemanticMemoryRecord<T = unknown> {
  readonly id: string;
  readonly content: string;
  readonly embedding?: readonly number[];
  readonly metadata?: Record<string, unknown>;
  readonly payload?: T;
}

export interface SemanticMemory<T = unknown> {
  store(record: SemanticMemoryRecord<T>): Promise<void>;
  search(
    query: string | readonly number[],
    topK?: number,
  ): Promise<readonly SemanticMemoryRecord<T>[]>;
  delete(id: string): Promise<boolean>;
}

export interface WorkingMemory {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

export interface MemoryStore {
  readonly conversation: ConversationMemory;
  readonly semantic: SemanticMemory;
  readonly working: WorkingMemory;
}

export interface MemoryProvider {
  readonly name: string;
  getMemoryStore(sessionId: string): MemoryStore;
}
