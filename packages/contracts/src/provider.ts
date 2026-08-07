import type { EmbeddingProvider } from "./embedding";
import type { ChatMessage, ModelCapabilities, ModelParameters, ModelResponse } from "./model";
import type { TokenizerProvider } from "./tokenizer";

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ModelCapabilities;
}

export interface ChatProvider extends AIProvider {
  chat(messages: readonly ChatMessage[], parameters?: ModelParameters): Promise<ModelResponse>;
}

export interface CompletionProvider extends AIProvider {
  complete(prompt: string, parameters?: ModelParameters): Promise<ModelResponse>;
}

export interface StreamingProvider extends AIProvider {
  streamChat(
    messages: readonly ChatMessage[],
    parameters?: ModelParameters,
    onChunk?: (chunk: string) => void,
  ): AsyncIterable<string>;
}

export type { EmbeddingProvider, TokenizerProvider };
