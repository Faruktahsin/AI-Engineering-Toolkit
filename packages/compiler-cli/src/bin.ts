#!/usr/bin/env node
import process from "node:process";
import { Command } from "commander";
import { PAKBCLI } from "./cli";

const program = new Command();

program
  .name("pakb")
  .description("Personal AI Knowledge Base (PAKB) Production Compiler CLI")
  .version("1.0.0");

program
  .command("compile")
  .description(
    "Compile PAKB primitives into AI context artifacts (AGENTS.md, CLAUDE.md, .cursorrules, manifest.json)",
  )
  .option("-i, --input <directory>", "Input directory containing primitive JSON files")
  .option("-o, --output <directory>", "Output directory for compiled artifacts")
  .option("-c, --config <file>", "Path to configuration file (default: pakb.config.json)")
  .option("--format", "Format output artifacts")
  .option("--dry-run", "Execute full compilation pipeline in memory without writing to disk")
  .option("-v, --verbose", "Enable verbose deterministic logging")
  .option("--fail-on-warning", "Fail with exit code 1 if warnings are emitted")
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
    });

    if (result.message) {
      if (result.exitCode === 0) {
        console.log(result.message);
      } else {
        console.error(result.message);
      }
    }

    process.exit(result.exitCode);
  });

program.parse(process.argv);
