import { type CompilationResult, CompilerPipeline, type EmitterResult } from "@aiet/compiler";
import { type AnyPrimitive, ArtifactEmissionError, SchemaValidationError } from "@aiet/schema";
import { type CLIConfig, loadConfig, resolveConfig } from "./config";
import { loadInputPrimitives, writeArtifactsAtomic } from "./filesystem";
import type { CLIOptions, CLIResult } from "./types";

export class PAKBCLI {
  public async compile(options: CLIOptions = {}): Promise<CLIResult> {
    // 1. Load & Resolve Configuration
    let resolvedCfg: CLIConfig;
    try {
      const baseCfg = loadConfig(options.config);
      resolvedCfg = resolveConfig(baseCfg, options);
    } catch (err) {
      return {
        exitCode: 2,
        message: `[CONFIG ERROR] ${err instanceof Error ? err.message : String(err)}`,
        artifactsWritten: [],
      };
    }

    // 2. Load Input Primitives
    let primitives: AnyPrimitive[];
    try {
      primitives = loadInputPrimitives(resolvedCfg.input);
    } catch (err) {
      return {
        exitCode: 3,
        message: `[FILESYSTEM ERROR] ${err instanceof Error ? err.message : String(err)}`,
        artifactsWritten: [],
      };
    }

    // 3. Execute Compiler Pipeline
    const pipeline = new CompilerPipeline();
    let pipelineResult: CompilationResult;
    try {
      pipelineResult = pipeline.compile({
        primitives,
        budget: resolvedCfg.budget,
        strict_mode: resolvedCfg.strict_mode,
      });
    } catch (err) {
      if (err instanceof SchemaValidationError) {
        return {
          exitCode: 4,
          message: `[SCHEMA VALIDATION FAILURE] ${err.message}`,
          artifactsWritten: [],
        };
      }
      if (err instanceof ArtifactEmissionError) {
        return {
          exitCode: 5,
          message: `[EMISSION FAILURE] ${err.message}`,
          artifactsWritten: [],
        };
      }
      return {
        exitCode: 1,
        message: `[COMPILATION ERROR] ${err instanceof Error ? err.message : String(err)}`,
        artifactsWritten: [],
      };
    }

    // Handle Strict Mode Check
    if (resolvedCfg.strict_mode && pipelineResult.warnings.length > 0) {
      return {
        exitCode: 1,
        message: `[STRICT MODE FAILURE] Compilation produced ${pipelineResult.warnings.length} warning(s): ${pipelineResult.warnings.join(" | ")}`,
        artifactsWritten: [],
      };
    }

    // 4. Dry-Run Check
    if (resolvedCfg.dry_run) {
      return {
        exitCode: 0,
        message: `[DRY RUN] Compilation dry-run successful. Computed ${Object.keys(pipelineResult.artifacts).length} artifact(s) within budget. No files written.`,
        artifactsWritten: [],
      };
    }

    // 5. Atomic Output Write
    try {
      const written = writeArtifactsAtomic(
        resolvedCfg.output,
        pipelineResult.artifacts as Record<string, EmitterResult>,
      );
      return {
        exitCode: 0,
        message: `[SUCCESS] Compiled ${written.length} artifact(s) successfully to '${resolvedCfg.output}'.`,
        artifactsWritten: written,
        primitivesProcessed: primitives.length,
      };
    } catch (err) {
      return {
        exitCode: 3,
        message: `[OUTPUT WRITE ERROR] ${err instanceof Error ? err.message : String(err)}`,
        artifactsWritten: [],
      };
    }
  }
}

export async function executeCompilationPipeline(
  config: CLIConfig,
  options: CLIOptions,
): Promise<{ success: boolean; durationMs: number; exitCode: number; message: string }> {
  const startTime = Date.now();
  const cli = new PAKBCLI();
  const result = await cli.compile({
    ...options,
    input: config.input,
    output: config.output,
  });
  const durationMs = Date.now() - startTime;
  return {
    success: result.exitCode === 0,
    durationMs,
    exitCode: result.exitCode,
    message: result.message,
  };
}
