import type { DecisionResult } from "@aiet/decision-engine";
import type { MemoryCandidate } from "@aiet/extractor";
import { type AnyPrimitive, SensitivityTier } from "@aiet/schema";
import { type PAKBStorageRepository, calculateJCSHash } from "@aiet/storage";
import { ulid } from "ulid";
import { evaluateGovernancePolicy } from "./policy";
import type { AuditLogRecord, MemoryProposalRecord } from "./types";

export class GovernanceManager {
  private readonly storage: PAKBStorageRepository;

  constructor(storage: PAKBStorageRepository) {
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
    const proposalId = `prop_${ulid().toUpperCase()}`;
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const candidateJson = JSON.stringify(candidate.candidate);

    if (policy.mode === "auto_apply") {
      // 1. Instantly apply state mutation
      if (decisionResult.decision === "CREATE" || decisionResult.decision === "UPDATE") {
        await this.storage.insertPrimitive(candidate.candidate);
        await this.storage.setMemoryImportance(
          candidate.candidate.id,
          decisionResult.importance_score,
        );
      } else if (decisionResult.decision === "MERGE" && decisionResult.target_primitive_id) {
        await this.storage.mergeMemories(decisionResult.target_primitive_id, [
          candidate.candidate.id,
        ]);
      }

      // 2. Record proposal with status 'auto_applied'
      const record: MemoryProposalRecord = {
        proposal_id: proposalId,
        candidate_primitive_json: candidateJson,
        decision_type: decisionResult.decision,
        target_primitive_id: decisionResult.target_primitive_id,
        confidence_score: decisionResult.confidence_score,
        status: "auto_applied",
        reasoning: policy.reasoning,
        created_at: now,
      };

      await this.saveProposalRecord(record);

      // 3. Log audit event
      const hash = calculateJCSHash(candidate.candidate);
      await this.logAuditEvent(
        candidate.candidate.id,
        `auto_${decisionResult.decision.toLowerCase()}`,
        initiator,
        policy.reasoning,
        hash,
      );

      return record;
    }

    // Require User Approval -> Status 'pending'
    const record: MemoryProposalRecord = {
      proposal_id: proposalId,
      candidate_primitive_json: candidateJson,
      decision_type: decisionResult.decision,
      target_primitive_id: decisionResult.target_primitive_id,
      confidence_score: decisionResult.confidence_score,
      status: "pending",
      reasoning: policy.reasoning,
      created_at: now,
    };

    await this.saveProposalRecord(record);

    const hash = calculateJCSHash(candidate.candidate);
    await this.logAuditEvent(
      candidate.candidate.id,
      "proposal_created",
      initiator,
      policy.reasoning,
      hash,
    );

    return record;
  }

  public async approveMemoryProposal(
    proposalId: string,
    initiator = "user",
  ): Promise<MemoryProposalRecord> {
    const proposal = await this.getProposalRecord(proposalId);
    if (!proposal) {
      throw new Error(`Proposal '${proposalId}' not found.`);
    }
    if (proposal.status !== "pending") {
      throw new Error(
        `Proposal '${proposalId}' status is '${proposal.status}', expected 'pending'.`,
      );
    }

    const primitive = JSON.parse(proposal.candidate_primitive_json) as AnyPrimitive;

    if (proposal.decision_type === "CREATE" || proposal.decision_type === "UPDATE") {
      await this.storage.insertPrimitive(primitive);
    } else if (proposal.decision_type === "MERGE" && proposal.target_primitive_id) {
      await this.storage.mergeMemories(proposal.target_primitive_id, [primitive.id]);
    }

    const updatedProposal: MemoryProposalRecord = {
      ...proposal,
      status: "approved",
    };

    await this.saveProposalRecord(updatedProposal);

    const hash = calculateJCSHash(primitive);
    await this.logAuditEvent(
      primitive.id,
      "user_approval",
      initiator,
      `User approved proposal ${proposalId}`,
      hash,
    );

    return updatedProposal;
  }

  public async rejectMemoryProposal(
    proposalId: string,
    reason = "User rejected proposal",
    initiator = "user",
  ): Promise<MemoryProposalRecord> {
    const proposal = await this.getProposalRecord(proposalId);
    if (!proposal) {
      throw new Error(`Proposal '${proposalId}' not found.`);
    }
    if (proposal.status !== "pending") {
      throw new Error(
        `Proposal '${proposalId}' status is '${proposal.status}', expected 'pending'.`,
      );
    }

    const updatedProposal: MemoryProposalRecord = {
      ...proposal,
      status: "rejected",
      reasoning: reason,
    };

    await this.saveProposalRecord(updatedProposal);

    const primitive = JSON.parse(proposal.candidate_primitive_json) as AnyPrimitive;
    const hash = calculateJCSHash(primitive);

    await this.logAuditEvent(primitive.id, "user_rejection", initiator, reason, hash);

    return updatedProposal;
  }

  public async getProposalRecord(proposalId: string): Promise<MemoryProposalRecord | null> {
    const db = (
      this.storage as unknown as {
        db: {
          prepare: (sql: string) => {
            get: (...args: unknown[]) => Record<string, unknown> | undefined;
          };
        };
      }
    ).db;
    const r = db.prepare("SELECT * FROM memory_proposals WHERE proposal_id = ?").get(proposalId);
    if (!r) return null;
    return {
      proposal_id: String(r["proposal_id"]),
      candidate_primitive_json: String(r["candidate_primitive_json"]),
      decision_type: String(r["decision_type"]) as MemoryProposalRecord["decision_type"],
      target_primitive_id: r["target_primitive_id"] ? String(r["target_primitive_id"]) : undefined,
      confidence_score: Number(r["confidence_score"]),
      status: String(r["status"]) as MemoryProposalRecord["status"],
      reasoning: String(r["reasoning"]),
      created_at: String(r["created_at"]),
    };
  }

  public async getPendingProposals(): Promise<readonly MemoryProposalRecord[]> {
    const db = (
      this.storage as unknown as { db: { prepare: (sql: string) => { all: () => unknown[] } } }
    ).db;
    const rows = db
      .prepare("SELECT * FROM memory_proposals WHERE status = 'pending' ORDER BY created_at DESC")
      .all() as Array<Record<string, unknown>>;

    return rows.map((r) => ({
      proposal_id: String(r["proposal_id"]),
      candidate_primitive_json: String(r["candidate_primitive_json"]),
      decision_type: String(r["decision_type"]) as MemoryProposalRecord["decision_type"],
      target_primitive_id: r["target_primitive_id"] ? String(r["target_primitive_id"]) : undefined,
      confidence_score: Number(r["confidence_score"]),
      status: String(r["status"]) as MemoryProposalRecord["status"],
      reasoning: String(r["reasoning"]),
      created_at: String(r["created_at"]),
    }));
  }

  public async getAuditHistory(): Promise<readonly AuditLogRecord[]> {
    const db = (
      this.storage as unknown as { db: { prepare: (sql: string) => { all: () => unknown[] } } }
    ).db;
    const rows = db.prepare("SELECT * FROM audit_log ORDER BY timestamp DESC").all() as Array<
      Record<string, unknown>
    >;

    return rows.map((r) => ({
      log_id: String(r["log_id"]),
      timestamp: String(r["timestamp"]),
      primitive_id: String(r["primitive_id"]),
      operation_type: String(r["operation_type"]),
      initiator: String(r["initiator"]),
      previous_jcs_hash: r["previous_jcs_hash"] ? String(r["previous_jcs_hash"]) : undefined,
      new_jcs_hash: String(r["new_jcs_hash"]),
    }));
  }

  public isPromptCompilationAllowed(primitive: AnyPrimitive): boolean {
    return primitive.sensitivity !== SensitivityTier.RESTRICTED;
  }

  private async saveProposalRecord(record: MemoryProposalRecord): Promise<void> {
    const db = (
      this.storage as unknown as {
        db: { prepare: (sql: string) => { run: (...args: unknown[]) => void } };
      }
    ).db;
    const sql = `
      INSERT INTO memory_proposals (proposal_id, candidate_primitive_json, decision_type, target_primitive_id, confidence_score, status, reasoning, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(proposal_id) DO UPDATE SET
        status = excluded.status,
        reasoning = excluded.reasoning
    `;
    db.prepare(sql).run(
      record.proposal_id,
      record.candidate_primitive_json,
      record.decision_type,
      record.target_primitive_id ?? null,
      record.confidence_score,
      record.status,
      record.reasoning,
      record.created_at,
    );
  }

  private async logAuditEvent(
    primitiveId: string,
    operationType: string,
    initiator: string,
    reason: string,
    newJcsHash: string,
  ): Promise<void> {
    const db = (
      this.storage as unknown as {
        db: { prepare: (sql: string) => { run: (...args: unknown[]) => void } };
      }
    ).db;
    const logId = `log_${ulid().toUpperCase()}`;
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const sql = `
      INSERT INTO audit_log (log_id, timestamp, primitive_id, operation_type, initiator, previous_jcs_hash, new_jcs_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.prepare(sql).run(logId, now, primitiveId, operationType, initiator, reason, newJcsHash);
  }
}
