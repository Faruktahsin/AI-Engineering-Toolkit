import { describe, expect, it } from "vitest";
import { CodingAgent } from "../src/agent.js";

describe("Coding Agent Demo Suite", () => {
  it("should remember developer preferences and compile context", async () => {
    const agent = new CodingAgent();

    const prefId = await agent.rememberPreference(
      "Prefer functional programming style with pure functions",
    );
    expect(prefId).toMatch(/^dir_/);

    const factId = await agent.rememberArchitectureDecision(
      "Project uses SQLite WAL local database",
    );
    expect(factId).toMatch(/^ast_/);

    const result = await agent.processPrompt("functional programming");
    expect(result.retrievedMemories.length).toBeGreaterThan(0);
    expect(result.compiledContext).toContain("AGENTS.md");
  });
});
