import path from "node:path";
import chokidar, { type FSWatcher } from "chokidar";
import { executeCompilationPipeline } from "./cli";
import type { CLIOptions, PAKBConfig } from "./types";

export interface WatcherOptions {
  onRecompile?: (success: boolean) => void;
}

export function startWatchMode(
  config: PAKBConfig,
  cliOptions: CLIOptions,
  watcherOptions?: WatcherOptions,
): FSWatcher {
  const watchPath = path.resolve(config.input);
  console.log(`[WATCH MODE] Watching for primitive changes in '${watchPath}'...`);

  let isCompiling = false;
  let recompileQueued = false;

  const triggerRecompile = async (reason: string) => {
    if (isCompiling) {
      recompileQueued = true;
      return;
    }

    isCompiling = true;
    console.log(`\n[WATCH MODE] Change detected (${reason}). Recompiling context artifacts...`);

    try {
      const result = await executeCompilationPipeline(config, cliOptions);
      if (result.success) {
        console.log(`[WATCH MODE] ✓ Recompilation succeeded in ${result.durationMs}ms.`);
      } else {
        console.error(`[WATCH MODE] ✗ Recompilation failed with exit code ${result.exitCode}.`);
      }
      watcherOptions?.onRecompile?.(result.success);
    } catch (err) {
      console.error(
        `[WATCH MODE] ✗ Error during compilation: ${err instanceof Error ? err.message : String(err)}`,
      );
      watcherOptions?.onRecompile?.(false);
    } finally {
      isCompiling = false;
      if (recompileQueued) {
        recompileQueued = false;
        triggerRecompile("queued change");
      }
    }
  };

  const watcher = chokidar.watch(watchPath, {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  watcher
    .on("add", (filePath) => triggerRecompile(`file added: ${path.basename(filePath)}`))
    .on("change", (filePath) => triggerRecompile(`file modified: ${path.basename(filePath)}`))
    .on("unlink", (filePath) => triggerRecompile(`file deleted: ${path.basename(filePath)}`))
    .on("error", (error) => console.error(`[WATCH MODE] Watcher error: ${error}`));

  return watcher;
}
