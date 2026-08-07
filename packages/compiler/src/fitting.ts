import {
  EnforcementSeverity,
  PAKBErrorCode,
  PreambleBudgetExceededError,
  SchemaValidationError,
} from "@aiet/schema";
import type { BudgetFitResult } from "./budget";
import type { RankedPrimitive } from "./ranking";
import { AssignedTier } from "./tiers";
import { DEFAULT_TIER0_BUDGET, PriorityTier } from "./token-profiler";

export class BudgetFitter {
  /**
   * Calculates total estimated tokens for an array of ranked primitives.
   */
  public calculateUsage(primitives: readonly RankedPrimitive[]): number {
    if (!Array.isArray(primitives) || primitives.length === 0) {
      return 0;
    }
    let total = 0;
    for (const item of primitives) {
      total += item.estimated_tokens;
    }
    return total;
  }

  /**
   * Calculates remaining budget available given usage and maximum budget.
   */
  public calculateRemaining(
    currentUsage: number,
    maxBudget: number = DEFAULT_TIER0_BUDGET,
  ): number {
    return Math.max(0, maxBudget - currentUsage);
  }

  /**
   * Determines whether an overflowing primitive should be demoted to Tier 1 or sent to Overflow.
   */
  public determineOverflowTier(item: RankedPrimitive): AssignedTier {
    const id = item.primitive.id;

    // Hard Directives cannot be demoted or overflowed
    if ("statement" in item.primitive && "enforcement" in item.primitive) {
      if (item.primitive.enforcement === EnforcementSeverity.HARD) {
        throw new PreambleBudgetExceededError(
          `Hard directive '${id}' cannot fit in Tier 0 preamble budget limit.`,
          PAKBErrorCode.PREAMBLE_BUDGET_EXCEEDED_ERROR,
          id,
        );
      }
      // Soft directives demoted to Tier 1
      return AssignedTier.TIER_1;
    }

    // Entities -> Tier 1
    if (id.startsWith("ent_")) {
      return AssignedTier.TIER_1;
    }

    // Assertions -> Tier 1
    if (id.startsWith("ast_")) {
      return AssignedTier.TIER_1;
    }

    // Directives (fallback) -> Tier 1
    if (id.startsWith("dir_")) {
      return AssignedTier.TIER_1;
    }

    // Events -> Overflow
    if (id.startsWith("evt_")) {
      return AssignedTier.OVERFLOW;
    }

    // Relations -> Overflow
    if (id.startsWith("rel_")) {
      return AssignedTier.OVERFLOW;
    }

    return AssignedTier.OVERFLOW;
  }

  /**
   * Assigns a primitive to Tier 0, Tier 1, or Overflow based on budget availability and primitive rules.
   */
  public assignTier(item: RankedPrimitive, remainingBudget: number): AssignedTier {
    // Events and relations are never eligible for Tier 0 and always go to Overflow.
    if (item.primitive.id.startsWith("evt_") || item.primitive.id.startsWith("rel_")) {
      return AssignedTier.OVERFLOW;
    }

    // Only Always-On primitives may be assigned to Tier 0.
    if (item.tier !== PriorityTier.TIER_0_ALWAYS_ON) {
      return this.determineOverflowTier(item);
    }

    if (item.estimated_tokens <= remainingBudget) {
      return AssignedTier.TIER_0;
    }

    const isHardDirective =
      "enforcement" in item.primitive && item.primitive.enforcement === EnforcementSeverity.HARD;

    if (isHardDirective) {
      throw new PreambleBudgetExceededError(
        `Hard directive '${item.primitive.id}' with cost ${item.estimated_tokens} tokens exceeds remaining Tier 0 preamble budget of ${remainingBudget} tokens.`,
        PAKBErrorCode.PREAMBLE_BUDGET_EXCEEDED_ERROR,
        item.primitive.id,
      );
    }

    return this.determineOverflowTier(item);
  }

  /**
   * Fits ranked primitives deterministically into Tier 0, Tier 1, and Overflow.
   */
  public fit(
    rankedPrimitives: readonly RankedPrimitive[],
    maxBudget: number = DEFAULT_TIER0_BUDGET,
  ): BudgetFitResult {
    if (!Array.isArray(rankedPrimitives)) {
      throw new SchemaValidationError(
        "Budget fitting failed: input must be an array of RankedPrimitive objects.",
        PAKBErrorCode.SCHEMA_VALIDATION_ERROR,
      );
    }

    if (maxBudget < 0) {
      throw new SchemaValidationError(
        `Budget fitting failed: budget limit cannot be negative (${maxBudget}).`,
        PAKBErrorCode.SCHEMA_VALIDATION_ERROR,
      );
    }

    const tier0: RankedPrimitive[] = [];
    const tier1: RankedPrimitive[] = [];
    const overflow: RankedPrimitive[] = [];

    let currentTier0Tokens = 0;

    for (const item of rankedPrimitives) {
      if (!item || typeof item !== "object" || !item.primitive) {
        throw new SchemaValidationError(
          "Budget fitting failed: array contains invalid RankedPrimitive element.",
          PAKBErrorCode.SCHEMA_VALIDATION_ERROR,
        );
      }

      const remaining = this.calculateRemaining(currentTier0Tokens, maxBudget);
      const assigned = this.assignTier(item, remaining);

      if (assigned === AssignedTier.TIER_0) {
        tier0.push(item);
        currentTier0Tokens += item.estimated_tokens;
      } else if (assigned === AssignedTier.TIER_1) {
        tier1.push(item);
      } else {
        overflow.push(item);
      }
    }

    const tier1Tokens = this.calculateUsage(tier1);
    const overflowTokens = this.calculateUsage(overflow);
    const remainingTokens = this.calculateRemaining(currentTier0Tokens, maxBudget);

    return {
      tier0: Object.freeze(tier0),
      tier1: Object.freeze(tier1),
      overflow: Object.freeze(overflow),
      tier0_tokens: currentTier0Tokens,
      tier1_tokens: tier1Tokens,
      overflow_tokens: overflowTokens,
      remaining_tokens: remainingTokens,
      budget: maxBudget,
    };
  }
}
