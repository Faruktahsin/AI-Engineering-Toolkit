# Autonomous Memory Decision Engine (`@aiet/decision-engine`)

> **Intelligence Layer for Memory Candidate Evaluation, Novelty Scoring, Importance Rating, and Persistence Decisions (`CREATE`, `UPDATE`, `MERGE`, `IGNORE`).**

---

## 1. Overview

`@aiet/decision-engine` acts as the intelligence layer of AIET's **Autonomous Memory Formation System**. It evaluates candidate memory primitives emitted by `@aiet/extractor` against active long-term memories retrieved from `@aiet/storage` to decide whether a candidate should be ignored, created, updated, or merged.

---

## 2. Decision Pipeline & Scoring Model

```
[ Memory Candidate (@aiet/extractor) ] + [ Existing Memories (@aiet/storage) ]
                                   |
                                   v
                   [ Decision Engine Evaluator ]
                                   |
           +-----------------------+-----------------------+
           |                       |                       |
    (Transient/Low Conf)      (High Novelty)        (High Similarity)
           |                       |                       |
           v                       v                       v
       [ IGNORE ]              [ CREATE ]          [ UPDATE / MERGE ]
```

### Multi-Factor Scoring Formula

$$\text{EvaluationScore} = w_1 \cdot \text{Novelty} + w_2 \cdot \text{Importance} + w_3 \cdot \text{Usefulness} \cdot \text{Confidence}$$

| Metric | Range | Description |
| :--- | :--- | :--- |
| `importance_score` | `0.0 - 1.0` | Priority rating (Directives / Safety = `0.9+`, Entities = `0.8`, Facts = `0.7`). |
| `confidence_score` | `0.0 - 1.0` | Extraction confidence score; candidates below `0.6` are automatically ignored. |
| `novelty_score` | `0.0 - 1.0` | $1.0 - \text{highestMatchScore}$ against existing memory database. |
| `usefulness_score` | `0.0 - 1.0` | Estimated future utility score; transient statements (e.g. *"drinking coffee"*) get `0.1`. |

---

## 3. Decision Matrix

| Candidate Condition | Output Decision | Target Primitive ID |
| :--- | :--- | :--- |
| Transient state / Low usefulness ($< 0.3$) | `IGNORE` | N/A |
| Confidence score $< 0.6$ | `IGNORE` | N/A |
| High match similarity ($> 0.95$) against existing memory | `MERGE` | `target_primitive_id` |
| High match similarity ($0.85 - 0.95$) against existing memory | `UPDATE` | `target_primitive_id` |
| High novelty ($> 0.7$) & Usefulness ($\ge 0.4$) | `CREATE` | N/A |

---

## 4. Usage Example

```typescript
import {
  DeterministicExtractorProvider,
  RuleBasedDecisionEvaluator,
  evaluateMemoryCandidate,
} from "@aiet/core";

// 1. Extract candidate primitive from conversation turn
const extractor = new DeterministicExtractorProvider();
const extractionResult = await extractor.extract({
  messages: [{ role: "user", content: "I prefer TypeScript over JavaScript." }],
});

const candidate = extractionResult.candidates[0];

// 2. Evaluate candidate using Decision Engine
if (candidate) {
  const decisionResult = await evaluateMemoryCandidate({ candidate });

  console.log("Memory Decision:", decisionResult.decision); // "CREATE"
  console.log("Importance Score:", decisionResult.importance_score); // 0.9
  console.log("Rationale:", decisionResult.rationale);
}
```
