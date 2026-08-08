import { describe, expect, it } from "vitest";
import { PersonalAssistantAgent } from "../src/agent.js";

describe("Personal Assistant Agent Demo Suite", () => {
  it("should handle preferences, tasks, OpenAI agent tools, and memory explainability", async () => {
    const assistant = new PersonalAssistantAgent();

    expect(Object.keys(assistant.agentTools).length).toBeGreaterThan(0);

    const prefId = await assistant.savePreference("Prefer concise bulleted responses");
    expect(prefId).toMatch(/^dir_/);

    const taskId = await assistant.saveTask("Review PR #104 for security checks");
    expect(taskId).toMatch(/^ast_/);

    const explanations = await assistant.explainMemory("concise");
    expect(explanations.length).toBeGreaterThan(0);
    expect(explanations[0]?.explanation).toContain("AIET Hybrid RRF Search");
  });
});
