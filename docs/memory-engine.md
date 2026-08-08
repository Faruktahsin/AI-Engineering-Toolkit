# Production Memory Engine Architecture

> **Deterministic Dual-Tier Memory System for Autonomous AI Agents: Short-Term Working Memory & Long-Term Persistent Memory with Relevance, Importance, Recency Decay, and Consolidation.**

---

## 1. Dual-Tier Memory Architecture Overview

AIET structures agent memory into two operational tiers:

```
                                    +-----------------------------------------------+
                                    |              AI AGENT RUNTIME                 |
                                    +-----------------------------------------------+
                                            |                              |
                                (1. Short-Term Context)          (2. Long-Term Memory)
                                            v                              v
                              +--------------------------+   +--------------------------+
                              |    @aiet/compiler        |   |     @aiet/storage        |
                              |  - 7-Stage Token Budget  |   |  - SQLite WAL Engine     |
                              |  - Reproducible Preambles|   |  - FTS5 Keyword Index    |
                              |  - AGENTS.md / CLAUDE.md |   |  - Vector Embeddings     |
                              +--------------------------+   |  - Memory Lifecycle      |
                                                             +--------------------------+
```

### 1. Short-Term Working Memory
- **Purpose**: Fits active task rules, system directives, and high-priority entities into strict token budgets (e.g. 500 tokens).
- **Engine**: `@aiet/compiler` 7-stage deterministic compilation pipeline.

### 2. Long-Term Persistent Memory
- **Purpose**: Stores historical assertions, entity relationships, event milestones, and facts over indefinite periods.
- **Engine**: `@aiet/storage` SQLite WAL database with `fts_knowledge_index`, `vector_embeddings`, and `memory_lifecycle` tracking.

---

## 2. Memory Lifecycle Tracking (`memory_lifecycle`)

Every memory primitive in AIET tracks 5 core lifecycle metrics:

| Field | Type | Description |
| :--- | :--- | :--- |
| `importance_score` | `REAL` (0.0 - 1.0) | Weighted priority assigned by human user or agent proposal. |
| `access_count` | `INTEGER` | Total number of times this memory primitive has been retrieved. |
| `created_at` | `TEXT` (ISO UTC) | Initial creation timestamp. |
| `last_accessed_at` | `TEXT` (ISO UTC) | Timestamp of most recent retrieval touch. |
| `metadata` | `JSON` | Optional custom key-value metadata. |

---

## 3. Multi-Factor Memory Ranking & Retrieval Algorithm

When an agent queries long-term memory via `retrieveRankedMemories(query, queryEmbedding, options)`, AIET ranks primitives using a 3-factor composite score:

$$\text{FinalScore} = \text{RRFScore} \times (1 + \beta \times \text{ImportanceScore}) \times \text{RecencyScore}$$

1. **Relevance ($\text{RRFScore}$)**: Reciprocal Rank Fusion of SQLite FTS5 BM25 keyword matching and Vector Cosine Similarity:
   $$\text{RRFScore} = \frac{\alpha}{\text{rank}_{\text{fts}} + 60} + \frac{1 - \alpha}{\text{rank}_{\text{vec}} + 60}$$

2. **Importance ($\text{ImportanceScore}$)**: Scales score based on importance weight $\beta$ (default `0.5`).

3. **Recency Decay ($\text{RecencyScore}$)**: Exponential decay based on age since last access:
   $$\text{RecencyScore} = \exp(-\lambda \times \Delta t)$$
   where $\lambda = \frac{\ln(2)}{T_{\text{half-life}}}$. Default half-life is 30 days.

---

## 4. Memory Consolidation & Merging

When duplicate or conflicting memories are identified, AIET provides atomic memory consolidation via `mergeMemories(primaryId, duplicateIds)`:
- Re-links all graph relations (`relations` table) from duplicate IDs to `primaryId`.
- Transfers vector embeddings to `primaryId` if not already present.
- Atomically deletes duplicate records from `primitives_registry`.

---

## 5. Usage Example

```typescript
import {
  OllamaEmbeddingProvider,
  PAKBStorageRepository,
  createDatabaseConnection,
} from "@aiet/core";

// 1. Initialize Storage & Local Ollama Embedding Provider
const db = createDatabaseConnection({ filename: "./agent-memory.db" });
const storage = new PAKBStorageRepository(db);
const embedder = new OllamaEmbeddingProvider({ model: "nomic-embed-text" });

// 2. Retrieve Ranked Memories with Importance & Recency Scoring
const query = "GPU cluster deployment policy";
const queryVec = await embedder.embed(query);

const rankedMemories = await storage.retrieveRankedMemories(query, queryVec, {
  limit: 5,
  alpha: 0.5,
  importance_weight: 0.5,
  recency_decay_half_life_days: 30,
});

console.log("Ranked Memory Results:", rankedMemories.results);
```
