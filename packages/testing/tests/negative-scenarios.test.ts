import { PAKBCLI } from "@aiet/cli";
import { CompilerPipeline } from "@aiet/compiler";
import { generateULID } from "@aiet/domain";
import {
  ActivationClass,
  AssertionType,
  EnforcementSeverity,
  EntityType,
  EvidenceType,
  IDCollisionError,
  PreambleBudgetExceededError,
  SchemaValidationError,
  SensitivityTier,
  VolatilityRating,
} from "@aiet/schema";
import { describe, expect, it } from "vitest";
import { getSmallProjectFixture } from "../src/index";

describe("Negative Scenarios & Failure Mode Test Suite (ETB Task 5.2.3)", () => {
  const pipeline = new CompilerPipeline();

  it("should throw IDCollisionError on duplicate primitive IDs", () => {
    const fixture = getSmallProjectFixture();
    const first = fixture[0];
    expect(first).toBeDefined();
    if (!first) throw new Error("First fixture missing");
    const duplicate = [first, first];

    expect(() => pipeline.run(duplicate)).toThrow(IDCollisionError);
  });

  it("should throw SchemaValidationError on invalid primitive schema", () => {
    const invalidPrimitive = {
      schema_version: "1.0.0",
      id: generateULID("entity"),
      invalid_extra_field: "illegal_value",
    };

    expect(() => pipeline.run([invalidPrimitive as unknown as AnyPrimitive])).toThrow(
      SchemaValidationError,
    );
  });

  it("should throw SchemaValidationError on invalid ISO 8601 UTC timestamp format", () => {
    const invalidTimestampEntity = {
      schema_version: "1.0.0",
      id: generateULID("entity"),
      created_at: "2026-08-05T12:00:00.000Z", // Fractional seconds prohibited per ADR-001 §3.1
      updated_at: "2026-08-05T12:00:00Z",
      last_verified: "2026-08-05T12:00:00Z",
      sensitivity: SensitivityTier.PUBLIC,
      volatility: VolatilityRating.LOW,
      activation: ActivationClass.ALWAYS_ON,
      name: "Owner",
      type: EntityType.OWNER,
    };

    expect(() => pipeline.run([invalidTimestampEntity])).toThrow(SchemaValidationError);
  });

  it("should filter out restricted sensitivity primitives from generated instruction outputs", () => {
    const restrictedAssertion = {
      schema_version: "1.0.0",
      id: generateULID("assertion"),
      created_at: "2026-08-05T12:00:00Z",
      updated_at: "2026-08-05T12:00:00Z",
      last_verified: "2026-08-05T12:00:00Z",
      sensitivity: SensitivityTier.RESTRICTED,
      volatility: VolatilityRating.INVARIANT,
      activation: ActivationClass.RESTRICTED,
      claim: "Secret vault keys.",
      evidence_type: EvidenceType.STATED,
      type: AssertionType.CREDENTIAL_REFERENCE,
    };

    const result = pipeline.run([restrictedAssertion]);
    expect(result.filtered_count).toBe(0); // Restricted item filtered out completely
  });

  it("should throw PreambleBudgetExceededError if hard constraint directive exceeds max budget", () => {
    const largeHardDirective = {
      schema_version: "1.0.0",
      id: generateULID("directive"),
      created_at: "2026-08-05T12:00:00Z",
      updated_at: "2026-08-05T12:00:00Z",
      last_verified: "2026-08-05T12:00:00Z",
      sensitivity: SensitivityTier.PUBLIC,
      volatility: VolatilityRating.LOW,
      activation: ActivationClass.ALWAYS_ON,
      statement: new Array(1024).fill("x").join(" "), // large, valid directive text to exceed budget
      enforcement: EnforcementSeverity.HARD,
      domain: "security",
    };

    expect(() => pipeline.run([largeHardDirective], { max_tier0_budget: 500 })).toThrow(
      PreambleBudgetExceededError,
    );
  });

  it("should return CLI exit code 2 on configuration error", async () => {
    const cli = new PAKBCLI();
    const result = await cli.compile({
      config: "/non_existent/path/pakb.config.json",
    });

    expect(result.exitCode).toBe(2);
    expect(result.message).toContain("[CONFIG ERROR]");
  });

  it("should return CLI exit code 3 on filesystem error", async () => {
    const cli = new PAKBCLI();
    const result = await cli.compile({
      input: "/non_existent/path/primitives_folder",
    });

    expect(result.exitCode).toBe(3);
    expect(result.message).toContain("[FILESYSTEM ERROR]");
  });
});
