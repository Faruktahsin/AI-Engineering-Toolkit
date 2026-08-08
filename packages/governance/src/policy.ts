import type { DecisionResult } from "@aiet/decision-engine";
import type { MemoryCandidate } from "@aiet/extractor";
import { SensitivityTier } from "@aiet/schema";
import type { GovernancePolicyEvaluation } from "./types";

export function evaluateGovernancePolicy(
  candidate: MemoryCandidate,
  decisionResult: DecisionResult,
): GovernancePolicyEvaluation {
  const prim = candidate.candidate;

  // Rule 1: Restricted / Sensitive Memory -> REQUIRE APPROVAL
  if (prim.sensitivity === SensitivityTier.RESTRICTED) {
    return {
      mode: "require_approval",
      reasoning:
        "Candidate contains sensitive data / restricted credentials. Requires user approval.",
    };
  }

  // Rule 2: Merge / Structural Mutation Operations -> REQUIRE APPROVAL
  if (decisionResult.decision === "MERGE") {
    return {
      mode: "require_approval",
      reasoning: "Merge decision mutates primitive relationship graphs. Requires user approval.",
    };
  }

  // Rule 3: Medium Confidence (0.60 to 0.85) -> REQUIRE APPROVAL
  if (decisionResult.confidence_score < 0.85) {
    return {
      mode: "require_approval",
      reasoning: `Confidence score (${decisionResult.confidence_score.toFixed(2)}) is below 0.85 auto-apply threshold. Requires user approval.`,
    };
  }

  // Rule 4: High Confidence, Non-Sensitive CREATE/UPDATE -> AUTO APPLY
  return {
    mode: "auto_apply",
    reasoning: "High confidence non-sensitive proposal meeting all auto-apply criteria.",
  };
}
