import { describe, expect, it } from "vitest";
import { AIETError, CompilerPipeline, PAKBMCPServer, PAKBStorageRepository } from "../src";

describe("@aiet/pakb Subsystem Alias", () => {
  it("should re-export core SDK primitives cleanly", () => {
    expect(AIETError).toBeDefined();
    expect(PAKBStorageRepository).toBeDefined();
    expect(CompilerPipeline).toBeDefined();
    expect(PAKBMCPServer).toBeDefined();
  });
});
