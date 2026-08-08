import type { AIETClient } from "@aiet/core";
import { generateULID } from "@aiet/domain";
import { ActivationClass, EventType, SensitivityTier, VolatilityRating } from "@aiet/schema";

export interface LangGraphState {
  messages?: Array<{ role: string; content: string }>;
  query?: string;
  aiet_context?: string;
  aiet_memories?: Array<{ id: string; snippet: string; score: number }>;
  aiet_pending_proposals?: number;
  [key: string]: unknown;
}

export type LangGraphNodeFunction = (state: LangGraphState) => Promise<Partial<LangGraphState>>;

export function createAIETMemoryNode(aiet: AIETClient): LangGraphNodeFunction {
  return async (state: LangGraphState) => {
    const lastMsg =
      state.messages && state.messages.length > 0
        ? state.messages[state.messages.length - 1]?.content
        : "";
    const query = state.query ?? lastMsg ?? "";

    if (!query) {
      return { aiet_memories: [] };
    }

    const searchRes = await aiet.memory.search(query, { limit: 5 });
    return {
      aiet_memories: searchRes.results.map((m) => {
        const prim = m.primitive;
        let snippet = m.primitive_id;
        if (prim) {
          if ("statement" in prim) snippet = prim.statement;
          else if ("claim" in prim) snippet = prim.claim;
          else if ("name" in prim) snippet = prim.name;
          else if ("summary" in prim) snippet = prim.summary;
        }
        return {
          id: m.primitive_id,
          snippet,
          score: m.combined_score,
        };
      }),
    };
  };
}

export function createAIETCompilerNode(aiet: AIETClient): LangGraphNodeFunction {
  return async () => {
    const res = await aiet.compiler.compile({ targetFormat: "AGENTS.md", tokenBudget: 500 });
    return {
      aiet_context: res.content,
    };
  };
}

export function createAIETGovernanceNode(aiet: AIETClient): LangGraphNodeFunction {
  return async () => {
    const pending = await aiet.governance.getPendingProposals();
    return {
      aiet_pending_proposals: pending.length,
    };
  };
}

export function createAIETCheckpointer(aiet: AIETClient) {
  return {
    async put(
      threadId: string,
      step: number,
      checkpointData: Record<string, unknown>,
    ): Promise<void> {
      const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
      await aiet.memory.add({
        schema_version: "1.0.0",
        id: generateULID("event"),
        created_at: now,
        updated_at: now,
        last_verified: now,
        timestamp: now,
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        summary: `LangGraph Checkpoint Thread: ${threadId} Step: ${step}`,
        type: EventType.SESSION_LOG,
        metadata: {
          threadId,
          step,
          checkpointData: JSON.stringify(checkpointData),
        },
      });
    },
    async get(threadId: string): Promise<Array<{ id: string; summary?: string | undefined }>> {
      const memories = await aiet.memory.list({ limit: 50 });
      return memories
        .filter(
          (m) =>
            "summary" in m &&
            typeof m.summary === "string" &&
            m.summary.includes(`LangGraph Checkpoint Thread: ${threadId}`),
        )
        .map((m) => ({ id: m.id, summary: "summary" in m ? m.summary : undefined }));
    },
  };
}
