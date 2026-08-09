import type { DecisionResult } from "@aiet/decision-engine";
import type { MemoryCandidate } from "@aiet/extractor";
import { type AnyPrimitive, SensitivityTier } from "@aiet/schema";
import type { AIETStorageRepository, StorageProposalRecord } from "@aiet/storage";
import { ulid } from "ulid";
import { evaluateGovernancePolicy } from "./policy";
import type { AuditLogRecord, MemoryProposalRecord } from "./types";

export class GovernanceManager {
  private readonly storage: AIETStorageRepository;

  constructor(storage: AIETStorageRepository) {
    this.storage = storage;
  }

  public async createMemoryProposal(
    candidate: MemoryCandidate,
    decisionResult: DecisionResult,
    initiator = "system",
  ): Promise<MemoryProposalRecord> {
    if (decisionResult.decision === "IGNORE") {
      throw new Error("Cannot create a memory proposal for decision 'IGNORE'.");
    }

    const policy = evaluateGovernancePolicy(candidate, decisionResult);
    const target = decisionResult.target_primitive_id
      ? await this.storage.getPrimitive(decisionResult.target_primitive_id)
      : null;
    if ((decisionResult.decision === "UPDATE" || decisionResult.decision === "MERGE") && !target) {
      throw new Error(`Target primitive '${decisionResult.target_primitive_id ?? ""}' not found.`);
    }

    const record: MemoryProposalRecord = {
      proposal_id: `prop_${ulid().toUpperCase()}`,
      candidate_primitive_json: JSON.stringify(candidate.candidate),
      decision_type: decisionResult.decision,
      target_primitive_id: decisionResult.target_primitive_id,
      expected_updated_at: target?.updated_at,
      confidence_score: decisionResult.confidence_score,
      status: policy.mode === "auto_apply" ? "auto_applied" : "pending",
      reasoning: policy.reasoning,
      created_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    };

    if (policy.mode === "auto_apply") {
      const result = this.storage.executeAtomicMutationTransaction({
        type: decisionResult.decision,
        candidate_primitive: candidate.candidate,
        target_primitive_id: record.target_primitive_id,
        expected_updated_at: record.expected_updated_at,
        proposal: record,
        operation_type: decisionResult.decision,
        initiator,
      });
      await this.storage.setMemoryImportance(
        result.persisted_primitive.id,
        decisionResult.importance_score,
      );
      return record;
    }

    this.storage.saveProposalWithAudit(record, candidate.candidate, "proposal_created", initiator);
    return record;
  }

  public async approveMemoryProposal(
    proposalId: string,
    initiator = "user",
  ): Promise<MemoryProposalRecord> {
    const proposal = await this.getProposalRecord(proposalId);
    if (!proposal) throw new Error(`Proposal '${proposalId}' not found.`);
    if (proposal.status !== "pending") {
      throw new Error(
        `Proposal '${proposalId}' status is '${proposal.status}', expected 'pending'.`,
      );
    }
    const primitive = JSON.parse(proposal.candidate_primitive_json) as AnyPrimitive;
    const approved: MemoryProposalRecord = { ...proposal, status: "approved" };
    this.storage.executeAtomicMutationTransaction({
      type: approved.decision_type,
      candidate_primitive: primitive,
      target_primitive_id: approved.target_primitive_id,
      expected_updated_at: approved.expected_updated_at,
      proposal: approved,
      operation_type: "user_approval",
      initiator,
    });
    return approved;
  }

  public async rejectMemoryProposal(
    proposalId: string,
    reason = "User rejected proposal",
    initiator = "user",
  ): Promise<MemoryProposalRecord> {
    const proposal = await this.getProposalRecord(proposalId);
    if (!proposal) throw new Error(`Proposal '${proposalId}' not found.`);
    if (proposal.status !== "pending") {
      throw new Error(
        `Proposal '${proposalId}' status is '${proposal.status}', expected 'pending'.`,
      );
    }
    const rejected: MemoryProposalRecord = { ...proposal, status: "rejected", reasoning: reason };
    const primitive = JSON.parse(proposal.candidate_primitive_json) as AnyPrimitive;
    this.storage.saveProposalWithAudit(rejected, primitive, "user_rejection", initiator);
    return rejected;
  }

  public async getProposalRecord(proposalId: string): Promise<MemoryProposalRecord | null> {
    const record = await this.storage.getProposalRecord(proposalId);
    return record ? this.toGovernanceProposal(record) : null;
  }

  public async getPendingProposals(): Promise<readonly MemoryProposalRecord[]> {
    return (await this.storage.getPendingProposals()).map((record) =>
      this.toGovernanceProposal(record),
    );
  }

  public async getAuditHistory(): Promise<readonly AuditLogRecord[]> {
    return (await this.storage.getAuditHistory()).map((record) => ({ ...record }));
  }

  public async verifyAuditChain() {
    return this.storage.verifyAuditChain();
  }

  public isPromptCompilationAllowed(primitive: AnyPrimitive): boolean {
    return primitive.sensitivity !== SensitivityTier.RESTRICTED;
  }

  private toGovernanceProposal(record: StorageProposalRecord): MemoryProposalRecord {
    return { ...record };
  }
}
