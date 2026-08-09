import { performance } from "node:perf_hooks";
import type { AnyPrimitive } from "@aiet/schema";
import { PAKBStorageRepository } from "@aiet/storage";
import type { GroundTruthDatasetSchema } from "../datasets/dataset-types";
import {
  calculateNDCGAtK,
  calculatePrecisionAtK,
  calculateRecallAtK,
  calculateReciprocalRank,
} from "../metrics/ir-metrics";

export interface RetrievalStrategyResult {
  strategy: "BM25_Lexical" | "Mock_Vector_Structural_Only" | "Hybrid_RRF";
  providerOrModelInfo: string;
  isQualityClaimValid: boolean;
  notes: string;
  metrics: {
    precisionAt1: number;
    precisionAt3: number;
    precisionAt5: number;
    recallAt1: number;
    recallAt3: number;
    recallAt5: number;
    mrr: number;
    ndcgAt3: number;
    ndcgAt5: number;
    meanRankingLatencyMs: number;
    p95RankingLatencyMs: number;
  };
}

export interface RetrievalBenchmarkSummary {
  corpusSize: number;
  results: RetrievalStrategyResult[];
  positiveMatchCount: number;
}

export async function runRetrievalHarness(
  dataset: GroundTruthDatasetSchema,
): Promise<RetrievalBenchmarkSummary> {
  const repo = new PAKBStorageRepository({ db_path: ":memory:" });

  const seededIdSet = new Set<string>();

  // 1. Seed repository directly using canonical ground-truth ULIDs
  for (const mem of dataset.memories) {
    seededIdSet.add(mem.id);

    const basePrimitive = {
      schema_version: "1.0.0",
      id: mem.id,
      created_at: "2026-08-08T12:00:00Z",
      updated_at: "2026-08-08T12:00:00Z",
      last_verified: "2026-08-08T12:00:00Z",
      sensitivity: "public",
      volatility: "low",
      activation: "always_on",
    };

    let primitive: AnyPrimitive;

    if (mem.entityType === "Directive") {
      primitive = {
        ...basePrimitive,
        statement: mem.content,
        enforcement: "hard",
        domain: "engineering",
      } as AnyPrimitive;
    } else if (mem.entityType === "Assertion") {
      primitive = {
        ...basePrimitive,
        claim: mem.content,
        evidence_type: "observed",
        type: "fact",
        status: "accepted",
      } as AnyPrimitive;
    } else if (mem.entityType === "Entity") {
      primitive = {
        ...basePrimitive,
        name: mem.content,
        type: "workstream",
      } as AnyPrimitive;
    } else {
      primitive = {
        ...basePrimitive,
        timestamp: "2026-08-08T12:00:00Z",
        summary: mem.content,
        type: "session_log",
      } as AnyPrimitive;
    }

    await repo.insertPrimitive(primitive);
  }

  // 2. Execute Benchmark Methodological Invariant Assertions
  if (dataset.memories.length === 0) {
    throw new Error("Benchmark Invariant Failure: Seed memory corpus is empty.");
  }

  if (dataset.testCases.length === 0) {
    throw new Error("Benchmark Invariant Failure: Test cases array is empty.");
  }

  for (const tc of dataset.testCases) {
    if (!tc.relevantMemoryIds || tc.relevantMemoryIds.length === 0) {
      throw new Error(
        `Benchmark Invariant Failure: Test case '${tc.id}' has empty relevance judgments.`,
      );
    }

    for (const relId of tc.relevantMemoryIds) {
      if (!seededIdSet.has(relId)) {
        throw new Error(
          `Benchmark Invariant Failure: Test case '${tc.id}' references relevant ID '${relId}' which does not exist in seeded corpus.`,
        );
      }
    }
  }

  // 3. Evaluate BM25 Lexical Benchmark Strategy
  const bm25Result = await evaluateStrategy(
    repo,
    dataset,
    "BM25_Lexical",
    "SQLite FTS5 (Lexical Only)",
    true,
    "Evaluates BM25 lexical keyword matching over SQLite FTS5 index.",
  );

  // 4. Evaluate Mock Vector Strategy (Structural Mechanics Only)
  const mockVectorResult = await evaluateStrategy(
    repo,
    dataset,
    "Mock_Vector_Structural_Only",
    "Deterministic Seed Vector (Structural Mechanics Only)",
    false,
    "Structural mechanics baseline; does not evaluate semantic embedding quality.",
  );

  // 5. Evaluate Hybrid RRF Strategy
  const hybridRrfResult = await evaluateStrategy(
    repo,
    dataset,
    "Hybrid_RRF",
    "Reciprocal Rank Fusion (k=60)",
    true,
    "Combines FTS5 BM25 lexical ranks and vector similarity via Reciprocal Rank Fusion (k=60).",
  );

  await repo.close();

  // 6. Self-Validation Assertion: Verify at least one positive retrieval match occurred
  const totalPositiveMatches =
    (bm25Result.metrics.precisionAt1 > 0 ? 1 : 0) +
    (hybridRrfResult.metrics.precisionAt1 > 0 ? 1 : 0);

  if (totalPositiveMatches === 0 && bm25Result.metrics.mrr === 0) {
    throw new Error(
      "Benchmark Invariant Failure: Zero positive retrieval matches detected across BM25 and Hybrid strategies. Check dataset query terms.",
    );
  }

  return {
    corpusSize: dataset.memories.length,
    results: [bm25Result, mockVectorResult, hybridRrfResult],
    positiveMatchCount: totalPositiveMatches,
  };
}

async function evaluateStrategy(
  repo: PAKBStorageRepository,
  dataset: GroundTruthDatasetSchema,
  strategy: "BM25_Lexical" | "Mock_Vector_Structural_Only" | "Hybrid_RRF",
  providerOrModelInfo: string,
  isQualityClaimValid: boolean,
  notes: string,
): Promise<RetrievalStrategyResult> {
  const p1List: number[] = [];
  const p3List: number[] = [];
  const p5List: number[] = [];
  const r1List: number[] = [];
  const r3List: number[] = [];
  const r5List: number[] = [];
  const mrrList: number[] = [];
  const ndcg3List: number[] = [];
  const ndcg5List: number[] = [];
  const latenciesMs: number[] = [];

  for (const tc of dataset.testCases) {
    const startTime = performance.now();
    let retrievedIds: string[] = [];

    if (strategy === "BM25_Lexical") {
      const res = await repo.searchFTS5(tc.query, { limit: 10 });
      retrievedIds = res.results.map((r) => r.id);
    } else if (strategy === "Mock_Vector_Structural_Only") {
      const syntheticVector = new Float32Array(384).fill(0.01 * tc.query.length);
      const res = await repo.searchVector(syntheticVector, { limit: 10 });
      retrievedIds = res.results.map((r) => r.primitive_id);
    } else {
      const res = await repo.searchHybrid(tc.query, null, { limit: 10 });
      retrievedIds = res.results.map((r) => r.primitive_id);
    }

    const endTime = performance.now();
    latenciesMs.push(endTime - startTime);

    const relevantIds = tc.relevantMemoryIds;

    p1List.push(calculatePrecisionAtK(retrievedIds, relevantIds, 1));
    p3List.push(calculatePrecisionAtK(retrievedIds, relevantIds, 3));
    p5List.push(calculatePrecisionAtK(retrievedIds, relevantIds, 5));

    r1List.push(calculateRecallAtK(retrievedIds, relevantIds, 1));
    r3List.push(calculateRecallAtK(retrievedIds, relevantIds, 3));
    r5List.push(calculateRecallAtK(retrievedIds, relevantIds, 5));

    mrrList.push(calculateReciprocalRank(retrievedIds, relevantIds));
    ndcg3List.push(calculateNDCGAtK(retrievedIds, relevantIds, 3));
    ndcg5List.push(calculateNDCGAtK(retrievedIds, relevantIds, 5));
  }

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const sortedLatencies = [...latenciesMs].sort((a, b) => a - b);
  const p95Idx = Math.floor(sortedLatencies.length * 0.95);

  return {
    strategy,
    providerOrModelInfo,
    isQualityClaimValid,
    notes,
    metrics: {
      precisionAt1: Number(avg(p1List).toFixed(4)),
      precisionAt3: Number(avg(p3List).toFixed(4)),
      precisionAt5: Number(avg(p5List).toFixed(4)),
      recallAt1: Number(avg(r1List).toFixed(4)),
      recallAt3: Number(avg(r3List).toFixed(4)),
      recallAt5: Number(avg(r5List).toFixed(4)),
      mrr: Number(avg(mrrList).toFixed(4)),
      ndcgAt3: Number(avg(ndcg3List).toFixed(4)),
      ndcgAt5: Number(avg(ndcg5List).toFixed(4)),
      meanRankingLatencyMs: Number(avg(latenciesMs).toFixed(3)),
      p95RankingLatencyMs: Number((sortedLatencies[p95Idx] ?? 0).toFixed(3)),
    },
  };
}
