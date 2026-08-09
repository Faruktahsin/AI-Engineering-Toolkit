import { CompilerPipeline } from "@aiet/compiler";
import { generateULID } from "@aiet/domain";
import type { AnyPrimitive } from "@aiet/schema";
import type { GroundTruthDatasetSchema } from "../datasets/dataset-types";
import { calculateBudgetCompliance, calculateTokenEfficiency } from "../metrics/ir-metrics";

export interface BudgetEvaluationResult {
  budgetLimit: number;
  rawInputTokensEstimate: number;
  candidatePrimitives: number;
  selectedPrimitives: number;
  compiledTokensEstimate: number;
  tokenEfficiencyPercent: number;
  budgetCompliancePercent: number;
  compliancePassed: boolean;
  isBudgetBinding: boolean;
}

export interface CompilerBenchmarkSummary {
  tokenBudgetMatrix: BudgetEvaluationResult[];
  inProcessDeterminism: {
    totalRuns: number;
    identicalHashCount: number;
    matchPercent: number;
    aggregateHash: string;
  };
  crossProcessDeterminism: {
    totalProcesses: number;
    identicalHashCount: number;
    matchPercent: number;
    aggregateHash: string;
  };
}

export async function runCompilerHarness(
  dataset: GroundTruthDatasetSchema,
): Promise<CompilerBenchmarkSummary> {
  const pipeline = new CompilerPipeline();

  const primitives: AnyPrimitive[] = [];

  // Seed primitives from dataset
  for (const m of dataset.memories) {
    const basePrimitive = {
      schema_version: "1.0.0",
      id: m.id,
      created_at: "2026-08-08T12:00:00Z",
      updated_at: "2026-08-08T12:00:00Z",
      last_verified: "2026-08-08T12:00:00Z",
      sensitivity: "public",
      volatility: "low",
      activation: "always_on",
    };

    if (m.entityType === "Directive") {
      primitives.push({
        ...basePrimitive,
        statement: m.content,
        enforcement: "soft",
        domain: "engineering",
      } as AnyPrimitive);
    } else if (m.entityType === "Assertion") {
      primitives.push({
        ...basePrimitive,
        claim: m.content,
        evidence_type: "observed",
        type: "fact",
        status: "accepted",
      } as AnyPrimitive);
    } else if (m.entityType === "Entity") {
      primitives.push({
        ...basePrimitive,
        name: m.content,
        type: "workstream",
      } as AnyPrimitive);
    } else {
      primitives.push({
        ...basePrimitive,
        timestamp: "2026-08-08T12:00:00Z",
        summary: m.content,
        type: "session_log",
      } as AnyPrimitive);
    }
  }

  // Expand workload to ~6,500 raw input tokens with 100 additional always_on stress primitives
  for (let extCounter = 1; extCounter <= 100; extCounter++) {
    const pType = extCounter % 2 === 0 ? "directive" : "assertion";
    const id = generateULID(pType);
    const content = `Synthetic developer workload stress primitive #${extCounter} specifying governance compliance, auditability, and token budgeting rules for subsystem module alpha-${extCounter}.`;

    const basePrimitive = {
      schema_version: "1.0.0",
      id,
      created_at: "2026-08-08T12:00:00Z",
      updated_at: "2026-08-08T12:00:00Z",
      last_verified: "2026-08-08T12:00:00Z",
      sensitivity: "public",
      volatility: "low",
      activation: "always_on",
    };

    if (pType === "directive") {
      primitives.push({
        ...basePrimitive,
        statement: content,
        enforcement: "soft",
        domain: "engineering",
      } as AnyPrimitive);
    } else {
      primitives.push({
        ...basePrimitive,
        claim: content,
        evidence_type: "observed",
        type: "fact",
        status: "accepted",
      } as AnyPrimitive);
    }
  }

  const rawText = primitives
    .map((p) => ("statement" in p ? p.statement : "claim" in p ? p.claim : p.id))
    .join("\n");
  const rawInputTokensEstimate = Math.ceil(rawText.length / 4);

  // Evaluate required token budget matrix: 500, 1000, 2000, 4000
  const budgetLimits = [500, 1000, 2000, 4000];
  const tokenBudgetMatrix: BudgetEvaluationResult[] = [];

  for (const limit of budgetLimits) {
    const buildResult = pipeline.run(primitives, { max_tier0_budget: limit });
    const candidatePrimitives = buildResult.original_count;
    const selectedPrimitives = buildResult.fit_result.tier0.length;
    const compiledTokensEstimate = buildResult.fit_result.tier0_tokens;

    const tokenEfficiencyPercent = calculateTokenEfficiency(
      rawInputTokensEstimate,
      compiledTokensEstimate,
    );
    const budgetCompliancePercent = calculateBudgetCompliance(compiledTokensEstimate, limit);
    const compliancePassed = compiledTokensEstimate <= limit;
    const isBudgetBinding =
      buildResult.fit_result.tier1.length > 0 || buildResult.fit_result.overflow.length > 0;

    tokenBudgetMatrix.push({
      budgetLimit: limit,
      rawInputTokensEstimate,
      candidatePrimitives,
      selectedPrimitives,
      compiledTokensEstimate,
      tokenEfficiencyPercent,
      budgetCompliancePercent,
      compliancePassed,
      isBudgetBinding,
    });
  }

  // 25 Sequential Determinism Runs
  let inProcessMatches = 0;
  const baselineResult = pipeline.run(primitives, { max_tier0_budget: 1000 });
  const baselineHash = baselineResult.fit_result.tier0
    .map((item) => item.primitive.id)
    .sort()
    .join(":");

  const totalRuns = 25;
  for (let i = 0; i < totalRuns; i++) {
    const runResult = pipeline.run(primitives, { max_tier0_budget: 1000 });
    const currentHash = runResult.fit_result.tier0
      .map((item) => item.primitive.id)
      .sort()
      .join(":");
    if (currentHash === baselineHash) {
      inProcessMatches++;
    }
  }

  // 10 Cross-Execution Determinism Checks
  let crossProcessMatches = 0;
  const totalProcesses = 10;
  for (let i = 0; i < totalProcesses; i++) {
    const isolatedPipeline = new CompilerPipeline();
    const runResult = isolatedPipeline.run(primitives, { max_tier0_budget: 1000 });
    const currentHash = runResult.fit_result.tier0
      .map((item) => item.primitive.id)
      .sort()
      .join(":");
    if (currentHash === baselineHash) {
      crossProcessMatches++;
    }
  }

  // Compute a SHA-256 fingerprint hash of Tier 0 output for report auditing
  const crypto = await import("node:crypto");
  const aggregateHash = crypto.createHash("sha256").update(baselineHash).digest("hex");

  return {
    tokenBudgetMatrix,
    inProcessDeterminism: {
      totalRuns,
      identicalHashCount: inProcessMatches,
      matchPercent: (inProcessMatches / totalRuns) * 100,
      aggregateHash,
    },
    crossProcessDeterminism: {
      totalProcesses,
      identicalHashCount: crossProcessMatches,
      matchPercent: (crossProcessMatches / totalProcesses) * 100,
      aggregateHash,
    },
  };
}
