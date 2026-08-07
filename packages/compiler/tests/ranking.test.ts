import { generateULID } from "@aiet/domain";
import {
  ActivationClass,
  AssertionType,
  EnforcementSeverity,
  EntityType,
  EventType,
  EvidenceType,
  SensitivityTier,
  VolatilityRating,
} from "@aiet/schema";
import { describe, expect, it } from "vitest";
import {
  CompilerPipeline,
  PriorityTier,
  RankingEngine,
  RankingReason,
  scorePrimitive,
} from "../src/index";

describe("Priority Ranking Engine (ETB Task 5.1.2-B)", () => {
  const rankingEngine = new RankingEngine();

  const securityHardDirective = {
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

  const safetyDirective = {
    schema_version: "1.0.0",
    id: generateULID("directive"),
    created_at: "2026-08-05T12:00:00Z",
    updated_at: "2026-08-05T12:00:00Z",
    last_verified: "2026-08-05T12:00:00Z",
    sensitivity: SensitivityTier.PUBLIC,
    volatility: VolatilityRating.LOW,
    activation: ActivationClass.ALWAYS_ON,
    statement: "Validate input sizes.",
    enforcement: EnforcementSeverity.HARD,
    domain: "safety",
  };

  const globalStyleDirective = {
    schema_version: "1.0.0",
    id: generateULID("directive"),
    created_at: "2026-08-05T12:00:00Z",
    updated_at: "2026-08-05T12:00:00Z",
    last_verified: "2026-08-05T12:00:00Z",
    sensitivity: SensitivityTier.PUBLIC,
    volatility: VolatilityRating.LOW,
    activation: ActivationClass.ALWAYS_ON,
    statement: "Prefer concise Markdown.",
    enforcement: EnforcementSeverity.SOFT,
    domain: "global_style",
  };

  const onDemandEntity = {
    schema_version: "1.0.0",
    id: generateULID("entity"),
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
    id: "evt_01J4X89K9Z6F7G8H9J0J1K2L3M",
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

  const assertionFact = {
    schema_version: "1.0.0",
    id: generateULID("assertion"),
    created_at: "2026-08-05T12:00:00Z",
    updated_at: "2026-08-05T12:00:00Z",
    last_verified: "2026-08-05T12:00:00Z",
    sensitivity: SensitivityTier.PUBLIC,
    volatility: VolatilityRating.LOW,
    activation: ActivationClass.ON_DEMAND,
    claim: "SQLite WAL mode is active.",
    evidence_type: EvidenceType.OBSERVED,
    type: AssertionType.FACT,
  };

  const relationEdge = {
    schema_version: "1.0.0",
    id: generateULID("relation"),
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

  describe("1. Scoring and Ranking Reason Assignment", () => {
    it("should assign exact priority scores and reasons per ADR-004", () => {
      expect(scorePrimitive(securityHardDirective)).toEqual({
        priority_score: 1,
        ranking_reason: RankingReason.SECURITY,
        tier: PriorityTier.TIER_0_ALWAYS_ON,
      });

      expect(scorePrimitive(ownerEntity)).toEqual({
        priority_score: 2,
        ranking_reason: RankingReason.OWNER,
        tier: PriorityTier.TIER_0_ALWAYS_ON,
      });

      expect(scorePrimitive(safetyDirective)).toEqual({
        priority_score: 3,
        ranking_reason: RankingReason.STYLE,
        tier: PriorityTier.TIER_0_ALWAYS_ON,
      });

      expect(scorePrimitive(globalStyleDirective)).toEqual({
        priority_score: 4,
        ranking_reason: RankingReason.STYLE,
        tier: PriorityTier.TIER_0_ALWAYS_ON,
      });

      expect(scorePrimitive(onDemandEntity)).toEqual({
        priority_score: 6,
        ranking_reason: RankingReason.CONTEXT,
        tier: PriorityTier.TIER_1_ON_DEMAND,
      });

      expect(scorePrimitive(eventHistory)).toEqual({
        priority_score: 7,
        ranking_reason: RankingReason.HISTORY,
        tier: PriorityTier.TIER_1_ON_DEMAND,
      });

      expect(scorePrimitive(assertionFact)).toEqual({
        priority_score: 8,
        ranking_reason: RankingReason.DEFAULT,
        tier: PriorityTier.TIER_1_ON_DEMAND,
      });

      expect(scorePrimitive(relationEdge)).toEqual({
        priority_score: 9,
        ranking_reason: RankingReason.GRAPH,
        tier: PriorityTier.TIER_1_ON_DEMAND,
      });
    });
  });

  describe("2. Primary, Secondary, and Tertiary Sorting Determinism", () => {
    it("should sort primitives by primary priority score ASC", () => {
      const primitives = [
        relationEdge,
        assertionFact,
        eventHistory,
        onDemandEntity,
        globalStyleDirective,
        safetyDirective,
        ownerEntity,
        securityHardDirective,
      ];

      const ranked = rankingEngine.rank(primitives);

      expect(ranked.map((r) => r.priority_score)).toEqual([1, 2, 3, 4, 6, 7, 8, 9]);
      expect(ranked[0]?.primitive.id).toBe(securityHardDirective.id);
      expect(ranked[1]?.primitive.id).toBe(ownerEntity.id);
      expect(ranked[2]?.primitive.id).toBe(safetyDirective.id);
      expect(ranked[3]?.primitive.id).toBe(globalStyleDirective.id);
    });

    it("should use secondary sort last_verified DESC when primary scores match", () => {
      const olderDirective = {
        ...globalStyleDirective,
        id: "dir_01J4X89K9Z1111111111111111",
        last_verified: "2026-08-01T12:00:00Z",
      };

      const newerDirective = {
        ...globalStyleDirective,
        id: "dir_01J4X89K9Z2222222222222222",
        last_verified: "2026-08-05T12:00:00Z", // Newer
      };

      const ranked = rankingEngine.rank([olderDirective, newerDirective]);

      expect(ranked[0]?.primitive.id).toBe(newerDirective.id); // Newer first
      expect(ranked[1]?.primitive.id).toBe(olderDirective.id);
    });

    it("should use tertiary sort ULID id ASC when primary score and last_verified match", () => {
      const directiveA = {
        ...globalStyleDirective,
        id: "dir_01J4X89K9Z1000000000000000",
        last_verified: "2026-08-05T12:00:00Z",
      };

      const directiveB = {
        ...globalStyleDirective,
        id: "dir_01J4X89K9Z2000000000000000",
        last_verified: "2026-08-05T12:00:00Z",
      };

      const ranked = rankingEngine.rank([directiveB, directiveA]);

      expect(ranked[0]?.primitive.id).toBe(directiveA.id); // '100...' before '200...'
      expect(ranked[1]?.primitive.id).toBe(directiveB.id);
    });

    it("should propagate estimated_tokens and preserve input immutability", () => {
      const primitives = [securityHardDirective, ownerEntity];
      const ranked = rankingEngine.rank(primitives);

      expect(ranked[0]?.estimated_tokens).toBeGreaterThan(0);
      expect(ranked[1]?.estimated_tokens).toBeGreaterThan(0);
      expect(Object.isFrozen(ranked)).toBe(true);
    });
  });

  describe("3. Compiler Pipeline Stage 6 RANK Integration", () => {
    it("should execute 6-stage pipeline and produce ranked_primitives in PipelineResult", () => {
      const pipeline = new CompilerPipeline();
      const primitives = [assertionFact, securityHardDirective, ownerEntity];

      const result = pipeline.run(primitives);

      expect(result.original_count).toBe(3);
      expect(result.filtered_count).toBe(3);
      expect(result.ranked_count).toBe(3);
      expect(result.ranked_primitives).toHaveLength(3);
      expect(result.ranked_primitives[0]?.primitive.id).toBe(securityHardDirective.id);
      expect(result.ranked_primitives[1]?.primitive.id).toBe(ownerEntity.id);
      expect(result.ranked_primitives[2]?.primitive.id).toBe(assertionFact.id);
    });
  });
});
