import { writeFileSync } from "node:fs";
import { type BudgetFitResult, CompilerPipeline, PipelineStage } from "@aiet/compiler";
import type { PAKBStorageRepository } from "@aiet/storage";

export interface CompileOptions {
  readonly targetFormat?: string | undefined;
  readonly tokenBudget?: number | undefined;
  readonly outputPath?: string | undefined;
}

export interface CompileResult {
  readonly content: string;
  readonly token_count: number;
  readonly target_format: string;
}

export class CompilerClient {
  private readonly storage: PAKBStorageRepository;

  constructor(storage: PAKBStorageRepository) {
    this.storage = storage;
  }

  public async compile(options?: CompileOptions): Promise<CompileResult> {
    const targetFormat = options?.targetFormat ?? "AGENTS.md";
    const maxBudget = options?.tokenBudget ?? 500;

    // Fetch non-restricted primitives from storage
    const primitives = await this.storage.getPrimitives();
    const activePrimitives = primitives.filter((p) => p.sensitivity !== "restricted");

    const pipeline = new CompilerPipeline();
    const result = pipeline.runUntil(PipelineStage.FIT, activePrimitives, {
      max_tier0_budget: maxBudget,
    });
    const fitResult = result.primitives as BudgetFitResult;

    const lines: string[] = [
      `# System Preamble (${targetFormat})`,
      "",
      `*Compiled by AIET Context Compiler (Token Budget: ${maxBudget})*`,
      "",
    ];

    for (const item of fitResult.tier0) {
      const p = item.primitive;
      if ("statement" in p) {
        lines.push(`- **[DIRECTIVE]** ${p.statement}`);
      } else if ("claim" in p) {
        lines.push(`- **[FACT]** ${p.claim}`);
      } else if ("name" in p) {
        lines.push(`- **[ENTITY]** ${p.name}: ${p.description ?? ""}`);
      } else if ("summary" in p) {
        lines.push(`- **[EVENT]** ${p.summary}`);
      }
    }

    const content = lines.join("\n");
    const tokenCount = fitResult.tier0_tokens;

    if (options?.outputPath) {
      writeFileSync(options.outputPath, content, "utf-8");
    }

    return {
      content,
      token_count: tokenCount,
      target_format: targetFormat,
    };
  }
}
