import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { GroundTruthDatasetSchema } from "./datasets/dataset-types";
import { runCompilerHarness } from "./harnesses/compiler-harness";
import { runConsolidationHarness } from "./harnesses/consolidation-harness";
import { runRetrievalHarness } from "./harnesses/retrieval-harness";
import { type ReportMetadata, generateMarkdownReport } from "./reporters/markdown-reporter";

async function main() {
  console.log("🚀 Running AIET v0.1.0 Empirical Benchmark Suite...");

  // Get git commit SHA
  let commitSha = "unknown";
  try {
    commitSha = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    commitSha = "v0.1.0-alpha-release";
  }

  const datasetPath = resolve(__dirname, "./datasets/ground-truth.json");
  const dataset = JSON.parse(readFileSync(datasetPath, "utf-8")) as GroundTruthDatasetSchema;

  // 1. Run Retrieval Harness
  console.log("  [1/3] Running Retrieval Harness (BM25 vs Mock Vector vs Hybrid RRF)...");
  const retrievalSummary = await runRetrievalHarness(dataset);

  // 2. Run Compiler Harness
  console.log("  [2/3] Running Context Compiler Harness (Token Fitting & Determinism)...");
  const compilerSummary = await runCompilerHarness(dataset);

  // 3. Run Consolidation Harness
  console.log("  [3/3] Running Memory Consolidation Harness (Contradiction & Supersession)...");
  const consolidationSummary = await runConsolidationHarness(dataset);

  // Build Metadata
  const meta: ReportMetadata = {
    aietVersion: "0.1.0-alpha",
    commitSha,
    nodeVersion: process.version,
    pnpmVersion: "11.20.0",
    platform: process.platform,
    arch: process.arch,
    timestamp: new Date().toISOString(),
    datasetVersion: dataset.version,
    totalDatasetCases: dataset.testCases.length,
  };

  // Generate Report Markdown
  const markdownReport = generateMarkdownReport(
    meta,
    retrievalSummary,
    compilerSummary,
    consolidationSummary,
  );

  // Write artifact to docs/benchmarks/BASELINE_v0.1.0.md
  const docsBenchmarksDir = resolve(process.cwd(), "../../docs/benchmarks");
  mkdirSync(docsBenchmarksDir, { recursive: true });

  const artifactPath = resolve(docsBenchmarksDir, "BASELINE_v0.1.0.md");
  writeFileSync(artifactPath, markdownReport, "utf-8");

  console.log("\n✅ Benchmark Execution Completed Successfully!");
  console.log(`📊 Baseline Report Generated: ${artifactPath}\n`);
}

main().catch((err) => {
  console.error("❌ Benchmark execution failed:", err);
  process.exit(1);
});
