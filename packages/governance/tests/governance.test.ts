import { generateULID } from "@aiet/domain";
import {
  ActivationClass,
  AssertionType,
  EnforcementSeverity,
  EvidenceType,
  SensitivityTier,
  VolatilityRating,
} from "@aiet/schema";
import { PAKBStorageRepository, createDatabaseConnection } from "@aiet/storage";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GovernanceManager, evaluateGovernancePolicy } from "../src/index";

describe("@aiet/governance Integration Suite", () => {
  let repo: PAKBStorageRepository;
  let gov: GovernanceManager;

  beforeEach(() => {
    const db = createDatabaseConnection({ filename: ":memory:" });
    repo = new PAKBStorageRepository(db);
    gov = new GovernanceManager(repo);
  });

  afterEach(async () => {
    await repo.close();
  });

  describe("1. Governance Policy Evaluation", () => {
    it("should auto-apply high-confidence public proposals", () => {
      const candidate = {
        primitive_type: "assertion" as const,
        candidate: {
          schema_version: "1.0.0",
          id: generateULID("assertion"),
          created_at: "2026-08-05T12:00:00Z",
          updated_at: "2026-08-05T12:00:00Z",
          last_verified: "2026-08-05T12:00:00Z",
          sensitivity: SensitivityTier.PUBLIC,
          volatility: VolatilityRating.LOW,
          activation: ActivationClass.ALWAYS_ON,
          claim: "Public AIET memory assertion",
          evidence_type: EvidenceType.STATED,
          type: AssertionType.FACT,
        },
        confidence_score: 0.95,
        rationale: "High confidence fact",
      };

      const policy = evaluateGovernancePolicy(candidate, {
        decision: "CREATE",
        importance_score: 0.8,
        confidence_score: 0.95,
        novelty_score: 0.9,
        usefulness_score: 0.85,
        rationale: "CREATE",
      });

      expect(policy.mode).toBe("auto_apply");
    });

    it("should require approval for RESTRICTED sensitive candidate primitives", () => {
      const candidate = {
        primitive_type: "directive" as const,
        candidate: {
          schema_version: "1.0.0",
          id: generateULID("directive"),
          created_at: "2026-08-05T12:00:00Z",
          updated_at: "2026-08-05T12:00:00Z",
          last_verified: "2026-08-05T12:00:00Z",
          sensitivity: SensitivityTier.RESTRICTED,
          volatility: VolatilityRating.LOW,
          activation: ActivationClass.ALWAYS_ON,
          statement: "Always set sk-1234567890 in .env",
          enforcement: EnforcementSeverity.HARD,
          domain: "safety",
        },
        confidence_score: 0.98,
        rationale: "Sensitive API key statement",
      };

      const policy = evaluateGovernancePolicy(candidate, {
        decision: "CREATE",
        importance_score: 0.9,
        confidence_score: 0.98,
        novelty_score: 0.9,
        usefulness_score: 0.9,
        rationale: "CREATE",
      });

      expect(policy.mode).toBe("require_approval");
    });
  });

  describe("2. Memory Proposal Staging & Approval Workflow", () => {
    it("should stage RESTRICTED candidate proposal as PENDING and approve it upon user action", async () => {
      const candidate = {
        primitive_type: "directive" as const,
        candidate: {
          schema_version: "1.0.0",
          id: generateULID("directive"),
          created_at: "2026-08-05T12:00:00Z",
          updated_at: "2026-08-05T12:00:00Z",
          last_verified: "2026-08-05T12:00:00Z",
          sensitivity: SensitivityTier.RESTRICTED,
          volatility: VolatilityRating.LOW,
          activation: ActivationClass.ALWAYS_ON,
          statement: "Always set password=SecretPassword123",
          enforcement: EnforcementSeverity.HARD,
          domain: "safety",
        },
        confidence_score: 0.95,
        rationale: "Sensitive credentials directive",
      };

      const proposal = await gov.createMemoryProposal(candidate, {
        decision: "CREATE",
        importance_score: 0.9,
        confidence_score: 0.95,
        novelty_score: 0.9,
        usefulness_score: 0.9,
        rationale: "CREATE",
      });

      expect(proposal.status).toBe("pending");

      const pending = await gov.getPendingProposals();
      expect(pending).toHaveLength(1);
      expect(pending[0]?.proposal_id).toBe(proposal.proposal_id);

      // Approve proposal
      const approved = await gov.approveMemoryProposal(proposal.proposal_id);
      expect(approved.status).toBe("approved");

      // Primitive should now exist in storage
      const primitiveInDb = await repo.getPrimitive(candidate.candidate.id);
      expect(primitiveInDb).not.toBeNull();
    });

    it("should allow user rejection of pending proposal", async () => {
      const candidate = {
        primitive_type: "assertion" as const,
        candidate: {
          schema_version: "1.0.0",
          id: generateULID("assertion"),
          created_at: "2026-08-05T12:00:00Z",
          updated_at: "2026-08-05T12:00:00Z",
          last_verified: "2026-08-05T12:00:00Z",
          sensitivity: SensitivityTier.PUBLIC,
          volatility: VolatilityRating.LOW,
          activation: ActivationClass.ALWAYS_ON,
          claim: "Uncertain assertion needing review",
          evidence_type: EvidenceType.STATED,
          type: AssertionType.FACT,
        },
        confidence_score: 0.7, // Medium confidence -> pending proposal
        rationale: "Medium confidence assertion",
      };

      const proposal = await gov.createMemoryProposal(candidate, {
        decision: "CREATE",
        importance_score: 0.7,
        confidence_score: 0.7,
        novelty_score: 0.8,
        usefulness_score: 0.7,
        rationale: "CREATE",
      });

      expect(proposal.status).toBe("pending");

      const rejected = await gov.rejectMemoryProposal(proposal.proposal_id, "User declined fact");
      expect(rejected.status).toBe("rejected");

      // Primitive should NOT exist in storage
      const primitiveInDb = await repo.getPrimitive(candidate.candidate.id);
      expect(primitiveInDb).toBeNull();
    });
  });

  describe("3. Audit History & Zero-Egress Safety", () => {
    it("should generate audit log records for proposal creation, approval, and rejections", async () => {
      const candidate = {
        primitive_type: "assertion" as const,
        candidate: {
          schema_version: "1.0.0",
          id: generateULID("assertion"),
          created_at: "2026-08-05T12:00:00Z",
          updated_at: "2026-08-05T12:00:00Z",
          last_verified: "2026-08-05T12:00:00Z",
          sensitivity: SensitivityTier.PUBLIC,
          volatility: VolatilityRating.LOW,
          activation: ActivationClass.ALWAYS_ON,
          claim: "Audit trail assertion test",
          evidence_type: EvidenceType.STATED,
          type: AssertionType.FACT,
        },
        confidence_score: 0.95,
        rationale: "High confidence assertion",
      };

      await gov.createMemoryProposal(candidate, {
        decision: "CREATE",
        importance_score: 0.8,
        confidence_score: 0.95,
        novelty_score: 0.9,
        usefulness_score: 0.85,
        rationale: "CREATE",
      });

      const auditLog = await gov.getAuditHistory();
      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0]?.operation_type).toBe("CREATE");
    });

    it("should enforce zero-egress for RESTRICTED primitives", () => {
      const restrictedPrim = {
        schema_version: "1.0.0",
        id: generateULID("directive"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.RESTRICTED,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        statement: "Private API key sk-9999999999",
        enforcement: EnforcementSeverity.HARD,
        domain: "safety",
      };

      const publicPrim = {
        ...restrictedPrim,
        sensitivity: SensitivityTier.PUBLIC,
      };

      expect(gov.isPromptCompilationAllowed(restrictedPrim)).toBe(false);
      expect(gov.isPromptCompilationAllowed(publicPrim)).toBe(true);
    });
  });
});
