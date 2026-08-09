import fs from "node:fs";
import path from "node:path";
import { ContradictionDetector } from "@aiet/consolidation";
import type { AnyPrimitive } from "@aiet/schema";
import { describe, expect, it } from "vitest";

interface Scenario {
  readonly id: string;
  readonly category: string;
  readonly primitive_a: Record<string, unknown>;
  readonly primitive_b: Record<string, unknown>;
  readonly expected_contradiction: boolean;
  readonly description: string;
}

function loadScenarios(): Scenario[] {
  const fixturePath = path.resolve(__dirname, "../fixtures/consolidation-scenarios.json");
  const raw = fs.readFileSync(fixturePath, "utf8");
  return JSON.parse(raw) as Scenario[];
}

function preparePrimitive(data: Record<string, unknown>): AnyPrimitive {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  return {
    schema_version: "1.0.0",
    created_at: now,
    updated_at: now,
    last_verified: now,
    sensitivity: "public",
    volatility: "low",
    activation: "always_on",
    ...data,
  } as unknown as AnyPrimitive;
}

describe("P1.3 Consolidation Generalization & Contradiction Benchmark (36 Scenarios)", () => {
  it("should evaluate generalization benchmark dataset and compute confusion matrix (TP, FP, FN, TN, Precision, Recall)", () => {
    const scenarios = loadScenarios();
    expect(scenarios.length).toBeGreaterThanOrEqual(35);

    const detector = new ContradictionDetector();

    let tp = 0;
    let fp = 0;
    let fn = 0;
    let tn = 0;

    const categoryStats: Record<
      string,
      { total: number; tp: number; fp: number; fn: number; tn: number }
    > = {};

    for (const scenario of scenarios) {
      const p1 = preparePrimitive(scenario.primitive_a);
      const p2 = preparePrimitive(scenario.primitive_b);

      const detected = detector.findContradictions([p1, p2]).length > 0;
      const expected = scenario.expected_contradiction;

      let cat = categoryStats[scenario.category];
      if (!cat) {
        cat = { total: 0, tp: 0, fp: 0, fn: 0, tn: 0 };
        categoryStats[scenario.category] = cat;
      }

      cat.total++;

      if (expected && detected) {
        tp++;
        cat.tp++;
      } else if (!expected && detected) {
        fp++;
        cat.fp++;
      } else if (expected && !detected) {
        fn++;
        cat.fn++;
      } else {
        tn++;
        cat.tn++;
      }
    }

    const total = scenarios.length;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const accuracy = (tp + tn) / total;
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    console.log("\n=================================================================");
    console.log("  P1.3 CONSOLIDATION GENERALIZATION BENCHMARK RESULTS (36 SCENARIOS)  ");
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

    console.log("\n--- Category Breakdown ---");
    console.table(
      Object.entries(categoryStats).reduce(
        (acc, [cat, stats]) => {
          const catPrecision = stats.tp + stats.fp > 0 ? stats.tp / (stats.tp + stats.fp) : 1;
          const catRecall = stats.tp + stats.fn > 0 ? stats.tp / (stats.tp + stats.fn) : 0;
          acc[cat] = {
            Total: stats.total,
            TP: stats.tp,
            FP: stats.fp,
            FN: stats.fn,
            TN: stats.tn,
            Precision: `${(catPrecision * 100).toFixed(0)}%`,
            Recall: `${(catRecall * 100).toFixed(0)}%`,
          };
          return acc;
        },
        {} as Record<string, Record<string, string | number>>,
      ),
    );
    console.log("=================================================================\n");

    // Baseline validation assertion: guarantee zero False Positives (zero unvetted mutations)
    expect(fp).toBe(0);
    // Guarantee minimum dataset evaluation coverage
    expect(total).toBe(36);
  });
});
