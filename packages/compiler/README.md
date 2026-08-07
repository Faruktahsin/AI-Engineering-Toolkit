# `@aiet/compiler`

Deterministic `cl100k_base` token profiler, priority ranker, and context compiler pipeline for the Personal AI Knowledge Base (PAKB).

## Installation

```bash
pnpm add @aiet/compiler
```

## Usage

```typescript
import {
  profileTokens,
  profileBatch,
  sortByPriority,
  calculateBudget,
  DEFAULT_TIER0_BUDGET
} from "@aiet/compiler";

// 1. Exact cl100k_base Token Profiling
const tokenCount = profileTokens("Hello World"); // Exact tiktoken token count

// 2. Priority Sorting
const sortedPrimitives = sortByPriority(myPrimitives);

// 3. Tier 0 Preamble Budget Fitting (<=500 tokens)
const budgetResult = calculateBudget(myPrimitives, DEFAULT_TIER0_BUDGET);
console.log(`Tier 0 Fitted: ${budgetResult.tier0_fitted.length}`);
console.log(`Tier 1 Demoted: ${budgetResult.tier1_demoted.length}`);
```

## License

[MIT](../../LICENSE)
