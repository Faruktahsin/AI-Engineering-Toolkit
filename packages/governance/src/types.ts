import type { MemoryDecision } from "@aiet/decision-engine";

export type ProposalStatus = "pending" | "approved" | "rejected" | "auto_applied";
export type GovernancePolicyMode = "auto_apply" | "require_approval";

export interface MemoryProposalRecord {
  readonly proposal_id: string;
  readonly candidate_primitive_json: string;
  readonly decision_type: MemoryDecision;
  readonly target_primitive_id?: string | null | undefined;
  readonly confidence_score: number;
  readonly status: ProposalStatus;
  readonly reasoning: string;
  readonly created_at: string;
}

export interface AuditLogRecord {
  readonly log_id: string;
  readonly timestamp: string;
  readonly primitive_id: string;
  readonly operation_type: string;
  readonly initiator: string;
  readonly previous_jcs_hash?: string | null | undefined;
  readonly new_jcs_hash: string;
}

export interface GovernancePolicyEvaluation {
  readonly mode: GovernancePolicyMode;
  readonly reasoning: string;
}
