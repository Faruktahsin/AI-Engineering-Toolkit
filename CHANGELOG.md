# Changelog

All notable changes to the **AI Engineering Toolkit (AIET)** infrastructure project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1] - 2026-08-12

### Fixed

- Removed ReDoS-prone URL normalization and contradiction parsing patterns.
- Added a clean-directory CLI onboarding smoke test to continuous integration.
- Declared Node.js 22.x as the supported runtime for native SQLite workflows.
- Corrected public documentation for compiler stages, local-first privacy boundaries, and the CLI package path.

### Changed

- Standardized the release workflow around stable v1 releases, dynamic GitHub release notes, and tag-to-package-version verification.

---

## [0.1.0-alpha] - 2026-08-08

### Added
- **Unified Core SDK (`@aiet/core`)**:
  - `createAIET()` factory and `AIETClient` unified facade.
  - Sub-clients: `MemoryClient`, `CompilerClient`, `GovernanceClient`, `DoctorClient`.
  - Exported `PAKBStorageRepository` on `aiet.storage`.
- **Developer CLI Product Layer (`@aiet/cli`)**:
  - Production CLI binary (`aiet`).
  - Commands: `aiet init`, `aiet doctor`, `aiet status`, `aiet connect`, `aiet compile`, `aiet memory`.
- **Autonomous Memory Formation Engine**:
  - Autonomous candidate extraction (`@aiet/extractor`).
  - Score-based decision engine (`@aiet/decision-engine`) supporting `CREATE`, `UPDATE`, `MERGE`, and `IGNORE`.
  - Scoring dimensions: importance, confidence, novelty, future usefulness, sensitivity.
- **Mandatory Safety & Governance Layer (`@aiet/governance`)**:
  - `memory_proposals` table for proposal lifecycle (`PENDING`, `APPROVED`, `REJECTED`).
  - `audit_log` tamper-evident ledger with JCS SHA-256 hash calculation.
  - Privacy boundary isolation (`PUBLIC`, `INTERNAL`, `RESTRICTED`).
- **Memory Consolidation Engine (`@aiet/consolidation`)**:
  - Duplicate detection (JCS hash equality, vector similarity).
  - Contradiction detection (preference conflicts, subject attribute contradictions, outdated facts).
  - Memory lineage tracking & lifecycle state management.
- **Deterministic Context Compiler (`@aiet/compiler`)**:
  - 7-stage compiler pipeline generating `AGENTS.md`, `CLAUDE.md`, and `.cursorrules`.
  - Token profiling and priority ranking.
  - JCS SHA-256 bit-for-bit reproducible build artifacts.
- **SQLite WAL Local Storage Engine (`@aiet/storage`)**:
  - SQLite WAL local database with FTS5 BM25 full-text search.
  - Vector embeddings table & cosine similarity search.
  - Recency decay and RRF hybrid retrieval algorithm.
- **Model Context Protocol Server (`@aiet/mcp-server`)**:
  - Full MCP server integration for Claude Code, Cursor, and Windsurf.
- **AI Agent Framework Adapters**:
  - `@aiet/adapter-vercel`: Vercel AI SDK memory provider and SSE streaming event format.
  - `@aiet/adapter-langgraph`: LangGraph checkpointer & memory state saver (`createAIETCheckpointer`).
  - `@aiet/adapter-openai-agents`: OpenAI Agents SDK function-calling tools (`createAIETAgentTools`).
- **Official Example Applications (`examples/`)**:
  - `examples/coding-agent`: Coding assistant with persistent developer memory & context compilation.
  - `examples/research-agent`: Research agent with knowledge consolidation & state checkpointing.
  - `examples/customer-support-agent`: Enterprise customer support agent with governance & streaming memory.
  - `examples/personal-assistant`: General AI personal assistant with agent tooling & memory explainability.
- **Documentation Suite**:
  - Architecture specifications, design docs, integration guides, examples guide, and release checklists.
