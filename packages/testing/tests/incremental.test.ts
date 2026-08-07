import { BuildOrchestrator } from "@aiet/compiler";
import { ActivationClass, EntityType, SensitivityTier, VolatilityRating } from "@aiet/schema";
import { describe, expect, it } from "vitest";
import { getMediumProjectFixture } from "../src/index";

describe("Incremental Build & Cache Invalidation Suite (ETB Task 5.2.3)", () => {
  const orchestrator = new BuildOrchestrator();

  it("should complete initial build and mark subsequent build with identical inputs as UP_TO_DATE", () => {
    const fixture = getMediumProjectFixture();

    const build1 = orchestrator.build(fixture);
    expect(build1.status).toBe("COMPLETED");
    expect(build1.is_incremental).toBe(false);

    // Incremental build with prior manifest
    const build2 = orchestrator.build(fixture, undefined, build1.manifest);
    expect(build2.status).toBe("UP_TO_DATE");
    expect(build2.is_incremental).toBe(true);
  });

  it("should re-trigger full compilation when a primitive statement is modified", () => {
    const fixture = getMediumProjectFixture();
    const build1 = orchestrator.build(fixture);

    // Modify a primitive statement
    const modifiedFixture = JSON.parse(JSON.stringify(fixture));
    modifiedFixture[1].statement = "Modified directive statement for incremental test.";

    const build2 = orchestrator.build(modifiedFixture, undefined, build1.manifest);

    expect(build2.status).toBe("COMPLETED"); // Re-compiled
    expect(build2.is_incremental).toBe(false);
    expect(build2.manifest.manifest_hash).not.toBe(build1.manifest.manifest_hash);
  });

  it("should re-trigger full compilation when budget configuration changes", () => {
    const fixture = getMediumProjectFixture();
    const build1 = orchestrator.build(fixture, { max_tier0_budget: 500 });

    // Change budget option
    const build2 = orchestrator.build(fixture, { max_tier0_budget: 200 }, build1.manifest);

    expect(build2.status).toBe("COMPLETED");
    expect(build2.is_incremental).toBe(false);
  });

  it("should re-trigger full compilation when a primitive is deleted", () => {
    const fixture = getMediumProjectFixture();
    const build1 = orchestrator.build(fixture);

    // Delete one primitive
    const reducedFixture = fixture.slice(0, fixture.length - 1);

    const build2 = orchestrator.build(reducedFixture, undefined, build1.manifest);

    expect(build2.status).toBe("COMPLETED");
    expect(build2.is_incremental).toBe(false);
  });

  it("should re-trigger full compilation when a new primitive is added", () => {
    const fixture = getMediumProjectFixture();
    const build1 = orchestrator.build(fixture);

    // Add new primitive
    const expandedFixture = [
      ...fixture,
      {
        schema_version: "1.0.0",
        id: "ent_99999999999999999999999999",
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ON_DEMAND,
        name: "New Workstream",
        type: EntityType.WORKSTREAM,
      },
    ];

    const build2 = orchestrator.build(expandedFixture, undefined, build1.manifest);

    expect(build2.status).toBe("COMPLETED");
    expect(build2.is_incremental).toBe(false);
  });
});
