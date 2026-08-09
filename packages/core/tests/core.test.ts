import { describe, expect, it } from "vitest";
import {
  AIETError,
  AIETErrorCode,
  AIETStorageRepository,
  CompilerPipeline,
  PAKBErrorCode,
  PAKBMCPServer,
  PAKBStorageRepository,
  containsSecrets,
  createAIET,
} from "../src";

describe("@aiet/core SDK Entrypoint & Compatibility", () => {
  it("should export both new AIET-native symbols and legacy PAKB compatibility aliases", () => {
    expect(AIETError).toBeDefined();
    expect(AIETErrorCode).toBeDefined();
    expect(PAKBErrorCode).toBeDefined();
    expect(AIETErrorCode).toBe(PAKBErrorCode);

    expect(AIETStorageRepository).toBeDefined();
    expect(PAKBStorageRepository).toBeDefined();
    expect(PAKBStorageRepository).toBe(AIETStorageRepository);

    expect(CompilerPipeline).toBeDefined();
    expect(PAKBMCPServer).toBeDefined();
    expect(containsSecrets).toBeDefined();
    expect(createAIET).toBeDefined();
  });
});
