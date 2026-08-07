import fs from "node:fs";
import path from "node:path";
import { AIETError, AIETErrorCode } from "@aiet/errors";
import { parseEnvVariables } from "./env";
import type { ConfigLoadResult, ConfigLoaderOptions } from "./types";

export class ConfigLoader<T extends Record<string, unknown>> {
  constructor(private readonly options: ConfigLoaderOptions<T>) {}

  /**
   * Loads configuration deterministically from defaults, JSON file, and environment variables.
   * Returns an immutable, frozen configuration object.
   */
  public load(customEnv?: Record<string, string | undefined>): ConfigLoadResult<T> {
    const sourcesLoaded: string[] = [];
    let merged: Record<string, unknown> = {};

    // 1. Load Defaults
    if (this.options.defaults) {
      merged = { ...this.options.defaults };
      sourcesLoaded.push("defaults");
    }

    // 2. Load JSON File
    if (this.options.jsonPath) {
      const resolvedPath = path.resolve(this.options.jsonPath);
      if (fs.existsSync(resolvedPath)) {
        try {
          const raw = fs.readFileSync(resolvedPath, "utf8");
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          merged = { ...merged, ...parsed };
          sourcesLoaded.push(`file:${resolvedPath}`);
        } catch (err) {
          throw new AIETError(
            `Failed to load JSON config from '${resolvedPath}': ${err instanceof Error ? err.message : String(err)}`,
            {
              code: AIETErrorCode.FAILED_PRECONDITION,
              cause: err instanceof Error ? err : null,
            },
          );
        }
      }
    }

    // 3. Load Environment Variables
    const envSource = customEnv ?? process.env;
    const envOverrides = parseEnvVariables<T>(
      envSource,
      this.options.envPrefix,
      this.options.envMap,
    );

    if (Object.keys(envOverrides).length > 0) {
      merged = { ...merged, ...envOverrides };
      sourcesLoaded.push("environment");
    }

    // 4. Runtime Validation
    let finalConfig: T = merged as T;

    if (this.options.validator) {
      try {
        finalConfig = this.options.validator(merged);
      } catch (err) {
        throw new AIETError(
          `Runtime configuration validation failed: ${err instanceof Error ? err.message : String(err)}`,
          {
            code: AIETErrorCode.SCHEMA_VALIDATION_ERROR,
            cause: err instanceof Error ? err : null,
          },
        );
      }
    }

    // 5. Freeze object recursively to enforce immutability
    const frozenConfig = deepFreeze({ ...finalConfig });

    return {
      config: frozenConfig,
      sourcesLoaded: Object.freeze(sourcesLoaded),
    };
  }
}

function deepFreeze<O extends Record<string, unknown>>(obj: O): O {
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== null && typeof val === "object" && !Object.isFrozen(val)) {
      deepFreeze(val as Record<string, unknown>);
    }
  }
  return obj;
}
