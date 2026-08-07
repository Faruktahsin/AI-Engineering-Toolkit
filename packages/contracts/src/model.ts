export type ChatRole = "system" | "user" | "assistant" | "tool" | "function";

export interface ChatMessage {
  readonly role: ChatRole;
  readonly content: string;
  readonly name?: string;
  readonly tool_call_id?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface ModelCapabilities {
  readonly supportsStreaming: boolean;
  readonly supportsTools: boolean;
  readonly supportsVision: boolean;
  readonly supportsJSONOutput: boolean;
  readonly maxContextTokens: number;
  readonly maxOutputTokens: number;
}

export interface ModelParameters {
  readonly temperature?: number;
  readonly topP?: number;
  readonly topK?: number;
  readonly frequencyPenalty?: number;
  readonly presencePenalty?: number;
  readonly maxTokens?: number;
  readonly stopSequences?: readonly string[];
  readonly responseFormat?: "text" | "json";
}

export interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

export interface ModelResponse {
  readonly id: string;
  readonly model: string;
  readonly message: ChatMessage;
  readonly finishReason: "stop" | "length" | "tool_calls" | "content_filter" | "error";
  readonly usage: TokenUsage;
  readonly rawResponse?: unknown;
}
