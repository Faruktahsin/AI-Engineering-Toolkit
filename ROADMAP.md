# AI Engineering Toolkit: Master Roadmap

This roadmap outlines the official execution plan for the **AI Engineering Toolkit (AIET)** and its flagship subsystem **PAKB**.

---

## 🟢 Phase 1: Production Hardening (Completed)
- [x] **Error Architecture Consolidation**: Consolidated domain and application exceptions into `@aiet/errors`.
- [x] **MCP Error Standardization**: Standardized `PAKBError`, `SecurityRedactionError`, and `SchemaValidationError` responses across MCP tool executors.
- [x] **Core SDK Elevation**: Elevated `@aiet/core` as the primary public SDK entry point and made `@aiet/pakb` a clean alias.
- [x] **Zero Secret Exposure**: Added secret scanning and zero-width decontamination sanitization.

---

## 🟢 Phase 2: Developer Experience (Completed)
- [x] **CLI Initialization System (`pakb init`)**: Project bootstrapping generating `pakb.config.json` and 5 primitive subdirectories with sample files.
- [x] **CLI Live Watch Mode (`pakb compile --watch`)**: `chokidar`-powered background watcher automatically recompiling context artifacts on file change.
- [x] **Zod Configuration Validation**: Integrated Zod `PAKBConfigSchema` and safe parsing into `@aiet/config` and `@aiet/cli`.
- [x] **Developer Documentation**: Created [`docs/getting-started.md`](docs/getting-started.md) and [`docs/architecture-overview.md`](docs/architecture-overview.md).
- [x] **Real-World Consumer Example**: Created working customer support agent project under [`examples/customer-support-agent`](examples/customer-support-agent).

---

## 🟡 Phase 3: Framework Adapters & Ecosystem Integration (Upcoming)
- [ ] **LangChain / LangGraph Adapter**: `@aiet/adapter-langchain` for injecting compiled PAKB prompt preambles into LangChain messages.
- [ ] **Vercel AI SDK Adapter**: `@aiet/adapter-vercel` for streaming context preambles directly into Next.js App Router AI endpoints.
- [ ] **MCP Client SDK**: `@aiet/mcp-client` for connecting TS AI applications directly to remote PAKB MCP servers.

---

## 🔵 Phase 4: Hybrid & Semantic Vector Search (Upcoming)
- [ ] **Vector Embedding Engine**: Pluggable embedding providers (OpenAI, Cohere, local transformers) for vector indexing.
- [ ] **Hybrid Search Ranking**: Reciprocal Rank Fusion (RRF) combining FTS5 BM25 keyword search with dense vector similarity.
- [ ] **Semantic Memory Clustering**: Automatic clustering of related assertions and directives into topic sub-graphs.

---

## 🟣 Phase 5: Enterprise Storage & Distributed Scale (Upcoming)
- [ ] **PostgreSQL + pgvector Adapter**: `@aiet/storage-pg` for multi-tenant enterprise agent memory clusters.
- [ ] **Redis Distributed Cache**: `@aiet/cache-redis` for sub-millisecond preamble artifact caching in high-throughput microservices.
- [ ] **Enterprise Role-Based Access Control (RBAC)**: Fine-grained tenant isolation and field-level encryption.
