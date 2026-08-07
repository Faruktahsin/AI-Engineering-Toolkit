export interface PromptVariable {
  readonly name: string;
  readonly type: "string" | "number" | "boolean" | "object" | "array";
  readonly description?: string;
  readonly defaultValue?: unknown;
  readonly required?: boolean;
}

export interface PromptTemplate {
  readonly id: string;
  readonly name: string;
  readonly template: string;
  readonly variables: readonly PromptVariable[];
}

export interface PromptRenderer {
  render(template: PromptTemplate, values: Record<string, unknown>): string;
}

export interface Prompt {
  readonly template: PromptTemplate;
  readonly values: Record<string, unknown>;
  readonly renderedText: string;
}
