import { CompilerPipeline } from "@aiet/compiler";
import type { AnyPrimitive } from "@aiet/schema";

export interface AIETVercelContextOptions {
  readonly primitives?: readonly AnyPrimitive[] | undefined;
  readonly budget?: number | undefined;
  readonly strict_mode?: boolean | undefined;
  readonly target?: "AGENTS.md" | "CLAUDE.md" | ".cursorrules" | undefined;
  readonly systemPrompt?: string | undefined;
}

export function buildAIETSystemPrompt(options: AIETVercelContextOptions = {}): string {
  const primitives = options.primitives ? [...options.primitives] : [];
  const budget = options.budget ?? 500;
  const strictMode = options.strict_mode ?? true;
  const target = options.target ?? "AGENTS.md";

  const pipeline = new CompilerPipeline();
  const compilation = pipeline.compile({
    primitives,
    budget,
    strict_mode: strictMode,
  });

  const artifacts = compilation.artifacts as Record<string, { content: string }>;
  const compiledContent = artifacts[target]?.content ?? "";

  if (options.systemPrompt && options.systemPrompt.trim().length > 0) {
    return `${compiledContent}\n\n# Application Instructions\n${options.systemPrompt.trim()}`;
  }

  return compiledContent;
}

export function aietSystemMiddleware(
  options: AIETVercelContextOptions = {},
): (basePrompt?: string) => string {
  return (basePrompt?: string): string => {
    return buildAIETSystemPrompt({
      ...options,
      systemPrompt: basePrompt ?? options.systemPrompt,
    });
  };
}
