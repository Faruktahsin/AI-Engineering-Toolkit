#!/usr/bin/env node
import process from "node:process";
import { Command } from "commander";
import { PAKBCLI } from "./cli";
import { loadConfig, resolveConfig } from "./config";
import { type AgentTarget, connectAgent } from "./connect";
import { runDiagnostics } from "./doctor";
import { initializeProject } from "./init";
import {
  memoryApprove,
  memoryExplain,
  memoryImport,
  memoryInspect,
  memoryList,
  memoryReject,
  memorySearch,
} from "./memory-cmd";
import { formatStatusReport, getSystemStatus } from "./status";
import { startWatchMode } from "./watch";

const program = new Command();

program.name("aiet").description("AI Engineering Toolkit (AIET) CLI").version("1.0.0");

// 1. aiet init
program
  .command("init [directory]")
  .description(
    "Initialize a new AIET project with config, SQLite memory DB, and sample primitives as source files",
  )
  .option("-f, --force", "Overwrite existing configuration and files")
  .action((directory: string | undefined, options: { force?: boolean }) => {
    try {
      const targetDir = directory ?? ".";
      const rootPath = initializeProject(targetDir, { force: options.force });
      console.log(`[SUCCESS] Initialized AIET project in '${rootPath}'.`);
      console.log(
        "\nNote: Sample primitives have been created as JSON source files in ./primitives",
      );
      console.log("but have NOT yet been stored in the persistent memory database.");
      console.log("\nNext steps:");
      console.log("  1. Run 'aiet doctor' to check environment health");
      console.log("  2. Run 'aiet compile --dry-run' to test generation");
      console.log("  3. Run 'aiet memory import --dry-run' to preview sample ingestion");
      console.log("  4. Run 'aiet memory import' to store validated primitives");
      console.log("  5. Run 'aiet status' to view persistent database status");
      process.exit(0);
    } catch (err) {
      console.error(`[INIT ERROR] ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

// 2. aiet doctor
program
  .command("doctor")
  .description("Run system health and environment diagnostics")
  .action(async () => {
    const report = await runDiagnostics();
    console.log(report.messages.join("\n"));
    process.exit(report.isHealthy ? 0 : 1);
  });

// 3. aiet status
program
  .command("status")
  .description("Display visual dashboard of storage, WAL mode, memory count, and proposals")
  .action(async () => {
    const report = await getSystemStatus();
    console.log(formatStatusReport(report));
    process.exit(0);
  });

// 4. aiet connect <agent>
program
  .command("connect <agent>")
  .description("Auto-configure MCP server connection for 'claude', 'cursor', or 'windsurf'")
  .option("-f, --force", "Force re-configuration")
  .action((agent: string, options: { force?: boolean }) => {
    try {
      const res = connectAgent(agent as AgentTarget, options);
      console.log(`[SUCCESS] ${res.message}`);
      if (res.backupCreated) {
        console.log(`Backup created at '${res.backupCreated}'.`);
      }
      process.exit(0);
    } catch (err) {
      console.error(`[CONNECT ERROR] ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

// 5. aiet compile
program
  .command("compile")
  .description(
    "Compile AIET primitives into context artifacts (AGENTS.md, CLAUDE.md, .cursorrules)",
  )
  .option("-i, --input <directory>", "Input directory containing primitive JSON files")
  .option("-o, --output <directory>", "Output directory for compiled artifacts")
  .option("-c, --config <file>", "Path to configuration file")
  .option("--format", "Format output artifacts")
  .option("--dry-run", "Execute full compilation pipeline in memory without writing to disk")
  .option("-v, --verbose", "Enable verbose deterministic logging")
  .option("--fail-on-warning", "Fail with exit code 1 if warnings are emitted")
  .option("-w, --watch", "Watch input directory for changes and automatically recompile")
  .action(async (options) => {
    const cli = new PAKBCLI();
    const result = await cli.compile({
      input: options.input,
      output: options.output,
      config: options.config,
      format: options.format,
      dryRun: options.dryRun,
      verbose: options.verbose,
      failOnWarning: options.failOnWarning,
      watch: options.watch,
    });

    if (result.message) {
      if (result.exitCode === 0) {
        console.log(result.message);
      } else {
        console.error(result.message);
      }
    }

    if (options.watch && result.exitCode === 0) {
      const baseCfg = loadConfig(options.config);
      const resolvedCfg = resolveConfig(baseCfg, options);
      startWatchMode(resolvedCfg, options);
      return;
    }

    process.exit(result.exitCode);
  });

// 6. aiet memory
const memoryGroup = program
  .command("memory")
  .description("Memory engine operations and governance workflow");

memoryGroup
  .command("list")
  .description("List stored memory primitives")
  .option("-l, --limit <number>", "Maximum primitives to list", "50")
  .option("-t, --type <type>", "Filter by primitive type (entity, directive, assertion, event)")
  .action(async (options: { limit?: string; type?: string }) => {
    const limit = Number.parseInt(options.limit ?? "50", 10);
    const typeOpt = options.type ? { type: options.type } : {};
    const output = await memoryList({ limit, ...typeOpt });
    console.log(output);
    process.exit(0);
  });

memoryGroup
  .command("import")
  .description("Safely ingest, validate, and store memory primitives from source files")
  .option("-i, --input <directory>", "Input directory containing primitive JSON files")
  .option("--dry-run", "Validate and preview import without saving to the database")
  .action(async (options: { input?: string; dryRun?: boolean }) => {
    const args: { input?: string; dryRun?: boolean } = {};
    if (options.input !== undefined) args.input = options.input;
    if (options.dryRun !== undefined) args.dryRun = options.dryRun;
    const output = await memoryImport(args);
    console.log(output);
    process.exit(0);
  });

memoryGroup
  .command("search <query>")
  .description("Execute hybrid FTS5 + Vector memory search")
  .option("-l, --limit <number>", "Maximum matches to return", "10")
  .action(async (query: string, options: { limit?: string }) => {
    const limit = Number.parseInt(options.limit ?? "10", 10);
    const output = await memorySearch(query, { limit });
    console.log(output);
    process.exit(0);
  });

memoryGroup
  .command("inspect <id>")
  .description("Inspect detailed primitive attributes and lifecycle metadata")
  .action(async (id: string) => {
    const output = await memoryInspect(id);
    console.log(output);
    process.exit(0);
  });

memoryGroup
  .command("approve <id>")
  .description("Approve a pending memory proposal in the governance queue")
  .action(async (id: string) => {
    const output = await memoryApprove(id);
    console.log(output);
    process.exit(0);
  });

memoryGroup
  .command("reject <id> [reason]")
  .description("Reject a pending memory proposal in the governance queue")
  .action(async (id: string, reason: string | undefined) => {
    const output = await memoryReject(id, reason);
    console.log(output);
    process.exit(0);
  });

memoryGroup
  .command("explain <id>")
  .description("Explain primitive origin, confidence score, and governance audit history")
  .action(async (id: string) => {
    const output = await memoryExplain(id);
    console.log(output);
    process.exit(0);
  });

program.parse(process.argv);
