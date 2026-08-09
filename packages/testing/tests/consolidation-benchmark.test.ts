import { describe, expect, it } from "vitest";
import type { GroundTruthDatasetSchema } from "../src/benchmarks/datasets/dataset-types";
import { runConsolidationHarness } from "../src/benchmarks/harnesses/consolidation-harness";

describe("consolidation benchmark", () => {
  it("keeps conflict recall while rejecting cross-domain preference false positives", async () => {
    const result = await runConsolidationHarness({} as GroundTruthDatasetSchema);

    expect(result.recallPercent).toBe(100);
    expect(result.precisionPercent).toBeGreaterThanOrEqual(90);
    expect(result.falsePositives).toBeLessThanOrEqual(2);
  });
});
