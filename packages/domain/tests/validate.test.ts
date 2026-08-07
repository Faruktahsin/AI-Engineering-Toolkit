import {
  ActivationClass,
  AssertionType,
  EnforcementSeverity,
  EntityType,
  EvidenceType,
  PAKBErrorCode,
  SchemaValidationError,
  SensitivityTier,
  VolatilityRating,
} from "@aiet/schema";
import { describe, expect, it } from "vitest";
import { createValidator, generateULID, validateOrThrow, validatePrimitive } from "../src/index";

describe("In-Memory Schema Validation Engine (ETB Task 2.2.3)", () => {
  it("should create a singleton validator function", () => {
    const validator1 = createValidator();
    const validator2 = createValidator();

    expect(validator1).toBeDefined();
    expect(validator1).toBe(validator2); // Singleton check
  });

  it("should validate a valid Entity primitive payload", () => {
    const validEntity = {
      schema_version: "1.0.0",
      id: generateULID("entity"),
      created_at: "2026-08-05T12:00:00Z",
      updated_at: "2026-08-05T12:00:00Z",
      last_verified: "2026-08-05T12:00:00Z",
      sensitivity: SensitivityTier.INTERNAL,
      volatility: VolatilityRating.LOW,
      activation: ActivationClass.ON_DEMAND,
      name: "AI Engineering Toolkit",
      type: EntityType.WORKSTREAM,
    };

    const result = validatePrimitive(validEntity);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);

    const validated = validateOrThrow(validEntity);
    expect(validated).toEqual(validEntity);
  });

  it("should validate a valid Directive primitive payload", () => {
    const validDirective = {
      schema_version: "1.0.0",
      id: generateULID("directive"),
      created_at: "2026-08-05T12:00:00Z",
      updated_at: "2026-08-05T12:00:00Z",
      last_verified: "2026-08-05T12:00:00Z",
      sensitivity: SensitivityTier.PUBLIC,
      volatility: VolatilityRating.LOW,
      activation: ActivationClass.ALWAYS_ON,
      statement: "Always enforce strict type checking.",
      enforcement: EnforcementSeverity.HARD,
      domain: "security",
    };

    const result = validatePrimitive(validDirective);
    expect(result.valid).toBe(true);
  });

  it("should validate a valid Assertion primitive payload", () => {
    const validAssertion = {
      schema_version: "1.0.0",
      id: generateULID("assertion"),
      created_at: "2026-08-05T12:00:00Z",
      updated_at: "2026-08-05T12:00:00Z",
      last_verified: "2026-08-05T12:00:00Z",
      sensitivity: SensitivityTier.INTERNAL,
      volatility: VolatilityRating.INVARIANT,
      activation: ActivationClass.ON_DEMAND,
      claim: "SQLite WAL mode enables atomic concurrent reads.",
      evidence_type: EvidenceType.OBSERVED,
      type: AssertionType.FACT,
    };

    const result = validatePrimitive(validAssertion);
    expect(result.valid).toBe(true);
  });

  it("should validate a valid Relation primitive payload", () => {
    const validRelation = {
      schema_version: "1.0.0",
      id: generateULID("relation"),
      created_at: "2026-08-05T12:00:00Z",
      updated_at: "2026-08-05T12:00:00Z",
      last_verified: "2026-08-05T12:00:00Z",
      sensitivity: SensitivityTier.PUBLIC,
      volatility: VolatilityRating.LOW,
      activation: ActivationClass.ON_DEMAND,
      source_id: generateULID("directive"),
      target_id: generateULID("entity"),
      predicate: "governs",
    };

    const result = validatePrimitive(validRelation);
    expect(result.valid).toBe(true);
  });

  it("should reject payloads with additional un-spec'd properties (additionalProperties: false)", () => {
    const invalidEntity = {
      schema_version: "1.0.0",
      id: generateULID("entity"),
      created_at: "2026-08-05T12:00:00Z",
      updated_at: "2026-08-05T12:00:00Z",
      last_verified: "2026-08-05T12:00:00Z",
      sensitivity: SensitivityTier.INTERNAL,
      volatility: VolatilityRating.LOW,
      activation: ActivationClass.ON_DEMAND,
      name: "AI Engineering Toolkit",
      type: EntityType.WORKSTREAM,
      unsupported_extra_field: "invalid",
    };

    const result = validatePrimitive(invalidEntity);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.constraint_type).toBe("additionalProperties");
  });

  it("should reject invalid ISO 8601 UTC timestamps", () => {
    const invalidTimestampEntity = {
      schema_version: "1.0.0",
      id: generateULID("entity"),
      created_at: "2026-08-05T12:00:00.000Z", // Fractional seconds violate ADR-001 §3.1
      updated_at: "2026-08-05T12:00:00Z",
      last_verified: "2026-08-05T12:00:00Z",
      sensitivity: SensitivityTier.INTERNAL,
      volatility: VolatilityRating.LOW,
      activation: ActivationClass.ON_DEMAND,
      name: "AI Engineering Toolkit",
      type: EntityType.WORKSTREAM,
    };

    const result = validatePrimitive(invalidTimestampEntity);
    expect(result.valid).toBe(false);
  });

  it("should throw SchemaValidationError on validateOrThrow with invalid payload", () => {
    const invalidPayload = { invalid: "data" };

    expect(() => validateOrThrow(invalidPayload)).toThrow(SchemaValidationError);

    try {
      validateOrThrow(invalidPayload);
    } catch (err) {
      expect(err).toBeInstanceOf(SchemaValidationError);
      const schemaErr = err as SchemaValidationError;
      expect(schemaErr.code).toBe(PAKBErrorCode.SCHEMA_VALIDATION_ERROR);
      expect(schemaErr.details).toHaveProperty("errors");
    }
  });

  it("should enforce ADR-005 metadata scope restrictions prohibiting ID patterns in metadata keys", () => {
    const invalidMetadataEntity = {
      schema_version: "1.0.0",
      id: generateULID("entity"),
      created_at: "2026-08-05T12:00:00Z",
      updated_at: "2026-08-05T12:00:00Z",
      last_verified: "2026-08-05T12:00:00Z",
      sensitivity: SensitivityTier.INTERNAL,
      volatility: VolatilityRating.LOW,
      activation: ActivationClass.ON_DEMAND,
      name: "AI Engineering Toolkit",
      type: EntityType.WORKSTREAM,
      metadata: {
        scoped_entity_id: "ent_01J4X89K9Z1A2B3C4D5E6F7G8H", // Prohibited key
      },
    };

    const result = validatePrimitive(invalidMetadataEntity);
    expect(result.valid).toBe(false);
  });
});
