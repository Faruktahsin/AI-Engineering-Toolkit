import type { MemoryDecision } from "@aiet/decision-engine";
import type { StorageAuditRecord, StorageProposalRecord } from "@aiet/storage";

export type ProposalStatus = "pending" | "approved" | "rejected" | "auto_applied";
export type GovernancePolicyMode = "auto_apply" | "require_approval";

export interface MemoryProposalRecord extends StorageProposalRecord {
  readonly decision_type: Exclude<MemoryDecision, "IGNORE">;
  readonly status: ProposalStatus;
}

export interface AuditLogRecord extends StorageAuditRecord {}

export interface GovernancePolicyEvaluation {
  readonly mode: GovernancePolicyMode;
  readonly reasoning: string;
}
