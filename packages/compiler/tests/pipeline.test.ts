import type { AnyPrimitive } from "@aiet/schema";
import { describe, expect, it } from "vitest";
import { CompilerPipeline } from "../src/pipeline";

describe("CompilerPipeline", () => {
  const basePrimitive: AnyPrimitive = {
    id: "ent_01H00000000000000000000001",
    schema_version: "1.0.0",
    type: "organization",
    name: "System",
    description: "System entity",
    sensitivity: "public",
    volatility: "low",
    activation: "always_on",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    last_verified: "2026-01-01T00:00:00Z",
  } as unknown as AnyPrimitive;

  const basePrimitive2: AnyPrimitive = {
    ...basePrimitive,
    id: "ent_01H00000000000000000000002",
    name: "System 2",
    description: "Another system entity",
  } as unknown as AnyPrimitive;

  it("identical input yields identical source_aggregate_hash", () => {
    const pipeline = new CompilerPipeline();
    const result1 = pipeline.run([basePrimitive, basePrimitive2]);
    const result2 = pipeline.run([basePrimitive2, basePrimitive]); // Different order

    const manifest1 = JSON.parse(result1.emitted_artifacts["manifest.json"].content);
    const manifest2 = JSON.parse(result2.emitted_artifacts["manifest.json"].content);

    expect(manifest1.source_aggregate_hash).toBe(manifest2.source_aggregate_hash);
  });

  it("same IDs but changed primitive content changes source_aggregate_hash", () => {
    const pipeline = new CompilerPipeline();
    const result1 = pipeline.run([basePrimitive]);

    const changedPrimitive = { ...basePrimitive, description: "Changed description" };
    const result2 = pipeline.run([changedPrimitive]);

    const manifest1 = JSON.parse(result1.emitted_artifacts["manifest.json"].content);
    const manifest2 = JSON.parse(result2.emitted_artifacts["manifest.json"].content);

    expect(manifest1.source_aggregate_hash).not.toBe(manifest2.source_aggregate_hash);
  });

  it("primitives that get dropped by budget constraints still affect the source_aggregate_hash", () => {
    const pipeline = new CompilerPipeline();

    // Create a very large primitive that will blow past the budget
    const largePrimitive: AnyPrimitive = {
      id: "dir_01H00000000000000000000003",
      schema_version: "1.0.0",
      statement: "A".repeat(1000),
      enforcement: "soft",
      domain: "global_style",
      sensitivity: "public",
      volatility: "low",
      activation: "always_on",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      last_verified: "2026-01-01T00:00:00Z",
    } as unknown as AnyPrimitive;

    const resultWithDrop = pipeline.run([basePrimitive, largePrimitive], { max_tier0_budget: 50 });

    // Verify largePrimitive was dropped from tier0
    expect(resultWithDrop.fitted_count).toBe(1);
    expect(resultWithDrop.fit_result.tier1.length).toBe(1); // Soft directive demoted to Tier 1

    const resultWithoutDrop = pipeline.run([basePrimitive]);

    // Despite being dropped, it should still affect the source_aggregate_hash
    const manifest1 = JSON.parse(resultWithDrop.emitted_artifacts["manifest.json"].content);
    const manifest2 = JSON.parse(resultWithoutDrop.emitted_artifacts["manifest.json"].content);

    expect(manifest1.source_aggregate_hash).not.toBe(manifest2.source_aggregate_hash);
  });
});
