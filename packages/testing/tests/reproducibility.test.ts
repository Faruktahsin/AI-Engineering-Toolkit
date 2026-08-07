import { BuildOrchestrator } from "@aiet/compiler";
import { describe, expect, it } from "vitest";
import {
  getEdgeCaseProjectFixture,
  getLargeProjectFixture,
  getMediumProjectFixture,
  getSmallProjectFixture,
} from "../src/index";

describe("Bit-for-Bit Reproducibility Suite (ETB Task 5.2.3)", () => {
  const orchestrator = new BuildOrchestrator();

  it("should produce bit-for-bit identical output artifacts for Small Project fixture", () => {
    const smallFixture = getSmallProjectFixture();

    const build1 = orchestrator.build(smallFixture);
    const build2 = orchestrator.build(smallFixture);

    expect(build1.manifest.manifest_hash).toBe(build2.manifest.manifest_hash);
    expect(build1.manifest.source_aggregate_hash).toBe(build2.manifest.source_aggregate_hash);
    expect(build1.manifest.emitted_artifacts).toEqual(build2.manifest.emitted_artifacts);
  });

  it("should produce bit-for-bit identical output artifacts for Medium Project fixture", () => {
    const mediumFixture = getMediumProjectFixture();

    const build1 = orchestrator.build(mediumFixture);
    const build2 = orchestrator.build(mediumFixture);

    expect(build1.manifest.manifest_hash).toBe(build2.manifest.manifest_hash);
    expect(build1.manifest.source_aggregate_hash).toBe(build2.manifest.source_aggregate_hash);
    expect(build1.manifest.emitted_artifacts).toEqual(build2.manifest.emitted_artifacts);
  });

  it("should produce bit-for-bit identical output artifacts for Large Project fixture (100 primitives)", () => {
    const largeFixture = getLargeProjectFixture();

    const build1 = orchestrator.build(largeFixture);
    const build2 = orchestrator.build(largeFixture);

    expect(build1.manifest.manifest_hash).toBe(build2.manifest.manifest_hash);
    expect(build1.manifest.source_aggregate_hash).toBe(build2.manifest.source_aggregate_hash);
    expect(build1.manifest.emitted_artifacts).toEqual(build2.manifest.emitted_artifacts);
  });

  it("should produce bit-for-bit identical output artifacts for Edge-Case Project fixture", () => {
    const edgeCaseFixture = getEdgeCaseProjectFixture();

    const build1 = orchestrator.build(edgeCaseFixture);
    const build2 = orchestrator.build(edgeCaseFixture);

    expect(build1.manifest.manifest_hash).toBe(build2.manifest.manifest_hash);
    expect(build1.manifest.source_aggregate_hash).toBe(build2.manifest.source_aggregate_hash);
    expect(build1.manifest.emitted_artifacts).toEqual(build2.manifest.emitted_artifacts);
  });
});
