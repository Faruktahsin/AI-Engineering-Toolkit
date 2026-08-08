import type { AnyPrimitive } from "@aiet/schema";

export type MatchType = "jcs_hash_exact" | "vector_similarity" | "text_exact";

export interface DuplicateDetectionResult {
  readonly duplicate_id: string;
  readonly primitive_a: AnyPrimitive;
  readonly primitive_b: AnyPrimitive;
  readonly match_type: MatchType;
  readonly similarity_score: number;
}

export type ConflictType = "CONTRADICTING_ASSERTION" | "OUTDATED_FACT" | "PREFERENCE_CONFLICT";

export interface ContradictionDetectionResult {
  readonly contradiction_id: string;
  readonly primitive_a: AnyPrimitive;
  readonly primitive_b: AnyPrimitive;
  readonly conflict_type: ConflictType;
  readonly reasoning: string;
}

export type ConsolidationAction = "MERGE" | "SUPERSEDE" | "ARCHIVE" | "COEXIST";

export interface ConsolidationProposalInput {
  readonly action: ConsolidationAction;
  readonly sourcePrimitive: AnyPrimitive;
  readonly targetPrimitiveId?: string | undefined;
  readonly reasoning: string;
  readonly confidence: number;
}
