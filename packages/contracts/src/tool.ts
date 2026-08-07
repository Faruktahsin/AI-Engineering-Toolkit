export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>; // JSON Schema Draft 2020-12
}

export interface ToolContext {
  readonly executionId: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface ToolResult<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
  };
}

export interface ToolExecutor<TArgs = Record<string, unknown>, TResult = unknown> {
  execute(args: TArgs, context?: ToolContext): Promise<ToolResult<TResult>>;
}

export interface Tool<TArgs = Record<string, unknown>, TResult = unknown> {
  readonly definition: ToolDefinition;
  readonly executor: ToolExecutor<TArgs, TResult>;
}

export interface ToolRegistry {
  register(tool: Tool): void;
  unregister(name: string): boolean;
  get(name: string): Tool | undefined;
  list(): readonly ToolDefinition[];
}
