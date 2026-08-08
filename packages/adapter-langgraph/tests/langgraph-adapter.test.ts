import { createAIET } from "@aiet/core";
import {
  ActivationClass,
  EnforcementSeverity,
  SensitivityTier,
  VolatilityRating,
} from "@aiet/schema";
import { describe, expect, it } from "vitest";
import {
  createAIETCheckpointer,
  createAIETCompilerNode,
  createAIETGovernanceNode,
  createAIETMemoryNode,
} from "../src/langgraph-adapter";

describe("LangGraph Adapter Suite", () => {
  it("should execute memory node and inject memories into state", async () => {
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
      statement: "Always build local-first architecture in AIET",
      enforcement: EnforcementSeverity.HARD,
      domain: "architecture",
    });

    const memoryNode = createAIETMemoryNode(aiet);
    const result = await memoryNode({ query: "local-first architecture" });

    expect(result.aiet_memories).toBeDefined();
    expect(result.aiet_memories?.length).toBeGreaterThan(0);
  });

  it("should execute compiler node and governance node", async () => {
    const aiet = createAIET({ storage: ":memory:" });
    const compilerNode = createAIETCompilerNode(aiet);
    const govNode = createAIETGovernanceNode(aiet);

    const compRes = await compilerNode({});
    expect(compRes.aiet_context).toBeDefined();

    const govRes = await govNode({});
    expect(govRes.aiet_pending_proposals).toBe(0);
  });

  it("should persist checkpoints via AIET checkpointer", async () => {
    const aiet = createAIET({ storage: ":memory:" });
    const checkpointer = createAIETCheckpointer(aiet);

    await checkpointer.put("thread_123", 1, { state: "active" });
    const checkpoints = await checkpointer.get("thread_123");

    expect(checkpoints.length).toBe(1);
    expect(checkpoints[0]?.summary).toContain("thread_123");
  });
});
