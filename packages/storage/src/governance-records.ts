import type { AnyPrimitive } from "@aiet/schema";

export type StorageMutationType = "CREATE" | "UPDATE" | "MERGE";
export type StorageProposalStatus = "pending" | "approved" | "rejected" | "auto_applied";

/** Persistence contract shared with higher-level governance code. */
export interface StorageProposalRecord {
  readonly proposal_id: string;
  readonly candidate_primitive_json: string;
  readonly decision_type: StorageMutationType;
  readonly target_primitive_id?: string | null | undefined;
  readonly expected_updated_at?: string | null | undefined;
  readonly confidence_score: number;
  readonly status: StorageProposalStatus;
  readonly reasoning: string;
  readonly created_at: string;
}

export interface StorageAuditRecord {
  readonly log_id: string;
  readonly timestamp: string;
  readonly primitive_id: string;
  readonly operation_type: string;
  readonly initiator: string;
  readonly primitive_jcs_hash: string;
  readonly previous_jcs_hash: string;
  readonly new_jcs_hash: string;
  readonly chain_version: number;
  readonly chain_sequence: number;
}

export interface StorageMutationInput {
  readonly type: StorageMutationType;
  readonly candidate_primitive: AnyPrimitive;
  readonly target_primitive_id?: string | null | undefined;
  readonly expected_updated_at?: string | null | undefined;
  readonly proposal: StorageProposalRecord;
  readonly operation_type: string;
  readonly initiator: string;
}

export interface StorageMutationResult {
  readonly persisted_primitive: AnyPrimitive;
  readonly proposal_record: StorageProposalRecord;
  readonly audit_record: StorageAuditRecord;
}

export interface AuditChainVerification {
  readonly valid: boolean;
  readonly broken_at_log_id?: string | undefined;
  readonly reason?: string | undefined;
}
