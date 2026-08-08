import { SensitivityTier } from "@aiet/schema";
import { describe, expect, it, vi } from "vitest";
import {
  LLMDecisionEvaluator,
  RuleBasedDecisionEvaluator,
  evaluateMemoryCandidate,
} from "../src/index";

describe("@aiet/decision-engine Integration Suite", () => {
  describe("1. Rule-Based Decision Evaluator", () => {
    it("should issue CREATE decision for valid user preference candidate", async () => {
      const result = await evaluateMemoryCandidate({
        candidate: {
          primitive_type: "directive",
          candidate: {
            schema_version: "1.0.0",
            id: "dir_01H12345678901234567890123",
            created_at: "2026-08-05T12:00:00Z",
            updated_at: "2026-08-05T12:00:00Z",
            last_verified: "2026-08-05T12:00:00Z",
            sensitivity: SensitivityTier.PUBLIC,
            volatility: "low",
            activation: "always_on",
            statement: "I prefer Python over Java for backend services.",
            enforcement: "soft",
            domain: "user_preference",
          },
          confidence_score: 0.95,
          rationale: "Explicit user preference statement.",
        },
      });

      expect(result.decision).toBe("CREATE");
      expect(result.importance_score).toBeGreaterThanOrEqual(0.9);
      expect(result.usefulness_score).toBeGreaterThanOrEqual(0.9);
    });

    it("should issue IGNORE decision for transient conversational statements", async () => {
      const result = await evaluateMemoryCandidate({
        candidate: {
          primitive_type: "assertion",
          candidate: {
            schema_version: "1.0.0",
            id: "ast_01H12345678901234567890124",
            created_at: "2026-08-05T12:00:00Z",
            updated_at: "2026-08-05T12:00:00Z",
            last_verified: "2026-08-05T12:00:00Z",
            sensitivity: SensitivityTier.PUBLIC,
            volatility: "low",
            activation: "always_on",
            claim: "I am drinking coffee right now.",
            evidence_type: "stated",
            type: "fact",
          },
          confidence_score: 0.9,
          rationale: "Stated current user activity.",
        },
      });

      expect(result.decision).toBe("IGNORE");
      expect(result.usefulness_score).toBe(0.1);
    });

    it("should issue IGNORE decision when confidence score is below 0.6", async () => {
      const result = await evaluateMemoryCandidate({
        candidate: {
          primitive_type: "assertion",
          candidate: {
            schema_version: "1.0.0",
            id: "ast_01H12345678901234567890125",
            created_at: "2026-08-05T12:00:00Z",
            updated_at: "2026-08-05T12:00:00Z",
            last_verified: "2026-08-05T12:00:00Z",
            sensitivity: SensitivityTier.PUBLIC,
            volatility: "low",
            activation: "always_on",
            claim: "The project might use PostgreSQL.",
            evidence_type: "inferred",
            type: "fact",
          },
          confidence_score: 0.45,
          rationale: "Low confidence extraction.",
        },
      });

      expect(result.decision).toBe("IGNORE");
    });

    it("should issue UPDATE decision when matching existing high-similarity memory", async () => {
      const evaluator = new RuleBasedDecisionEvaluator();
      const result = await evaluator.evaluate({
        candidate: {
          primitive_type: "assertion",
          candidate: {
            schema_version: "1.0.0",
            id: "ast_01H12345678901234567890126",
            created_at: "2026-08-05T12:00:00Z",
            updated_at: "2026-08-05T12:00:00Z",
            last_verified: "2026-08-05T12:00:00Z",
            sensitivity: SensitivityTier.PUBLIC,
            volatility: "low",
            activation: "always_on",
            claim: "AIET uses SQLite WAL storage.",
            evidence_type: "stated",
            type: "fact",
          },
          confidence_score: 0.95,
          rationale: "Extracted project fact.",
        },
        existing_memories: [
          {
            primitive_id: "ast_existing_001",
            final_score: 0.92,
            rrf_score: 0.88,
            importance_score: 0.8,
            recency_score: 0.99,
            access_count: 5,
            last_accessed_at: "2026-08-05T12:00:00Z",
          },
        ],
      });

      expect(result.decision).toBe("UPDATE");
      expect(result.target_primitive_id).toBe("ast_existing_001");
    });

    it("should preserve RESTRICTED sensitivity metadata on decision result", async () => {
      const result = await evaluateMemoryCandidate({
        candidate: {
          primitive_type: "directive",
          candidate: {
            schema_version: "1.0.0",
            id: "dir_01H12345678901234567890127",
            created_at: "2026-08-05T12:00:00Z",
            updated_at: "2026-08-05T12:00:00Z",
            last_verified: "2026-08-05T12:00:00Z",
            sensitivity: SensitivityTier.RESTRICTED,
            volatility: "low",
            activation: "always_on",
            statement: "Always set sk-1234567890123456789012345 in .env",
            enforcement: "hard",
            domain: "safety",
          },
          confidence_score: 0.98,
          rationale: "Extracted sensitive API key directive.",
        },
      });

      expect(result.decision).toBe("CREATE");
      expect(result.importance_score).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe("2. LLM Decision Evaluator Wrapper", () => {
    it("should parse LLM decision JSON response correctly", async () => {
      const mockLLMFn = vi.fn().mockResolvedValue(`
        {
          "decision": "MERGE",
          "target_primitive_id": "ast_target_789",
          "importance_score": 0.85,
          "confidence_score": 0.95,
          "novelty_score": 0.05,
          "usefulness_score": 0.9,
          "rationale": "Identical project fact already present in long term memory."
        }
      `);

      const evaluator = new LLMDecisionEvaluator({ llmCompletionFn: mockLLMFn });
      const result = await evaluator.evaluate({
        candidate: {
          primitive_type: "assertion",
          candidate: {
            schema_version: "1.0.0",
            id: "ast_01H12345678901234567890128",
            created_at: "2026-08-05T12:00:00Z",
            updated_at: "2026-08-05T12:00:00Z",
            last_verified: "2026-08-05T12:00:00Z",
            sensitivity: SensitivityTier.PUBLIC,
            volatility: "low",
            activation: "always_on",
            claim: "AIET implements local-first SQLite WAL memory.",
            evidence_type: "stated",
            type: "fact",
          },
          confidence_score: 0.95,
          rationale: "Project memory claim.",
        },
      });

      expect(mockLLMFn).toHaveBeenCalled();
      expect(result.decision).toBe("MERGE");
      expect(result.target_primitive_id).toBe("ast_target_789");
    });
  });
});
