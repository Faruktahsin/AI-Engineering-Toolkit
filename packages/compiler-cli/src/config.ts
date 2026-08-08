export interface CLIConfig {
  input: string;
  output: string;
  budget: number;
  strict_mode: boolean;
  targets: readonly string[];
  dry_run?: boolean | undefined;
}

import fs from "node:fs";
import path from "node:path";
import type { CLIOptions, PAKBConfig } from "./types";

export const DEFAULT_CONFIG_FILENAME = "pakb.config.json";

export const DEFAULT_CONFIG: PAKBConfig = {
  input: "./primitives",
  output: "./dist",
  targets: ["AGENTS.md", "CLAUDE.md", ".cursorrules", "manifest.json"],
  budget: 500,
  strict_mode: true,
};

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

import { z } from "zod";

export const PAKBConfigSchema = z.object({
  input: z.string().min(1).default(DEFAULT_CONFIG.input),
  output: z.string().min(1).default(DEFAULT_CONFIG.output),
  targets: z.array(z.string()).default([...DEFAULT_CONFIG.targets]),
  budget: z.number().int().positive().default(DEFAULT_CONFIG.budget),
  strict_mode: z.boolean().default(DEFAULT_CONFIG.strict_mode),
  dry_run: z.boolean().optional(),
});

/**
 * Loads and validates pakb.config.json file from disk.
 */
export function loadConfig(configPath?: string): PAKBConfig {
  const resolvedPath = path.resolve(configPath ?? DEFAULT_CONFIG_FILENAME);

  if (!fs.existsSync(resolvedPath)) {
    if (configPath) {
      throw new ConfigurationError(`Configuration file not found: '${resolvedPath}'`);
    }
    return DEFAULT_CONFIG;
  }

  let rawContent: string;
  try {
    rawContent = fs.readFileSync(resolvedPath, "utf8");
  } catch (err) {
    throw new ConfigurationError(
      `Failed to read config file '${resolvedPath}': ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch (err) {
    throw new ConfigurationError(
      `Invalid JSON in configuration file '${resolvedPath}': ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const result = PAKBConfigSchema.safeParse(parsed);
  if (!result.success) {
    const formattedErrors = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new ConfigurationError(
      `Configuration validation failed for '${resolvedPath}': ${formattedErrors}`,
    );
  }

  return result.data;
}

/**
 * Merges loaded PAKBConfig with command-line flag overrides.
 */
export function resolveConfig(config: PAKBConfig, options: CLIOptions): PAKBConfig {
  const baseConfig: Omit<PAKBConfig, "dry_run"> = {
    input: options.input ? options.input : config.input,
    output: options.output ? options.output : config.output,
    targets: config.targets,
    budget: config.budget,
    strict_mode: options.failOnWarning ? true : config.strict_mode,
  };

  if (options.dryRun === true || config.dry_run === true) {
    return {
      ...baseConfig,
      dry_run: true,
    };
  }

  return baseConfig;
}
