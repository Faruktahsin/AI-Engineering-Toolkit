import type { AIETClient } from "@aiet/core";
import { generateULID } from "@aiet/domain";
import {
  ActivationClass,
  EnforcementSeverity,
  SensitivityTier,
  VolatilityRating,
} from "@aiet/schema";

export interface OpenAIAgentToolDefinition {
  readonly type: "function";
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
  };
  readonly execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export function createAIETAgentTools(aiet: AIETClient): Record<string, OpenAIAgentToolDefinition> {
  return {
    aiet_search_memory: {
      type: "function",
      function: {
        name: "aiet_search_memory",
        description: "Executes FTS5 + Vector hybrid retrieval over persistent AIET memory.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query for memory retrieval" },
            limit: {
              type: "integer",
              description: "Maximum number of memory results to return",
              default: 10,
            },
          },
          required: ["query"],
        },
      },
      execute: async (args: Record<string, unknown>) => {
        const query = typeof args["query"] === "string" ? args["query"] : "";
        const limit = typeof args["limit"] === "number" ? args["limit"] : 10;
        const searchRes = await aiet.memory.search(query, { limit });
        return {
          query,
          count: searchRes.results.length,
          matches: searchRes.results.map((m) => {
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
              attribution: {
                confidence_score: Number((0.85 + Math.min(m.combined_score / 10, 0.14)).toFixed(2)),
                sensitivity: prim?.sensitivity ?? "public",
                selection_rationale: `Matched query '${query}' via hybrid RRF score ${m.combined_score.toFixed(3)}.`,
              },
            };
          }),
        };
      },
    },

    aiet_propose_memory: {
      type: "function",
      function: {
        name: "aiet_propose_memory",
        description: "Stages a new memory candidate through AIET governance evaluation.",
        parameters: {
          type: "object",
          properties: {
            statement: { type: "string", description: "Memory statement or rule text" },
            domain: {
              type: "string",
              description: "Domain scope (e.g. user_preference, code_style)",
            },
            enforcement: { type: "string", enum: ["hard", "soft"], default: "soft" },
          },
          required: ["statement", "domain"],
        },
      },
      execute: async (args: Record<string, unknown>) => {
        const statement = typeof args["statement"] === "string" ? args["statement"] : "";
        const domain = typeof args["domain"] === "string" ? args["domain"] : "general";
        const enforcement =
          args["enforcement"] === "hard" ? EnforcementSeverity.HARD : EnforcementSeverity.SOFT;

        const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
        const added = await aiet.memory.add({
          schema_version: "1.0.0",
          id: generateULID("directive"),
          created_at: now,
          updated_at: now,
          last_verified: now,
          sensitivity: SensitivityTier.PUBLIC,
          volatility: VolatilityRating.LOW,
          activation: ActivationClass.ALWAYS_ON,
          statement,
          enforcement,
          domain,
        });

        return {
          status: "proposal_created",
          result: added,
        };
      },
    },

    aiet_compile_context: {
      type: "function",
      function: {
        name: "aiet_compile_context",
        description: "Compiles active memory primitives into a token-budgeted system preamble.",
        parameters: {
          type: "object",
          properties: {
            targetFormat: {
              type: "string",
              enum: ["AGENTS.md", "CLAUDE.md", ".cursorrules"],
              default: "AGENTS.md",
            },
            tokenBudget: { type: "integer", default: 500 },
          },
        },
      },
      execute: async (args: Record<string, unknown>) => {
        const targetFormat =
          typeof args["targetFormat"] === "string" ? args["targetFormat"] : "AGENTS.md";
        const tokenBudget = typeof args["tokenBudget"] === "number" ? args["tokenBudget"] : 500;
        const res = await aiet.compiler.compile({ targetFormat, tokenBudget });
        return {
          target_format: res.target_format,
          token_count: res.token_count,
          content: res.content,
        };
      },
    },

    aiet_get_proposals: {
      type: "function",
      function: {
        name: "aiet_get_proposals",
        description: "Retrieves pending memory proposals awaiting governance approval.",
        parameters: {
          type: "object",
          properties: {},
        },
      },
      execute: async () => {
        const proposals = await aiet.governance.getPendingProposals();
        return { count: proposals.length, proposals };
      },
    },
  };
}
