import { describe, expect, it } from "vitest";
import {
  AIETError,
  CompilerPipeline,
  PAKBErrorCode,
  PAKBMCPServer,
  PAKBStorageRepository,
  containsSecrets,
} from "../src";

describe("@aiet/core SDK Entrypoint", () => {
  it("should export schema, domain, storage, compiler, mcp, and error primitives", () => {
    expect(AIETError).toBeDefined();
    expect(PAKBErrorCode).toBeDefined();
    expect(containsSecrets).toBeDefined();
    expect(PAKBStorageRepository).toBeDefined();
    expect(CompilerPipeline).toBeDefined();
    expect(PAKBMCPServer).toBeDefined();
  });
});
