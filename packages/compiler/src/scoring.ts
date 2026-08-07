import {
  ActivationClass,
  type AnyPrimitive,
  EnforcementSeverity,
  SensitivityTier,
} from "@aiet/schema";
import { PriorityTier } from "./token-profiler";

export enum RankingReason {
  SECURITY = "SECURITY",
  OWNER = "OWNER",
  STYLE = "STYLE",
  CONTEXT = "CONTEXT",
  HISTORY = "HISTORY",
  GRAPH = "GRAPH",
  DEFAULT = "DEFAULT",
}

export interface PrimitiveScore {
  readonly priority_score: number;
  readonly ranking_reason: RankingReason;
  readonly tier: PriorityTier;
}

/**
 * Calculates priority_score, ranking_reason, and tier for a primitive
 * adhering strictly to ADR-004 §4.1.
 */
export function scorePrimitive(primitive: AnyPrimitive): PrimitiveScore {
  if (
    primitive.sensitivity === SensitivityTier.RESTRICTED ||
    primitive.activation === ActivationClass.RESTRICTED
  ) {
    return {
      priority_score: 99,
      ranking_reason: RankingReason.DEFAULT,
      tier: PriorityTier.TIER_2_RESTRICTED,
    };
  }

  // Determine Tier
  const tier =
    primitive.activation === ActivationClass.ALWAYS_ON
      ? PriorityTier.TIER_0_ALWAYS_ON
      : PriorityTier.TIER_1_ON_DEMAND;

  // 1. Hard Security Directives
  if ("statement" in primitive && "enforcement" in primitive) {
    if (primitive.enforcement === EnforcementSeverity.HARD && primitive.domain === "security") {
      return {
        priority_score: 1,
        ranking_reason: RankingReason.SECURITY,
        tier,
      };
    }
  }

  // 2. Owner Entity
  if ("type" in primitive && primitive.type === "owner") {
    return {
      priority_score: 2,
      ranking_reason: RankingReason.OWNER,
      tier,
    };
  }

  // 3. Safety / Code Style Hard Directives
  if ("statement" in primitive && "enforcement" in primitive) {
    if (
      primitive.enforcement === EnforcementSeverity.HARD &&
      (primitive.domain === "safety" || primitive.domain === "code_style")
    ) {
      return {
        priority_score: 3,
        ranking_reason: RankingReason.STYLE,
        tier,
      };
    }

    // 4. Global Style Soft Directives
    if (primitive.enforcement === EnforcementSeverity.SOFT && primitive.domain === "global_style") {
      return {
        priority_score: 4,
        ranking_reason: RankingReason.STYLE,
        tier,
      };
    }
  }

  // 5. Always-On Directives / Entities
  if (primitive.activation === ActivationClass.ALWAYS_ON) {
    return {
      priority_score: 5,
      ranking_reason: RankingReason.CONTEXT,
      tier,
    };
  }

  // 6. On-Demand Directives / Entities
  if (primitive.id.startsWith("ent_") || primitive.id.startsWith("dir_")) {
    return {
      priority_score: 6,
      ranking_reason: RankingReason.CONTEXT,
      tier,
    };
  }

  // 7. Events (History)
  if (primitive.id.startsWith("evt_")) {
    return {
      priority_score: 7,
      ranking_reason: RankingReason.HISTORY,
      tier,
    };
  }

  // 8. Assertions
  if (primitive.id.startsWith("ast_")) {
    return {
      priority_score: 8,
      ranking_reason: RankingReason.DEFAULT,
      tier,
    };
  }

  // 9. Relations
  if (primitive.id.startsWith("rel_")) {
    return {
      priority_score: 9,
      ranking_reason: RankingReason.GRAPH,
      tier,
    };
  }

  return {
    priority_score: 10,
    ranking_reason: RankingReason.DEFAULT,
    tier,
  };
}
