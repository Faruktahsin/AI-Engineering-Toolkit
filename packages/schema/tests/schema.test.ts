import { describe, expect, it } from "vitest";
import {
  ActivationClass,
  ArtifactEmissionError,
  AssertionType,
  DatabaseAccessError,
  EmitterFormattingError,
  EnforcementSeverity,
  EntityType,
  EvidenceType,
  IDCollisionError,
  PAKBErrorCode,
  PAKB_JSON_SCHEMA,
  PAKB_SCHEMA_VERSION,
  SensitivityTier,
  VolatilityRating,
} from "../src/index";

describe("@aiet/schema package exports", () => {
  it("should export the correct version constants", () => {
    expect(PAKB_SCHEMA_VERSION).toBe("1.0.0");
  });

  it("should export a valid JSON Schema object with $defs", () => {
    expect(PAKB_JSON_SCHEMA).toBeDefined();
    expect(PAKB_JSON_SCHEMA.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(PAKB_JSON_SCHEMA.$defs).toBeDefined();
    expect(PAKB_JSON_SCHEMA.$defs.Entity).toBeDefined();
    expect(PAKB_JSON_SCHEMA.$defs.Directive).toBeDefined();
    expect(PAKB_JSON_SCHEMA.$defs.Assertion).toBeDefined();
    expect(PAKB_JSON_SCHEMA.$defs.Event).toBeDefined();
    expect(PAKB_JSON_SCHEMA.$defs.Relation).toBeDefined();
  });

  it("should export all error classes with code properties", () => {
    const error = new IDCollisionError(
      "ID Collision Detected",
      PAKBErrorCode.ID_COLLISION_ERROR,
      "ent_01J4X89K9Z1A2B3C4D5E6F7G8H",
    );
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(IDCollisionError);
    expect(error.code).toBe(PAKBErrorCode.ID_COLLISION_ERROR);
    expect(error.target_id).toBe("ent_01J4X89K9Z1A2B3C4D5E6F7G8H");

    const dbError = new DatabaseAccessError("DB Access Error", PAKBErrorCode.DATABASE_ACCESS_ERROR);
    expect(dbError).toBeInstanceOf(DatabaseAccessError);
    expect(dbError.code).toBe(PAKBErrorCode.DATABASE_ACCESS_ERROR);

    const emitterError = new EmitterFormattingError(
      "Emitter Formatting Error",
      PAKBErrorCode.EMITTER_FORMATTING_ERROR,
    );
    expect(emitterError).toBeInstanceOf(EmitterFormattingError);
    expect(emitterError.code).toBe(PAKBErrorCode.EMITTER_FORMATTING_ERROR);

    const artifactError = new ArtifactEmissionError(
      "Artifact Emission Error",
      PAKBErrorCode.ARTIFACT_EMISSION_ERROR,
    );
    expect(artifactError).toBeInstanceOf(ArtifactEmissionError);
    expect(artifactError.code).toBe(PAKBErrorCode.ARTIFACT_EMISSION_ERROR);
  });

  it("should export enums with exact string values matching API Contracts v1.0", () => {
    expect(SensitivityTier.PUBLIC).toBe("public");
    expect(SensitivityTier.RESTRICTED).toBe("restricted");
    expect(VolatilityRating.INVARIANT).toBe("invariant");
    expect(ActivationClass.ALWAYS_ON).toBe("always_on");
    expect(EvidenceType.OBSERVED).toBe("observed");
    expect(EnforcementSeverity.HARD).toBe("hard");
    expect(EntityType.OWNER).toBe("owner");
    expect(AssertionType.DECISION_ADR).toBe("decision_adr");
  });
});
