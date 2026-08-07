export interface Metric {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly minScore: number;
  readonly maxScore: number;
}

export interface Score {
  readonly metricId: string;
  readonly value: number;
  readonly normalizedValue: number; // 0.0 to 1.0
  readonly reasoning?: string;
}

export interface BenchmarkItem {
  readonly id: string;
  readonly input: unknown;
  readonly expectedOutput?: unknown;
  readonly metadata?: Record<string, unknown>;
}

export interface Benchmark {
  readonly id: string;
  readonly name: string;
  readonly items: readonly BenchmarkItem[];
}

export interface Evaluator<TInput = unknown, TOutput = unknown> {
  readonly metrics: readonly Metric[];
  evaluate(
    input: TInput,
    output: TOutput,
    benchmarkItem?: BenchmarkItem,
  ): Promise<readonly Score[]>;
}
