import { generateULID } from "@aiet/domain";
import {
  ActivationClass,
  EnforcementSeverity,
  EntityType,
  EventType,
  PreambleBudgetExceededError,
  SensitivityTier,
  VolatilityRating,
} from "@aiet/schema";
import { describe, expect, it } from "vitest";
import { BudgetFitter, CompilerPipeline, RankingEngine } from "../src/index";

describe("Budget Fitting & Tier Assignment Engine (ETB Task 5.1.2-C)", () => {
  const rankingEngine = new RankingEngine();
  const fitter = new BudgetFitter();

  const securityHardDirective = {
    schema_version: "1.0.0",
    id: "dir_01J4X89K9Z1A2B3C4D5E6F7G8H",
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

  const softDirective = {
    schema_version: "1.0.0",
    id: "dir_01J4X89K9Z3C4D5E6F7G8H9J0K",
    created_at: "2026-08-05T12:00:00Z",
    updated_at: "2026-08-05T12:00:00Z",
    last_verified: "2026-08-05T12:00:00Z",
    sensitivity: SensitivityTier.PUBLIC,
    volatility: VolatilityRating.LOW,
    activation: ActivationClass.ALWAYS_ON,
    statement: "Prefer concise Markdown formatting across outputs.",
    enforcement: EnforcementSeverity.SOFT,
    domain: "global_style",
  };

  const onDemandEntity = {
    schema_version: "1.0.0",
    id: "ent_01J4X89K9Z4D5E6F7G8H9J0J1K",
    created_at: "2026-08-05T12:00:00Z",
    updated_at: "2026-08-05T12:00:00Z",
    last_verified: "2026-08-05T12:00:00Z",
    sensitivity: SensitivityTier.INTERNAL,
    volatility: VolatilityRating.LOW,
    activation: ActivationClass.ON_DEMAND,
    name: "Project Alpha",
    type: EntityType.WORKSTREAM,
  };

  const eventHistory = {
    schema_version: "1.0.0",
    id: "evt_01J4X89K9Z5E6F7G8H9J0J1K2M",
    created_at: "2026-08-05T12:00:00Z",
    updated_at: "2026-08-05T12:00:00Z",
    last_verified: "2026-08-05T12:00:00Z",
    sensitivity: SensitivityTier.PUBLIC,
    volatility: VolatilityRating.INVARIANT,
    activation: ActivationClass.ON_DEMAND,
    timestamp: "2026-08-05T12:00:00Z",
    summary: "Milestone reached.",
    type: EventType.MILESTONE,
  };

  const relationEdge = {
    schema_version: "1.0.0",
    id: "rel_01J4X89K9Z6F7G8H9J0J1K2M3N",
    created_at: "2026-08-05T12:00:00Z",
    updated_at: "2026-08-05T12:00:00Z",
    last_verified: "2026-08-05T12:00:00Z",
    sensitivity: SensitivityTier.PUBLIC,
    volatility: VolatilityRating.LOW,
    activation: ActivationClass.ON_DEMAND,
    source_id: securityHardDirective.id,
    target_id: ownerEntity.id,
    predicate: "governs",
  };

  describe("1. Budget Fitting & Tier Assignment Rules", () => {
    it("should fit primitives within 500 token budget", () => {
      const ranked = rankingEngine.rank([securityHardDirective, ownerEntity]);
      const result = fitter.fit(ranked, 500);

      expect(result.tier0).toHaveLength(2);
      expect(result.tier1).toHaveLength(0);
      expect(result.overflow).toHaveLength(0);
      expect(result.tier0_tokens).toBeGreaterThan(0);
      expect(result.tier0_tokens).toBeLessThanOrEqual(500);
      expect(result.tier0_tokens + result.remaining_tokens).toBe(500);
    });

    it("should demote soft directives, entities, and assertions to Tier 1 when budget is exceeded", () => {
      const ranked = rankingEngine.rank([
        securityHardDirective,
        ownerEntity,
        softDirective,
        onDemandEntity,
      ]);

      // Small budget where only securityHardDirective fits
      const securityCost = rankingEngine.scorePrimitive(securityHardDirective).estimated_tokens;
      const result = fitter.fit(ranked, securityCost + 2); // Budget fits security + owner if tight

      expect(result.tier0).toHaveLength(1); // Only securityHardDirective fits
      expect(result.tier1).toHaveLength(3); // softDirective and entities demoted to Tier 1
      expect(result.overflow).toHaveLength(0);
    });

    it("should send overflowing events and relations to Overflow", () => {
      const ranked = rankingEngine.rank([eventHistory, relationEdge]);
      const result = fitter.fit(ranked, 10); // Small budget = 10 tokens

      expect(result.tier0).toHaveLength(0);
      expect(result.tier1).toHaveLength(0);
      expect(result.overflow).toHaveLength(2); // Events and relations sent to Overflow
    });

    it("should throw PreambleBudgetExceededError if hard directive exceeds Tier 0 budget", () => {
      const largeHardDirective = {
        schema_version: "1.0.0",
        id: generateULID("directive"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        statement: `Hard constraint ${"x".repeat(5000)}`,
        enforcement: EnforcementSeverity.HARD,
        domain: "security",
      };

      const ranked = rankingEngine.rank([largeHardDirective]);
      expect(() => fitter.fit(ranked, 500)).toThrow(PreambleBudgetExceededError);
    });
  });

  describe("2. Uniqueness, No Duplicate, and Complete Partitioning Invariants", () => {
    it("should assign every primitive exactly once with no duplicates across tiers", () => {
      const primitives = [
        securityHardDirective,
        ownerEntity,
        softDirective,
        onDemandEntity,
        eventHistory,
        relationEdge,
      ];

      const ranked = rankingEngine.rank(primitives);
      const result = fitter.fit(ranked, 30); // Tight budget forcing demotions & overflow

      const allIds = [
        ...result.tier0.map((r) => r.primitive.id),
        ...result.tier1.map((r) => r.primitive.id),
        ...result.overflow.map((r) => r.primitive.id),
      ];

      const uniqueIds = new Set(allIds);

      // Verify no primitive disappeared and no primitive appeared in multiple tiers
      expect(allIds).toHaveLength(primitives.length);
      expect(uniqueIds.size).toBe(primitives.length);
    });

    it("should handle zero primitives gracefully", () => {
      const result = fitter.fit([], 500);

      expect(result.tier0).toHaveLength(0);
      expect(result.tier1).toHaveLength(0);
      expect(result.overflow).toHaveLength(0);
      expect(result.tier0_tokens).toBe(0);
      expect(result.remaining_tokens).toBe(500);
    });
  });

  describe("3. Compiler Pipeline Integration (7-Stage Pipeline)", () => {
    it("should execute 7-stage pipeline INGEST ➔ SANITIZE ➔ VALIDATE ➔ NORMALIZE ➔ FILTER ➔ RANK ➔ FIT", () => {
      const pipeline = new CompilerPipeline();
      const primitives = [securityHardDirective, ownerEntity, softDirective, onDemandEntity];

      const result = pipeline.run(primitives, { max_tier0_budget: 500 });

      expect(result.original_count).toBe(4);
      expect(result.fitted_count).toBe(3); // Tier 0 fitted count
      expect(result.fit_result).toBeDefined();
      expect(result.fit_result.tier0_tokens).toBeLessThanOrEqual(500);
      expect(result.fit_result.budget).toBe(500);
    });

    it("should produce bit-for-bit identical BudgetFitResult across repeated pipeline executions", () => {
      const pipeline = new CompilerPipeline();
      const primitives = [
        securityHardDirective,
        ownerEntity,
        softDirective,
        onDemandEntity,
        eventHistory,
        relationEdge,
      ];

      const result1 = pipeline.run(primitives, { max_tier0_budget: 500 });
      const result2 = pipeline.run(primitives, { max_tier0_budget: 500 });

      expect(JSON.stringify(result1.fit_result)).toBe(JSON.stringify(result2.fit_result));
    });
  });
});
