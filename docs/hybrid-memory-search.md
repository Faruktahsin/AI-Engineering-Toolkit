# Hybrid Memory Search Architecture

> **Local-First Hybrid Memory Retrieval Combining SQLite FTS5 BM25 Keyword Search and Vector Embeddings with Reciprocal Rank Fusion (RRF).**

---

## 1. Overview & Motivation

Traditional LLM agent memory systems suffer from two distinct failure modes:
1. **Keyword-Only Memory (FTS5)**: Misses semantically similar concepts that use different vocabulary (e.g. querying `"customer support"` misses `"user help desk"`).
2. **Pure Vector Memory**: Struggles with exact keyword matches like technical error codes (`ERR_CONN_REFUSED`), product model IDs, or ULIDs.

**AI Engineering Toolkit (`AIET`)** solves this by unifying local **FTS5 BM25 Keyword Search** and **Vector Cosine Similarity** into a local-first **Hybrid Retrieval Engine**.

---

## 2. Architecture & Data Flow

```
[ Query Text ] -----------------------------+
      |                                     |
      v (FTS5 BM25 Keyword Match)           v (Embedding Provider)
+-------------------------------+   +-------------------------------+
|     SQLite fts_knowledge_index|   |   @aiet/embeddings            |
|     - BM25 rank score         |   |   - Generates Float32Array    |
+-------------------------------+   +-------------------------------+
      |                                     |
      |                                     v (Cosine Similarity Match)
      |                             +-------------------------------+
      |                             |   SQLite vector_embeddings    |
      |                             |   - Binary BLOB vectors       |
      +-----------------------------+-------------------------------+
                                    |
                                    v (Reciprocal Rank Fusion)
                    +-------------------------------+
                    |  RRF Combined Scoring Engine  |
                    |  - RRF = α/R_fts + (1-α)/R_vec|
                    +-------------------------------+
                                    |
                                    v
                       [ Top-K Hybrid Memory Results ]
```

---

## 3. Storage Schema (`vector_embeddings`)

Vectors are serialized as binary Float32Array blobs stored locally inside SQLite:

```sql
CREATE TABLE IF NOT EXISTS vector_embeddings (
  primitive_id TEXT PRIMARY KEY REFERENCES primitives_registry(id) ON DELETE CASCADE,
  dimensions INTEGER NOT NULL,
  embedding_blob BLOB NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

## 4. Reciprocal Rank Fusion (RRF) Algorithm

Combined ranking is computed using Reciprocal Rank Fusion:

$$\text{RRF}(p) = \frac{\alpha}{\text{rank}_{\text{fts}}(p) + 60} + \frac{1 - \alpha}{\text{rank}_{\text{vec}}(p) + 60}$$

- $\alpha \in [0.0, 1.0]$: Weighting parameter balancing keyword precision ($\alpha = 1.0$) vs semantic recall ($\alpha = 0.0$). Default is `0.5`.
- Constant `$60$`: Prevents high-ranking outlier dominance.

---

## 5. Usage Code Example

```typescript
import {
  MockEmbeddingProvider,
  PAKBStorageRepository,
  createDatabaseConnection,
} from "@aiet/core";

// 1. Initialize Storage & Embedding Provider
const db = createDatabaseConnection({ filename: "./agent-memory.db" });
const storage = new PAKBStorageRepository(db);
const embedder = new MockEmbeddingProvider(128);

// 2. Attach Vector Embedding to a Primitive
const primitiveId = "ast_01J4X89K9Z1A2B3C4D5E6F7G84";
const textToEmbed = "CloudScale AI platform includes 100 free GPU node hours per month.";
const embedding = await embedder.embed(textToEmbed);

await storage.upsertVectorEmbedding(primitiveId, embedding);

// 3. Execute Hybrid Memory Search
const queryText = "GPU node pricing hours";
const queryVector = await embedder.embed(queryText);

const hybridResults = await storage.searchHybrid(queryText, queryVector, {
  limit: 5,
  alpha: 0.5,
});

console.log("Top Hybrid Memory Matches:", hybridResults.results);
```

---

## 6. Privacy & Local-First Invariant

AIET hybrid memory search operates 100% locally:
- Vector embeddings are serialized directly into the local SQLite WAL database file (`.db`).
- Zero external vector database servers or cloud endpoints are required.
