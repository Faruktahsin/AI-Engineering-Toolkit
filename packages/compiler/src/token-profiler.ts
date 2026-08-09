import {
  ActivationClass,
  type AnyPrimitive,
  EnforcementSeverity,
  PAKBErrorCode,
  PreambleBudgetExceededError,
  SensitivityTier,
} from "@aiet/schema";
import { type Tiktoken, get_encoding } from "tiktoken";

// Loading the cl100k vocabulary is expensive. The compiler profiles many
// primitives per pipeline run, so reuse one process-local encoder instead of
// constructing and freeing it for every primitive.
let cl100kEncoding: Tiktoken | undefined;

function getCl100kEncoding(): Tiktoken {
  cl100kEncoding ??= get_encoding("cl100k_base");
  return cl100kEncoding;
}

export enum PriorityTier {
  TIER_0_ALWAYS_ON = "tier0_always_on",
  TIER_1_ON_DEMAND = "tier1_on_demand",
  TIER_2_RESTRICTED = "tier2_restricted",
}

export interface TokenProfile {
  readonly text_length: number;
  readonly token_count: number;
  readonly tokenizer: "cl100k_base";
}

export interface RankedPrimitive {
  readonly primitive: AnyPrimitive;
  readonly priority_rank: number;
  readonly tier: PriorityTier;
  readonly estimated_tokens: number;
}

export interface BudgetResult {
  readonly tier0_fitted: readonly RankedPrimitive[];
  readonly tier1_demoted: readonly RankedPrimitive[];
  readonly total_tokens: number;
  readonly remaining_budget: number;
  readonly budget_exceeded: boolean;
}

export const DEFAULT_TIER0_BUDGET = 500 as const;

/**
 * Returns exact cl100k_base token count for a text string using tiktoken.
 */
export function profileTokens(text: string): number {
  if (typeof text !== "string" || text.length === 0) {
    return 0;
  }
  return getCl100kEncoding().encode(text).length;
}

/**
 * Returns exact cl100k_base token count for an array of text strings.
 */
export function profileBatch(texts: readonly string[]): number[] {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }
  const enc = getCl100kEncoding();
  return texts.map((text) => {
    if (typeof text !== "string" || text.length === 0) {
      return 0;
    }
    return enc.encode(text).length;
  });
}

/**
 * Formats a primitive into its plain-text representation for token estimation.
 */
export function formatPrimitiveText(primitive: AnyPrimitive): string {
  if ("statement" in primitive && typeof primitive.statement === "string") {
    return `- [DIRECTIVE] ${primitive.statement}`;
  }
  if ("name" in primitive && typeof primitive.name === "string") {
    return `- [ENTITY] ${primitive.name} (${primitive.type})`;
  }
  if ("claim" in primitive && typeof primitive.claim === "string") {
    return `- [ASSERTION] ${primitive.claim}`;
  }
  if ("summary" in primitive && typeof primitive.summary === "string") {
    return `- [EVENT] ${primitive.summary}`;
  }
  if ("predicate" in primitive && typeof primitive.predicate === "string") {
    return `- [RELATION] ${primitive.source_id} ${primitive.predicate} ${primitive.target_id}`;
  }
  return `- [PRIMITIVE] ${primitive.id}`;
}

/**
 * Estimates exact cl100k_base token cost of a primitive.
 */
export function estimatePrimitiveCost(primitive: AnyPrimitive): number {
  const formattedText = formatPrimitiveText(primitive);
  return profileTokens(formattedText);
}

/**
 * Calculates remaining budget available given usage and maximum budget.
 */
export function calculateRemainingBudget(
  currentUsage: number,
  maxBudget: number = DEFAULT_TIER0_BUDGET,
): number {
  return Math.max(0, maxBudget - currentUsage);
}

/**
 * Calculates priority rank for a primitive per ADR-004 §4.1.
 */
export function getPriorityRank(primitive: AnyPrimitive): number {
  if (
    primitive.activation === ActivationClass.RESTRICTED ||
    primitive.sensitivity === SensitivityTier.RESTRICTED
  ) {
    return 99; // Restricted items
  }

  if (primitive.activation === ActivationClass.ALWAYS_ON) {
    if ("statement" in primitive && "enforcement" in primitive) {
      if (primitive.enforcement === EnforcementSeverity.HARD && primitive.domain === "security") {
        return 1;
      }
      if (
        primitive.enforcement === EnforcementSeverity.HARD &&
        (primitive.domain === "code_style" || primitive.domain === "safety")
      ) {
        return 3;
      }
      if (
        primitive.enforcement === EnforcementSeverity.SOFT &&
        primitive.domain === "global_style"
      ) {
        return 4;
      }
    }

    if ("type" in primitive && primitive.type === "owner") {
      return 2;
    }

    return 5;
  }

  return 6; // On-Demand
}

/**
 * Sorts primitives deterministically per ADR-004 §4.1:
 * Primary Sort: Priority Rank ASC
 * Secondary Sort: last_verified timestamp DESC
 * Tertiary Sort: id string lexicographical UTF-8 byte comparison ASC
 */
export function sortByPriority(primitives: readonly AnyPrimitive[]): RankedPrimitive[] {
  const rankedList: RankedPrimitive[] = primitives.map((prim) => {
    const rank = getPriorityRank(prim);
    let tier = PriorityTier.TIER_1_ON_DEMAND;
    if (
      prim.sensitivity === SensitivityTier.RESTRICTED ||
      prim.activation === ActivationClass.RESTRICTED
    ) {
      tier = PriorityTier.TIER_2_RESTRICTED;
    } else if (prim.activation === ActivationClass.ALWAYS_ON) {
      tier = PriorityTier.TIER_0_ALWAYS_ON;
    }

    const estimatedTokens = estimatePrimitiveCost(prim);

    return {
      primitive: prim,
      priority_rank: rank,
      tier,
      estimated_tokens: estimatedTokens,
    };
  });

  return rankedList.sort((a, b) => {
    // 1. Primary Sort: priority_rank ASC
    if (a.priority_rank !== b.priority_rank) {
      return a.priority_rank - b.priority_rank;
    }

    // 2. Secondary Sort: last_verified DESC (newest first)
    if (a.primitive.last_verified !== b.primitive.last_verified) {
      return b.primitive.last_verified.localeCompare(a.primitive.last_verified);
    }

    // 3. Tertiary Sort: id lexicographical ASC
    return a.primitive.id.localeCompare(b.primitive.id);
  });
}

/**
 * Fits candidate primitives into Tier 0 preamble budget (default 500 tokens).
 * Demotes soft directives exceeding budget to Tier 1.
 * Throws PreambleBudgetExceededError if hard constraints exceed budget.
 */
export function calculateBudget(
  primitives: readonly AnyPrimitive[],
  maxBudget: number = DEFAULT_TIER0_BUDGET,
): BudgetResult {
  const sortedCandidates = sortByPriority(primitives);

  const fitted: RankedPrimitive[] = [];
  const demoted: RankedPrimitive[] = [];
  let currentUsage = 0;
  let hardConstraintUsage = 0;

  for (const item of sortedCandidates) {
    if (item.tier === PriorityTier.TIER_2_RESTRICTED) {
      continue; // Exclude restricted items
    }

    if (item.tier === PriorityTier.TIER_0_ALWAYS_ON) {
      const isHard =
        "enforcement" in item.primitive && item.primitive.enforcement === EnforcementSeverity.HARD;

      if (isHard) {
        hardConstraintUsage += item.estimated_tokens;
        if (hardConstraintUsage > maxBudget) {
          throw new PreambleBudgetExceededError(
            `Hard security/safety constraints exceed Tier 0 preamble budget of ${maxBudget} tokens (current hard constraint total: ${hardConstraintUsage} tokens).`,
            PAKBErrorCode.PREAMBLE_BUDGET_EXCEEDED_ERROR,
          );
        }
      }

      if (currentUsage + item.estimated_tokens <= maxBudget) {
        fitted.push(item);
        currentUsage += item.estimated_tokens;
      } else {
        if (isHard) {
          throw new PreambleBudgetExceededError(
            `Hard constraint '${item.primitive.id}' exceeds Tier 0 preamble budget limit of ${maxBudget} tokens.`,
            PAKBErrorCode.PREAMBLE_BUDGET_EXCEEDED_ERROR,
            item.primitive.id,
          );
        }
        // Demote soft directive to Tier 1 MCP
        demoted.push(item);
      }
    } else {
      demoted.push(item);
    }
  }

  return {
    tier0_fitted: fitted,
    tier1_demoted: demoted,
    total_tokens: currentUsage,
    remaining_budget: calculateRemainingBudget(currentUsage, maxBudget),
    budget_exceeded: false,
  };
}
