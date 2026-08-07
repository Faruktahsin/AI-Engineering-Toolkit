export interface TokenCount {
  readonly tokens: number;
  readonly characters: number;
}

export interface TokenRange {
  readonly startToken: number;
  readonly endToken: number;
  readonly startChar: number;
  readonly endChar: number;
}

export interface TokenizerCapabilities {
  readonly encodingName: string;
  readonly maxTokens: number;
}

export interface TokenizerProvider {
  readonly encodingName: string;
  encode(text: string): Uint32Array;
  decode(tokens: Uint32Array | readonly number[]): string;
  countTokens(text: string): TokenCount;
  truncate(text: string, maxTokens: number): string;
}
