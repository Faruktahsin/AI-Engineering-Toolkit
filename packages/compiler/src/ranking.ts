import type { AnyPrimitive } from "@aiet/schema";
import { type RankingReason, scorePrimitive } from "./scoring";
import { type PriorityTier, estimatePrimitiveCost } from "./token-profiler";

export interface RankedPrimitive {
  readonly primitive: AnyPrimitive;
  readonly priority_score: number;
  readonly ranking_reason: RankingReason;
  readonly estimated_tokens: number;
  readonly tier: PriorityTier;
}

export class RankingEngine {
  /**
   * Scores an individual primitive and computes its token cost.
   */
  public scorePrimitive(primitive: AnyPrimitive): RankedPrimitive {
    const score = scorePrimitive(primitive);
    const estimatedTokens = estimatePrimitiveCost(primitive);

    return {
      primitive,
      priority_score: score.priority_score,
      ranking_reason: score.ranking_reason,
      tier: score.tier,
      estimated_tokens: estimatedTokens,
    };
  }

  /**
   * Compares two RankedPrimitive objects deterministically.
   * Primary: priority_score ASC
   * Secondary: last_verified timestamp DESC (newest first)
   * Tertiary: ULID id lexicographical byte comparison ASC
   */
  public compare(a: RankedPrimitive, b: RankedPrimitive): number {
    // Primary Sort: priority_score ASC
    if (a.priority_score !== b.priority_score) {
      return a.priority_score - b.priority_score;
    }

    // Secondary Sort: last_verified DESC (most recent first)
    if (a.primitive.last_verified !== b.primitive.last_verified) {
      return b.primitive.last_verified.localeCompare(a.primitive.last_verified);
    }

    // Tertiary Sort: id string lexicographical ASC
    return a.primitive.id.localeCompare(b.primitive.id);
  }

  /**
   * Performs a stable, deterministic sort on ranked primitives.
   */
  public stableSort(ranked: readonly RankedPrimitive[]): RankedPrimitive[] {
    return [...ranked].sort((a, b) => this.compare(a, b));
  }

  /**
   * Ranks and sorts an array of primitives deterministically.
   */
  public rank(primitives: readonly AnyPrimitive[]): readonly RankedPrimitive[] {
    const scoredList = primitives.map((prim) => this.scorePrimitive(prim));
    return Object.freeze(this.stableSort(scoredList));
  }
}
