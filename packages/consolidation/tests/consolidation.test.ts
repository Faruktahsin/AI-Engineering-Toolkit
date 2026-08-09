import { generateULID } from "@aiet/domain";
import { GovernanceManager } from "@aiet/governance";
import {
  ActivationClass,
  AssertionType,
  EntityType,
  EvidenceType,
  SensitivityTier,
  VolatilityRating,
} from "@aiet/schema";
import { PAKBStorageRepository, createDatabaseConnection } from "@aiet/storage";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConsolidationEngine, ContradictionDetector, DuplicateDetector } from "../src/index";

describe("@aiet/consolidation Integration Suite", () => {
  let repo: PAKBStorageRepository;
  let gov: GovernanceManager;
  let engine: ConsolidationEngine;
  let duplicateDetector: DuplicateDetector;
  let contradictionDetector: ContradictionDetector;

  beforeEach(() => {
    const db = createDatabaseConnection({ filename: ":memory:" });
    repo = new PAKBStorageRepository(db);
    gov = new GovernanceManager(repo);
    engine = new ConsolidationEngine(repo, gov);
    duplicateDetector = new DuplicateDetector();
    contradictionDetector = new ContradictionDetector();
  });

  afterEach(async () => {
    await repo.close();
  });

  describe("1. Duplicate Detection Engine", () => {
    it("should detect duplicate entities via JCS hash and normalized text matching", () => {
      const ent1 = {
        schema_version: "1.0.0",
        id: generateULID("entity"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        name: "AIET Framework",
        type: EntityType.WORKSTREAM,
        description: "Open-source AI agent infrastructure framework",
      };

      const ent2 = {
        ...ent1,
        id: generateULID("entity"), // Different ID, same attributes
      };

      const duplicates = duplicateDetector.findDuplicates([ent1, ent2]);
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0]?.match_type).toBe("text_exact");
      expect(duplicates[0]?.similarity_score).toBeGreaterThanOrEqual(0.95);
    });

    it("should detect vector similarity duplicates when vector embeddings are provided", () => {
      const ent1 = {
        schema_version: "1.0.0",
        id: generateULID("entity"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        name: "SQLite Local Storage Engine",
        type: EntityType.WORKSTREAM,
      };

      const ent2 = {
        schema_version: "1.0.0",
        id: generateULID("entity"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        name: "Embedded SQLite Vector DB",
        type: EntityType.WORKSTREAM,
      };

      const embeddings = new Map<string, number[]>();
      embeddings.set(ent1.id, [1.0, 0.0, 0.0]);
      embeddings.set(ent2.id, [0.99, 0.01, 0.0]);

      const duplicates = duplicateDetector.findDuplicates([ent1, ent2], embeddings);
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0]?.match_type).toBe("vector_similarity");
      expect(duplicates[0]?.similarity_score).toBeGreaterThan(0.9);
    });
  });

  describe("2. Contradiction Detection Engine", () => {
    it("should detect preference conflicts (e.g., prefers Java vs prefers Python)", () => {
      const ast1 = {
        schema_version: "1.0.0",
        id: generateULID("assertion"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        claim: "User prefers Java for backend services",
        evidence_type: EvidenceType.STATED,
        type: AssertionType.FACT,
      };

      const ast2 = {
        schema_version: "1.0.0",
        id: generateULID("assertion"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        claim: "User prefers Python for backend services",
        evidence_type: EvidenceType.STATED,
        type: AssertionType.FACT,
      };

      const contradictions = contradictionDetector.findContradictions([ast1, ast2]);
      expect(contradictions).toHaveLength(1);
      expect(contradictions[0]?.conflict_type).toBe("PREFERENCE_CONFLICT");
    });

    it("should not treat preferences from different decision scopes as conflicts", () => {
      const ast1 = {
        schema_version: "1.0.0",
        id: generateULID("assertion"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        claim: "User prefers Vitest for testing framework",
        evidence_type: EvidenceType.STATED,
        type: AssertionType.FACT,
      };

      const ast2 = {
        ...ast1,
        id: generateULID("assertion"),
        claim: "User prefers pnpm for package manager",
      };

      expect(contradictionDetector.findContradictions([ast1, ast2])).toHaveLength(0);
    });
  });

  describe("3. Governance Proposal & Memory Lineage Rollback Safety", () => {
    it("should require approval for MERGE consolidation operations and generate audit log", async () => {
      const targetEnt = {
        schema_version: "1.0.0",
        id: generateULID("entity"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        name: "Target Entity",
        type: EntityType.WORKSTREAM,
      };
      await repo.insertPrimitive(targetEnt);

      const sourceEnt = {
        ...targetEnt,
        id: generateULID("entity"),
        name: "Source Duplicate Entity",
      };

      const result = await engine.proposeConsolidation({
        action: "MERGE",
        sourcePrimitive: sourceEnt,
        targetPrimitiveId: targetEnt.id,
        reasoning: "Merge duplicate source entity into target entity",
        confidence: 0.95,
      });

      expect(result.proposal.status).toBe("pending");
      expect(result.lineage_id).toMatch(/^lin_/);

      // Verify pending proposal in governance
      const pending = await gov.getPendingProposals();
      expect(pending).toHaveLength(1);
      expect(pending[0]?.proposal_id).toBe(result.proposal.proposal_id);

      // User approves proposal
      await gov.approveMemoryProposal(result.proposal.proposal_id);

      // Audit history should reflect approval
      const audit = await gov.getAuditHistory();
      expect(audit.length).toBeGreaterThan(0);
    });

    it("should allow rollback of consolidation using memory lineage snapshots", async () => {
      const sourceEnt = {
        schema_version: "1.0.0",
        id: generateULID("entity"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        name: "Rollback Test Entity",
        type: EntityType.WORKSTREAM,
      };

      const result = await engine.proposeConsolidation({
        action: "ARCHIVE",
        sourcePrimitive: sourceEnt,
        reasoning: "Archive entity prior to refactoring",
        confidence: 0.9,
      });

      // Rollback execution
      const rollbackSuccess = await engine.rollbackConsolidation(result.lineage_id);
      expect(rollbackSuccess).toBe(true);

      // Primitive should be restored in storage
      const restored = await repo.getPrimitive(sourceEnt.id);
      expect(restored).not.toBeNull();
      expect(restored?.id).toBe(sourceEnt.id);
    });
  });
});
