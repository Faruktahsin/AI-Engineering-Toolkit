import { describe, expect, it } from "vitest";
import { ResearchAgent } from "../src/agent.js";

describe("Research Agent Demo Suite", () => {
  it("should record findings, detect contradictions, and save state checkpoints", async () => {
    const agent = new ResearchAgent();

    const factId = await agent.recordFinding(
      "Initial paper finding: Accuracy is 92%",
      "source_paper.pdf",
    );
    expect(factId).toMatch(/^ast_/);

    const result = await agent.consolidateFindings(
      "Updated finding: Accuracy is 98% with ensemble model",
      factId,
    );
    expect(["supersede", "coexist", "merge"]).toContain(result.action);

    await agent.saveCheckpoint("test_thread", 1, { status: "researching" });
    const check = await agent.checkpointer.get("test_thread");
    expect(check.length).toBeGreaterThan(0);
  });
});
