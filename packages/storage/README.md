# `@aiet/storage`

> Local-first SQLite WAL memory database, FTS5 BM25 search, vector embeddings, and Reciprocal Rank Fusion (RRF) hybrid retrieval for **AIET**.

---

## Features

- **Local-First SQLite WAL**: Fast, embedded relational database with zero external server dependencies.
- **Full-Text Search (FTS5)**: BM25 rank scoring over entity names, directives, assertions, and events.
- **Hybrid Retrieval**: Combines keyword FTS5 BM25 scores and high-dimensional vector cosine similarity via Reciprocal Rank Fusion (RRF).
- **Memory Lifecycle Engine**: Recency decay half-life, access frequency counters, and importance scoring.
