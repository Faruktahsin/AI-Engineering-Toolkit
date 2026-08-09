export interface IRMetricResults {
  precisionAt1: number;
  precisionAt3: number;
  precisionAt5: number;
  recallAt1: number;
  recallAt3: number;
  recallAt5: number;
  mrr: number;
  ndcgAt3: number;
  ndcgAt5: number;
}

/**
 * Calculates Precision@K
 */
export function calculatePrecisionAtK(
  retrievedIds: string[],
  relevantIds: string[],
  k: number,
): number {
  if (k <= 0) return 0;
  const topK = retrievedIds.slice(0, k);
  const relevantSet = new Set(relevantIds);
  let hits = 0;
  for (const id of topK) {
    if (relevantSet.has(id)) {
      hits++;
    }
  }
  return hits / k;
}

/**
 * Calculates Recall@K
 */
export function calculateRecallAtK(
  retrievedIds: string[],
  relevantIds: string[],
  k: number,
): number {
  if (relevantIds.length === 0) return 1.0;
  const topK = retrievedIds.slice(0, k);
  const relevantSet = new Set(relevantIds);
  let hits = 0;
  for (const id of topK) {
    if (relevantSet.has(id)) {
      hits++;
    }
  }
  return hits / relevantIds.length;
}

/**
 * Calculates Mean Reciprocal Rank (MRR) for a single query
 */
export function calculateReciprocalRank(retrievedIds: string[], relevantIds: string[]): number {
  const relevantSet = new Set(relevantIds);
  for (let i = 0; i < retrievedIds.length; i++) {
    const id = retrievedIds[i];
    if (id && relevantSet.has(id)) {
      return 1.0 / (i + 1);
    }
  }
  return 0.0;
}

/**
 * Calculates nDCG@K (Normalized Discounted Cumulative Gain)
 */
export function calculateNDCGAtK(retrievedIds: string[], relevantIds: string[], k: number): number {
  const relevantSet = new Set(relevantIds);
  let dcg = 0;
  for (let i = 0; i < Math.min(retrievedIds.length, k); i++) {
    const id = retrievedIds[i];
    const rel = id && relevantSet.has(id) ? 1 : 0;
    if (rel > 0) {
      dcg += rel / Math.log2(i + 2);
    }
  }

  let idcg = 0;
  const idealRelevanceCount = Math.min(relevantIds.length, k);
  for (let i = 0; i < idealRelevanceCount; i++) {
    idcg += 1 / Math.log2(i + 2);
  }

  if (idcg === 0) return 0;
  return dcg / idcg;
}

/**
 * Calculates Token Efficiency % (Reduction vs raw prompt dumps)
 */
export function calculateTokenEfficiency(rawTokens: number, compiledTokens: number): number {
  if (rawTokens <= 0) return 0;
  const reduction = ((rawTokens - compiledTokens) / rawTokens) * 100;
  return Math.max(0, Number(reduction.toFixed(2)));
}

/**
 * Calculates Budget Compliance % (100% if compiled <= budget, 0% if exceeded)
 */
export function calculateBudgetCompliance(compiledTokens: number, budgetLimit: number): number {
  return compiledTokens <= budgetLimit ? 100.0 : 0.0;
}
