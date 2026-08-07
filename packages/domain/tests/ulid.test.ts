import { InvalidIDFormatError } from "@aiet/schema";
import { describe, expect, it } from "vitest";
import {
  type PrimitiveType,
  ULID_REGEX,
  generateULID,
  getPrimitivePrefix,
  validateULID,
} from "../src/index";

describe("Prefixed Base32 ULID Generator (ETB Task 2.2.1)", () => {
  const primitiveTypes: PrimitiveType[] = ["entity", "directive", "assertion", "event", "relation"];

  it("should return the correct prefix for each primitive type", () => {
    expect(getPrimitivePrefix("entity")).toBe("ent_");
    expect(getPrimitivePrefix("directive")).toBe("dir_");
    expect(getPrimitivePrefix("assertion")).toBe("ast_");
    expect(getPrimitivePrefix("event")).toBe("evt_");
    expect(getPrimitivePrefix("relation")).toBe("rel_");
  });

  it("should throw InvalidIDFormatError for unknown primitive types", () => {
    expect(() => getPrimitivePrefix("unknown" as PrimitiveType)).toThrow(InvalidIDFormatError);
  });

  it("should generate valid ULIDs matching regex for all primitive types", () => {
    for (const type of primitiveTypes) {
      const id = generateULID(type);
      expect(id).toMatch(ULID_REGEX);
      expect(id.length).toBe(30);
      expect(validateULID(id)).toBe(true);
    }
  });

  it("should validate valid ULIDs and normalize lowercase body inputs", () => {
    const validId = "ent_01J4X89K9Z1A2B3C4D5E6F7G8H";
    expect(validateULID(validId)).toBe(true);

    const lowercaseId = "ent_01j4x89k9z1a2b3c4d5e6f7g8h";
    expect(validateULID(lowercaseId)).toBe(true);
  });

  it("should reject invalid IDs", () => {
    expect(validateULID("")).toBe(false);
    expect(validateULID("ent_123")).toBe(false); // Too short
    expect(validateULID("invalid_01J4X89K9Z1A2B3C4D5E6F7G8H")).toBe(false); // Wrong prefix
    expect(validateULID("ENT_01J4X89K9Z1A2B3C4D5E6F7G8H")).toBe(false); // Uppercase prefix
    expect(validateULID("ent_01J4X89K9Z1A2B3C4D5E6F7G8I")).toBe(false); // 'I' is not valid Crockford Base32
    expect(validateULID("ent_01J4X89K9Z1A2B3C4D5E6F7G8L")).toBe(false); // 'L' is not valid Crockford Base32
    expect(validateULID("ent_01J4X89K9Z1A2B3C4D5E6F7G8O")).toBe(false); // 'O' is not valid Crockford Base32
    expect(validateULID("ent_01J4X89K9Z1A2B3C4D5E6F7G8U")).toBe(false); // 'U' is not valid Crockford Base32
    expect(validateULID("ent_01J4X89K9Z1A2B3C4D5E6F7G8H9")).toBe(false); // 27 chars body
  });

  it("should generate 1000 unique IDs without any collision", () => {
    const generatedIds = new Set<string>();
    const count = 1000;

    for (let i = 0; i < count; i++) {
      const type = primitiveTypes[i % primitiveTypes.length] ?? "entity";
      const id = generateULID(type);
      expect(generatedIds.has(id)).toBe(false);
      generatedIds.add(id);
    }

    expect(generatedIds.size).toBe(count);
  });
});
