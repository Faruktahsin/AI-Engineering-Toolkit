export interface CLIConfig {
  input: string;
  output: string;
  budget: number;
  strict_mode: boolean;
  targets: readonly string[];
  dry_run?: boolean;
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

/**
 * Loads and validates pakb.config.json file from disk.
 */
export function loadConfig(configPath?: string): PAKBConfig {
  const resolvedPath = path.resolve(configPath ?? DEFAULT_CONFIG_FILENAME);

  if (!fs.existsSync(resolvedPath)) {
    if (configPath) {
      throw new ConfigurationError(`Configuration file not found: '${resolvedPath}'`);
    }
    // Return default config if no explicit config path provided and default missing
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

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ConfigurationError(
      `Configuration file '${resolvedPath}' must contain a JSON object.`,
    );
  }

  const obj = parsed as Record<string, unknown>;

  const input = typeof obj["input"] === "string" ? (obj["input"] as string) : DEFAULT_CONFIG.input;
  const output =
    typeof obj["output"] === "string" ? (obj["output"] as string) : DEFAULT_CONFIG.output;
  const budget =
    typeof obj["budget"] === "number" && (obj["budget"] as number) > 0
      ? (obj["budget"] as number)
      : DEFAULT_CONFIG.budget;
  const strict_mode =
    typeof obj["strict_mode"] === "boolean"
      ? (obj["strict_mode"] as boolean)
      : DEFAULT_CONFIG.strict_mode;
  const targets = Array.isArray(obj["targets"])
    ? (obj["targets"] as unknown[]).map(String)
    : DEFAULT_CONFIG.targets;

  return {
    input,
    output,
    targets,
    budget,
    strict_mode,
  };
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
