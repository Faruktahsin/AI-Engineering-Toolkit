import type { MemoryCandidate } from "@aiet/extractor";
import type { RankedMemoryItem } from "@aiet/storage";

export type MemoryDecision = "IGNORE" | "CREATE" | "UPDATE" | "MERGE";

export interface DecisionInput {
  readonly candidate: MemoryCandidate;
  readonly existing_memories?: readonly RankedMemoryItem[] | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
}

export interface DecisionResult {
  readonly decision: MemoryDecision;
  readonly target_primitive_id?: string | undefined;
  readonly importance_score: number;
  readonly confidence_score: number;
  readonly novelty_score: number;
  readonly usefulness_score: number;
  readonly rationale: string;
}

export interface DecisionEngineEvaluator {
  readonly name: string;
  evaluate(input: DecisionInput): Promise<DecisionResult>;
}
