import { describe, expect, it } from "vitest";
import {
  AIETError,
  AIETErrorCode,
  PAKBError,
  deserializeError,
  serializeError,
} from "../src/index";

describe("@aiet/errors Package Unit Tests", () => {
  it("should construct AIETError with code, targetId, details, and cause", () => {
    const rootCause = new Error("Root database connection failed");
    const err = new AIETError("Failed to fetch entity", {
      code: AIETErrorCode.DATABASE_ACCESS_ERROR,
      targetId: "ent_01J4X89K9Z1A2B3C4D5E6F7G8H",
      details: { retryCount: 3 },
      cause: rootCause,
    });

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AIETError);
    expect(err.name).toBe("AIETError");
    expect(err.code).toBe(AIETErrorCode.DATABASE_ACCESS_ERROR);
    expect(err.target_id).toBe("ent_01J4X89K9Z1A2B3C4D5E6F7G8H");
    expect(err.details).toEqual({ retryCount: 3 });
    expect(err.cause).toBe(rootCause);
  });

  it("should preserve backwards compatibility for PAKBError", () => {
    const err = new PAKBError(
      "Schema validation error",
      AIETErrorCode.SCHEMA_VALIDATION_ERROR,
      "ent_123",
    );

    expect(err).toBeInstanceOf(AIETError);
    expect(err).toBeInstanceOf(PAKBError);
    expect(err.code).toBe(AIETErrorCode.SCHEMA_VALIDATION_ERROR);
  });

  it("should serialize and deserialize AIETError with cause chaining cleanly", () => {
    const causeErr = new AIETError("Underlying I/O error", {
      code: AIETErrorCode.INTERNAL_ERROR,
    });

    const parentErr = new AIETError("Storage write failure", {
      code: AIETErrorCode.DATABASE_ACCESS_ERROR,
      targetId: "ast_01J4X89K9Z1A2B3C4D5E6F7G8H",
      details: { table: "assertions" },
      cause: causeErr,
    });

    const serialized = serializeError(parentErr);
    expect(serialized.name).toBe("AIETError");
    expect(serialized.code).toBe(AIETErrorCode.DATABASE_ACCESS_ERROR);
    expect(serialized.cause?.message).toBe("Underlying I/O error");

    const deserialized = deserializeError(serialized);
    expect(deserialized).toBeInstanceOf(AIETError);
    expect(deserialized.code).toBe(AIETErrorCode.DATABASE_ACCESS_ERROR);
    expect(deserialized.target_id).toBe("ast_01J4X89K9Z1A2B3C4D5E6F7G8H");
    expect(deserialized.cause).toBeInstanceOf(AIETError);
    expect(deserialized.cause?.message).toBe("Underlying I/O error");
  });
});
