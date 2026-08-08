import { createAIET } from "@aiet/core";
import {
  ActivationClass,
  EnforcementSeverity,
  SensitivityTier,
  VolatilityRating,
} from "@aiet/schema";
import { describe, expect, it } from "vitest";
import { createAIETAgentTools } from "../src/openai-adapter";

describe("OpenAI Agents SDK Adapter Suite", () => {
  it("should create valid OpenAI function tool definitions", () => {
    const aiet = createAIET({ storage: ":memory:" });
    const tools = createAIETAgentTools(aiet);

    expect(tools["aiet_search_memory"]).toBeDefined();
    expect(tools["aiet_propose_memory"]).toBeDefined();
    expect(tools["aiet_compile_context"]).toBeDefined();
    expect(tools["aiet_get_proposals"]).toBeDefined();

    expect(tools["aiet_search_memory"]?.type).toBe("function");
  });

  it("should execute aiet_search_memory and return attributed matches", async () => {
    const aiet = createAIET({ storage: ":memory:" });
    await aiet.memory.add({
      schema_version: "1.0.0",
      id: "dir_01J4X89K9Z1A2B3C4D5E6F7G8H",
      created_at: "2026-08-05T12:00:00Z",
      updated_at: "2026-08-05T12:00:00Z",
      last_verified: "2026-08-05T12:00:00Z",
      sensitivity: SensitivityTier.PUBLIC,
      volatility: VolatilityRating.LOW,
      activation: ActivationClass.ALWAYS_ON,
      statement: "Always encrypt credentials at rest",
      enforcement: EnforcementSeverity.HARD,
      domain: "security",
    });

    const tools = createAIETAgentTools(aiet);
    const searchRes = (await tools["aiet_search_memory"]?.execute({ query: "encrypt" })) as {
      query: string;
      matches: Array<{ id: string; attribution: { confidence_score: number } }>;
    };

    expect(searchRes.query).toBe("encrypt");
    expect(searchRes.matches.length).toBeGreaterThan(0);
    expect(searchRes.matches[0]?.attribution.confidence_score).toBeGreaterThan(0.8);
  });
});
