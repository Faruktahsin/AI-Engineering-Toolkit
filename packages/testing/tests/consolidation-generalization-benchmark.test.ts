import fs from "node:fs";
import path from "node:path";
import { ContradictionDetector } from "@aiet/consolidation";
import type { AnyPrimitive, Assertion, Directive, Entity } from "@aiet/schema";
import { describe, expect, it } from "vitest";

interface Scenario {
  readonly id: string;
  readonly category: string;
  readonly primitive_a: Record<string, unknown>;
  readonly primitive_b: Record<string, unknown>;
  readonly expected_contradiction: boolean;
  readonly description: string;
}

interface Dataset {
  readonly supported_rule_controls: Scenario[];
  readonly generalization_challenges: Scenario[];
}

function loadScenarios(): Dataset {
  const fixturePath = path.resolve(__dirname, "../fixtures/consolidation-scenarios.json");
  const raw = fs.readFileSync(fixturePath, "utf8");
  return JSON.parse(raw) as Dataset;
}

function preparePrimitive(data: Record<string, unknown>): AnyPrimitive {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  // Safe typed adapter that matches actual known primitive types
  const base = {
    id: typeof data.id === "string" ? data.id : "test_id",
    schema_version: "1.0.0" as const,
    created_at: typeof data.created_at === "string" ? data.created_at : now,
    updated_at: now,
    last_verified: now,
    sensitivity: "public" as const,
    volatility: "low" as const,
    activation: "always_on" as const,
    tags: [],
    metadata: {},
  };

  if ("statement" in data) {
    return {
      ...base,
      statement: String(data.statement),
      enforcement: "hard_rule",
      domain: "domain" in data ? String(data.domain) : "general",
    } satisfies Directive;
  }

  if ("claim" in data) {
    return {
      ...base,
      claim: String(data.claim),
      evidence_type: "user_provided",
      type: "fact",
    } satisfies Assertion;
  }

  if ("name" in data) {
    return {
      ...base,
      name: String(data.name),
      type: "system",
      description: "summary" in data ? String(data.summary) : "",
    } satisfies Entity;
  }

  throw new Error(`Unsupported fixture primitive structure: ${JSON.stringify(data)}`);
}

function evaluateSubset(name: string, scenarios: Scenario[]) {
  const detector = new ContradictionDetector();

  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;

  for (const scenario of scenarios) {
    const p1 = preparePrimitive(scenario.primitive_a);
    const p2 = preparePrimitive(scenario.primitive_b);

    const detected = detector.findContradictions([p1, p2]).length > 0;
    const expected = scenario.expected_contradiction;

    if (expected && detected) {
      tp++;
    } else if (!expected && detected) {
      fp++;
      console.error(
        `FP detected in ${scenario.id}: expected ${expected}, got ${detected}. p1=${scenario.primitive_a.statement}, p2=${scenario.primitive_b.statement}`,
      );
    } else if (expected && !detected) {
      fn++;
      console.error(
        `FN detected in ${scenario.id}: expected ${expected}, got ${detected}. p1=${scenario.primitive_a.statement}, p2=${scenario.primitive_b.statement}`,
      );
    } else {
      tn++;
    }
  }

  const total = scenarios.length;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const accuracy = total > 0 ? (tp + tn) / total : 1;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  console.log("\n=================================================================");
  console.log(`  P1.3 BENCHMARK RESULTS: ${name.toUpperCase()} (${total} SCENARIOS)  `);
  console.log("=================================================================");
  console.table({
    "Total Scenarios": total,
    "True Positives (TP)": tp,
    "False Positives (FP)": fp,
    "False Negatives (FN)": fn,
    "True Negatives (TN)": tn,
    Precision: `${(precision * 100).toFixed(1)}%`,
    Recall: `${(recall * 100).toFixed(1)}%`,
    Accuracy: `${(accuracy * 100).toFixed(1)}%`,
    "F1-Score": f1Score.toFixed(3),
  });

  return { tp, fp, fn, tn, total };
}

describe("P1.3 Consolidation Generalization & Contradiction Benchmark", () => {
  it("should evaluate generalization benchmark dataset in explicit subsets", () => {
    const dataset = loadScenarios();

    // Evaluate Supported Rule Controls
    const controls = evaluateSubset("Supported Rule Controls", dataset.supported_rule_controls);

    // Assert exact durable baseline for supported rules
    expect(controls.total).toBe(5);
    expect(controls.tp).toBe(3);
    expect(controls.fp).toBe(0);
    expect(controls.fn).toBe(0);
    expect(controls.tn).toBe(2);

    // Evaluate Generalization Challenges
    const challenges = evaluateSubset(
      "Generalization Challenges",
      dataset.generalization_challenges,
    );

    // Assert exact durable baseline for future algorithm improvements
    expect(challenges.total).toBe(36);
    expect(challenges.tp).toBe(0);
    expect(challenges.fp).toBe(0);
    expect(challenges.fn).toBe(20);
    expect(challenges.tn).toBe(16);
  });
});
