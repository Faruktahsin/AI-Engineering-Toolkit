import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliEntry = path.join(repositoryRoot, "packages", "compiler-cli", "dist", "bin.js");
const projectDir = mkdtempSync(path.join(tmpdir(), "aiet-cli-smoke-"));

function runCli(args, cwd) {
  const result = spawnSync(process.execPath, [cliEntry, ...args], {
    cwd,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`aiet ${args.join(" ")} failed with exit code ${result.status}:\n${output}`);
  }
}

function assertExists(relativePath) {
  const target = path.join(projectDir, relativePath);
  if (!existsSync(target)) {
    throw new Error(`Expected CLI onboarding artifact was not created: ${relativePath}`);
  }
}

try {
  if (!existsSync(cliEntry)) {
    throw new Error(`Built CLI entry point is missing: ${cliEntry}`);
  }
  runCli(["init", projectDir], repositoryRoot);
  runCli(["doctor"], projectDir);
  runCli(["memory", "import", "--dry-run"], projectDir);
  runCli(["memory", "import"], projectDir);
  runCli(["compile"], projectDir);
  runCli(["status"], projectDir);

  assertExists(".aiet/memory.db");
  assertExists("dist/AGENTS.md");
  assertExists("dist/CLAUDE.md");
  assertExists("dist/.cursorrules");
  assertExists("dist/manifest.json");
  console.log("[OK] CLI onboarding smoke test passed.");
} finally {
  rmSync(projectDir, { recursive: true, force: true });
}
