import type { BudgetFitResult } from "./budget";

export interface EmitterResult {
  readonly target: string;
  readonly content: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly line_count: number;
}

export interface IEmitter {
  readonly target: string;
  emit(fitResult: BudgetFitResult, compilerVersion?: string): EmitterResult;
}
