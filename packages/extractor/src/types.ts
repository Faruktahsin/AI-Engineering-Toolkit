import type { AnyPrimitive } from "@aiet/schema";

export interface ExtractorChatMessage {
  readonly role: "user" | "assistant" | "system";
  readonly content: string;
  readonly timestamp?: string | undefined;
}

export type ChatMessage = ExtractorChatMessage;

export interface ConversationInput {
  readonly messages: readonly ExtractorChatMessage[];
  readonly metadata?: Record<string, unknown> | undefined;
}

export interface MemoryCandidate {
  readonly primitive_type: "entity" | "directive" | "assertion" | "event" | "relation";
  readonly candidate: AnyPrimitive;
  readonly confidence_score: number;
  readonly rationale: string;
}

export interface ExtractionResult {
  readonly total_candidates: number;
  readonly candidates: readonly MemoryCandidate[];
  readonly skipped_turns: number;
}

export interface ExtractorProvider {
  readonly name: string;
  extract(input: ConversationInput): Promise<ExtractionResult>;
}
