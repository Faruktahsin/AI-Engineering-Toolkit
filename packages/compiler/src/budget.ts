import type { RankedPrimitive } from "./ranking";

export interface BudgetFitResult {
  readonly tier0: readonly RankedPrimitive[];
  readonly tier1: readonly RankedPrimitive[];
  readonly overflow: readonly RankedPrimitive[];
  readonly tier0_tokens: number;
  readonly tier1_tokens: number;
  readonly overflow_tokens: number;
  readonly remaining_tokens: number;
  readonly budget: number;
}
