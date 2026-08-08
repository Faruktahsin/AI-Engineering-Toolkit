import { RuleBasedDecisionEvaluator } from "./rule-evaluator";
import type { DecisionEngineEvaluator, DecisionInput, DecisionResult } from "./types";

export * from "./llm-evaluator";
export * from "./rule-evaluator";
export * from "./types";

export async function evaluateMemoryCandidate(
  input: DecisionInput,
  evaluator?: DecisionEngineEvaluator | undefined,
): Promise<DecisionResult> {
  const engine = evaluator ?? new RuleBasedDecisionEvaluator();
  return engine.evaluate(input);
}
