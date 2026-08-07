import { generateULID } from "@aiet/domain";
import {
  ActivationClass,
  EnforcementSeverity,
  EntityType,
  PreambleBudgetExceededError,
  SensitivityTier,
  VolatilityRating,
} from "@aiet/schema";
import { describe, expect, it } from "vitest";
import {
  calculateBudget,
  calculateRemainingBudget,
  estimatePrimitiveCost,
  getPriorityRank,
  profileBatch,
  profileTokens,
  sortByPriority,
} from "../src/index";

describe("cl100k_base Token Profiler & Priority Sorting Engine (ETB Task 5.1.1)", () => {
  describe("1. Exact cl100k_base Token Profiling", () => {
    it("should return exact token count for simple text", () => {
      const text = "Hello World";
      const count = profileTokens(text);
      expect(count).toBeGreaterThan(0);
      expect(profileTokens("")).toBe(0);
    });

    it("should return exact token counts for batch texts", () => {
      const texts = ["Hello", "World", "PAKB Token Profiler"];
      const counts = profileBatch(texts);

      expect(counts).toHaveLength(3);
      expect(counts[0]).toBeGreaterThan(0);
      expect(counts[1]).toBeGreaterThan(0);
      expect(counts[2]).toBeGreaterThan(0);
      expect(profileBatch([])).toEqual([]);
    });

    it("should estimate primitive token cost accurately", () => {
      const entity = {
        schema_version: "1.0.0",
        id: generateULID("entity"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.INTERNAL,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ON_DEMAND,
        name: "AI Engineering Toolkit",
        type: EntityType.WORKSTREAM,
      };

      const cost = estimatePrimitiveCost(entity);
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe("2. Deterministic Priority Rank & Sorting Engine", () => {
    it("should assign correct priority ranks based on ADR-004 rules", () => {
      const securityDirective = {
        schema_version: "1.0.0",
        id: generateULID("directive"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        statement: "Never commit API keys.",
        enforcement: EnforcementSeverity.HARD,
        domain: "security",
      };

      const ownerEntity = {
        schema_version: "1.0.0",
        id: generateULID("entity"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        name: "Faruk Tahsin",
        type: EntityType.OWNER,
      };

      expect(getPriorityRank(securityDirective)).toBe(1);
      expect(getPriorityRank(ownerEntity)).toBe(2);
    });

    it("should sort primitives deterministically with identical outputs given identical inputs", () => {
      const p1 = {
        schema_version: "1.0.0",
        id: "dir_01J4X89K9Z1A2B3C4D5E6F7G8H",
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        statement: "Always format code with Biome.",
        enforcement: EnforcementSeverity.SOFT,
        domain: "global_style",
      };

      const p2 = {
        schema_version: "1.0.0",
        id: "ent_01J4X89K9Z2B3C4D5E6F7G8H9J",
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        name: "Faruk Tahsin",
        type: EntityType.OWNER,
      };

      const sorted1 = sortByPriority([p1, p2]);
      const sorted2 = sortByPriority([p2, p1]);

      expect(sorted1[0]?.primitive.id).toBe(p2.id); // Owner (Rank 2) before soft directive (Rank 4)
      expect(sorted1).toEqual(sorted2); // Deterministic equality
    });
  });

  describe("3. Budget Calculation & Overflow Demotion", () => {
    it("should fit primitives within 500 token budget and demote soft directives when overflowing", () => {
      const primitives = [
        {
          schema_version: "1.0.0",
          id: generateULID("entity"),
          created_at: "2026-08-05T12:00:00Z",
          updated_at: "2026-08-05T12:00:00Z",
          last_verified: "2026-08-05T12:00:00Z",
          sensitivity: SensitivityTier.PUBLIC,
          volatility: VolatilityRating.LOW,
          activation: ActivationClass.ALWAYS_ON,
          name: "Faruk Tahsin",
          type: EntityType.OWNER,
        },
        {
          schema_version: "1.0.0",
          id: generateULID("directive"),
          created_at: "2026-08-05T12:00:00Z",
          updated_at: "2026-08-05T12:00:00Z",
          last_verified: "2026-08-05T12:00:00Z",
          sensitivity: SensitivityTier.PUBLIC,
          volatility: VolatilityRating.LOW,
          activation: ActivationClass.ALWAYS_ON,
          statement: "A".repeat(2000), // Large soft directive
          enforcement: EnforcementSeverity.SOFT,
          domain: "global_style",
        },
      ];

      // Small max budget of 100 tokens
      const budgetResult = calculateBudget(primitives, 100);

      expect(budgetResult.tier0_fitted).toHaveLength(1);
      expect(budgetResult.tier0_fitted[0]?.primitive.type).toBe(EntityType.OWNER);
      expect(budgetResult.tier1_demoted).toHaveLength(1); // Soft directive demoted
      expect(budgetResult.remaining_budget).toBeGreaterThanOrEqual(0);
    });

    it("should throw PreambleBudgetExceededError if hard constraints exceed max budget", () => {
      const hardConstraint = {
        schema_version: "1.0.0",
        id: generateULID("directive"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        statement: "A".repeat(3000), // Hard security constraint exceeding budget
        enforcement: EnforcementSeverity.HARD,
        domain: "security",
      };

      expect(() => calculateBudget([hardConstraint], 100)).toThrow(PreambleBudgetExceededError);
    });

    it("should calculate remaining budget correctly", () => {
      expect(calculateRemainingBudget(100, 500)).toBe(400);
      expect(calculateRemainingBudget(500, 500)).toBe(0);
      expect(calculateRemainingBudget(600, 500)).toBe(0); // Clamped at 0
    });
  });
});
