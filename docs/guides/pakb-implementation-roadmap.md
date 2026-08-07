# Personal AI Knowledge Base (PAKB) — Implementation Roadmap v1.0

**Specification Title:** PAKB Implementation Roadmap v1.0  
**Status:** Frozen Normative Execution Plan  
**Publication Date:** 5 August 2026  
**Author:** Senior Software Architect  
**Engineering Capacity:** Single Senior Engineer Execution Model  
**Parent Specifications:** 
* `PAKB-Refactored-Domain-Model.md` (Domain Model v1.0)
* `PAKB-ADRs-v1.0.md` (Architecture Decision Records v1.0)
* `pakb-schema-v1.json` (JSON Schema v1.0)
* `PAKB-Storage-Semantics-v1.0.md` (Storage Semantics v1.0)
* `PAKB-SQLite-Storage-Architecture-v1.0.md` (SQLite Storage Architecture v1.0)
* `PAKB-MCP-Server-Architecture-v1.0.md` (MCP Server Architecture v1.0)
* `PAKB-Compiler-Architecture-v1.0.md` (Compiler Architecture v1.0)

---

## 1. Executive Summary & Execution Strategy

This document defines the canonical engineering execution plan for implementing the Personal AI Knowledge Base (PAKB) from scratch. The roadmap prioritizes **vertical slices**, **early validation**, and **zero architectural drift** against the frozen specifications.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CRITICAL PATH EXECUTION TIMELINE                     │
│                                                                         │
│  [M0: Bootstrap] ➔ [M1: Domain/Schema] ➔ [M2: SQLite/JCS Storage]      │
│         ➔ [M3: Local MCP Server] ➔ [M4: Context Compiler]               │
│         ➔ [M5: Unified CLI (v0.1)] ➔ [M6: CI/CD & Stable Release v1.0] │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Dependency Graph & Critical Path Analysis

### 2.1 Critical Path Order
Every component MUST be implemented according to the following strict dependency chain:

$$	ext{M0 (Repo)} \longrightarrow 	ext{M1 (Domain/Schema)} \longrightarrow 	ext{M2 (SQLite/JCS)} \longrightarrow 	ext{M3 (MCP Server)} \longrightarrow 	ext{M4 (Compiler)} \longrightarrow 	ext{M5 (CLI)} \longrightarrow 	ext{M6 (v1.0)}$$

### 2.2 Strict Ordering Constraints (What MUST NOT be implemented early)
* **Rule 1:** The SQLite Backend (M2) MUST NOT be implemented before JSON Schema Validation (M1) is 100% verified.
* **Rule 2:** The MCP Server (M3) MUST NOT be implemented before the SQLite Storage Engine (M2) passes transaction and OCC tests.
* **Rule 3:** The Compiler (M4) MUST NOT be implemented before the Token Profiler (`cl100k_base`) and SQLite storage layer (M2) are frozen.
* **Rule 4:** The CLI (M5) MUST NOT be implemented until MCP Server tools (M3) and Compiler pipeline (M4) pass integration tests.

---

## 3. Incremental Milestone Specifications

### Milestone 0: Repository Bootstrap & Toolchain Setup

* **Objective:** Establish the local engineering repository, build toolchain, dependency bounds, and linting standards.
* **Prerequisites:** Python 3.12+ or Node.js 22+ runtime, git, SQLite 3.46+ CLI.
* **Deliverables:**
  * Clean repository structure (`src/`, `tests/`, `schemas/`, `scripts/`).
  * Dependency configuration (`tiktoken`, `jsonschema`, `sqlite3`, `mcp`).
  * Linter & formatter configs (ruff/eslint, zero-width Unicode pre-commit hook).
* **Acceptance Criteria:**
  * Pre-commit hook blocks files containing zero-width Unicode characters (`U+200B`, `U+200D`, `U+202E`).
* **Integration Tests:** `test_repo_bootstrap.py` verifying test runner, lint checks, and pre-commit hooks.
* **Risks:** Toolchain version mismatch. (Mitigation: Pin exact runtime and library versions in lockfile).
* **Exit Criteria:** `git commit` succeeds with all pre-commit checks passing.

---

### Milestone 1: Core Domain Models & JSON Schema Validation Engine

* **Objective:** Implement in-memory data structures for the 5 Primitives (`Entity`, `Directive`, `Assertion`, `Event`, `Relation`), Base32 ULID generator, and strict `pakb-schema-v1.json` validation engine.
* **Prerequisites:** Milestone 0 complete.
* **Deliverables:**
  * Base32 Crockford ULID generator producing uppercase strings matching `^(ent|dir|ast|evt|rel)_[0-9A-HJKMNP-TV-Z]{26}$`.
  * In-memory primitive classes enforcing required fields and ISO 8601 UTC timestamps (`YYYY-MM-DDTHH:mm:ssZ`).
  * Schema validator loading `pakb-schema-v1.json` and validating payloads (`additionalProperties: false`).
* **Acceptance Criteria:**
  * ULID generator raises `InvalidPrefixError` if prefix is unrecognized.
  * Schema validator rejects payloads containing unrecognized property keys or invalid ISO 8601 UTC timestamps.
* **Integration Tests:**
  * `test_ulid_generation()`: Validates regex, Crockford Base32 character set, and time-sorting order.
  * `test_schema_validation()`: Validates 100 positive and negative JSON schema test cases.
* **Risks:** Non-standard ISO 8601 timestamp formats. (Mitigation: Enforce regex `^20[0-9]{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]Z$`).
* **Exit Criteria:** 100% test coverage over ULID generation and JSON Schema validation.

---

### Milestone 2: SQLite Storage Engine, DDL Migrations, & JCS Hash Engine

* **Objective:** Implement physical SQLite database storage (`primitives_registry`, `entities`, `directives`, `assertions`, `events`, `relations`, `audit_log`, `fts_knowledge_index`), RFC 8785 JCS SHA-256 hash engine, and Optimistic Concurrency Control (OCC).
* **Prerequisites:** Milestone 1 complete.
* **Deliverables:**
  * Database connection manager enforcing mandatory PRAGMAs (`journal_mode=WAL`, `foreign_keys=ON`, `synchronous=NORMAL`).
  * DDL migration runner executing `PAKB-SQLite-Storage-Architecture-v1.0.md` §4 DDL.
  * RFC 8785 JCS SHA-256 hash generator.
  * CRUD storage engine with OCC (`updated_at` token checking) and `--autorename` import deduplication.
* **Acceptance Criteria:**
  * Foreign key violations (`DanglingReferenceError`) raise SQLite exceptions when inserting dangling relations.
  * FTS5 virtual table `fts_knowledge_index` automatically syncs via SQLite triggers and excludes `sensitivity == 'restricted'` records.
  * JCS SHA-256 hash calculation produces bit-for-bit identical outputs for identical primitive content across runs.
* **Integration Tests:**
  * `test_sqlite_ddl_and_pragmas()`: Verifies WAL mode and foreign key enforcement.
  * `test_jcs_sha256_hash()`: Verifies RFC 8785 canonical JSON hashing.
  * `test_occ_concurrency()`: Mismatched `updated_at` timestamps throw `ConcurrentModificationError`.
  * `test_fts5_triggers()`: Verifies search indexes automatically update and exclude `restricted` primitives.
* **Risks:** SQLite version < 3.46. (Mitigation: Assert `sqlite3.sqlite_version_info >= (3, 46, 0)` on connection startup).
* **Exit Criteria:** Database engine passes all transaction rollback, referential integrity, and JCS deduplication integration tests.

---

### Milestone 3: Local MCP Server & Tool Catalog Execution

* **Objective:** Implement the local-first Model Context Protocol (MCP) server exposing PAKB via `pakb://` URI resources and the 6 canonical MCP tools per `PAKB-MCP-Server-Architecture-v1.0.md`.
* **Prerequisites:** Milestone 2 complete.
* **Deliverables:**
  * MCP server transport binding over `stdio` and loopback HTTP SSE (`127.0.0.1`).
  * Resource provider serving `pakb://preamble/tier0`, `pakb://entities/{id}`, `pakb://graph/neighborhood/{id}`, `pakb://timeline/recent`.
  * Tool Execution Engine implementing the 6 canonical tools:
    1. `pakb_get_primitive`
    2. `pakb_search`
    3. `pakb_traverse_graph` (Recursive CTE depth ≤ 3)
    4. `pakb_get_timeline`
    5. `pakb_propose_memory` ("Agent Proposes, Human Commits" staging queue)
    6. `pakb_compile_preamble`
* **Acceptance Criteria:**
  * `pakb_traverse_graph` executes recursive CTEs up to `max_depth = 3` and detects cycles using `visited_ids` path tracking.
  * `pakb_propose_memory` writes proposals to staging without mutating `primitives_registry`.
  * Requesting a `sensitivity == 'restricted'` primitive returns `SECURITY_REDACTION_ERROR`.
* **Integration Tests:**
  * `test_mcp_resources()`: Tests `pakb://` resource fetching over stdio transport.
  * `test_mcp_graph_traversal()`: Tests multi-hop graph queries and cycle termination.
  * `test_mcp_memory_proposal()`: Verifies proposal staging and diff summary output.
* **Risks:** Unhandled transport exceptions crashing stdio stream. (Mitigation: Wrap tool handlers in global exception formatters returning structured JSON error payloads).
* **Exit Criteria:** MCP test suite executes end-to-end tool calls over stdio with 0 failures.

---

### Milestone 4: Context Compiler Pipeline & Token Profiler (`cl100k_base`)

* **Objective:** Implement the 7-stage deterministic compilation pipeline and token budget profiler per `PAKB-Compiler-Architecture-v1.0.md`.
* **Prerequisites:** Milestone 3 complete.
* **Deliverables:**
  * 7-Stage Compiler Pipeline (`Ingest` ➔ `Sanitize` ➔ `Filter` ➔ `Rank` ➔ `Fit` ➔ `Emit Emitters` ➔ `Emit Manifest`).
  * `cl100k_base` tiktoken profiler enforcing the Tier 0 **≤500 token budget**.
  * ADR-004 Priority Rank sorting engine.
  * Target Emitters generating `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, and `dist/manifest.json`.
* **Acceptance Criteria:**
  * Compiler demotes overflowing soft directives to Tier 1 MCP resource index.
  * If hard constraints exceed 500 tokens under `cl100k_base`, compiler halts and throws `PreambleBudgetExceededError`.
  * Generated artifacts are bit-for-bit reproducible across operating systems given identical input database JCS hashes.
* **Integration Tests:**
  * `test_compiler_pipeline()`: Tests 7-stage compilation from SQLite store to `dist/` directory.
  * `test_token_budget_overflow()`: Verifies soft directive demotion and hard constraint failure guard.
  * `test_build_reproducibility()`: Verifies bit-for-bit identical output artifacts across multiple execution runs.
* **Risks:** Token count drift across tiktoken versions. (Mitigation: Lock `tiktoken` library version in dependencies).
* **Exit Criteria:** Compiler emits all 6 build artifacts and valid `manifest.json` with 100% reproducible hashes.

---

### Milestone 5: Unified CLI & First Usable Release (v0.1)

* **Objective:** Implement the unified command-line interface (CLI) tying together storage management, MCP server execution, context compilation, and memory proposal approvals.
* **Prerequisites:** Milestone 4 complete.
* **Deliverables:**
  * `pakb` CLI binary supporting commands:
    * `pakb init`: Initialize SQLite database schema.
    * `pakb compile`: Run compiler pipeline to build `dist/` artifacts.
    * `pakb mcp`: Launch local MCP server over stdio.
    * `pakb proposals list / approve <id> / reject <id>`: Human memory approval workflow.
    * `pakb export / import`: Export/import JCS canonical dataset.
  * **First Usable Release v0.1 Package**.
* **Acceptance Criteria:**
  * `pakb compile` successfully emits `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, and `manifest.json`.
  * `pakb proposals approve <id>` commits staged memory proposal into `primitives_registry`.
* **Integration Tests:**
  * `test_cli_commands()`: End-to-end integration test of all CLI commands.
* **Risks:** CLI argument parsing ambiguities. (Mitigation: Use strict CLI framework with automated help text).
* **Exit Criteria:** Single senior engineer successfully uses `pakb` CLI to manage personal knowledge base in daily workflow.

---

### Milestone 6: CI/CD Pipeline, Synthetic Test Harness, & Stable Release v1.0

* **Objective:** Establish automated GitHub Actions CI/CD pipeline, synthetic test fixture suite, documentation, and publish **PAKB Stable Release v1.0**.
* **Prerequisites:** Milestone 5 complete.
* **Deliverables:**
  * GitHub Actions CI pipeline executing linting, zero-width character detection, secret scanning, and integration test suite on synthetic fixtures.
  * Synthetic test fixture dataset (`tests/fixtures/synthetic_pakb.db`).
  * End-user and developer documentation (`README.md`, `USAGE.md`).
  * **PAKB Stable Release v1.0 Tag**.
* **Acceptance Criteria:**
  * CI pipeline executes all tests against synthetic fixtures in under 2 minutes.
  * Real personal KB data is strictly excluded from CI runners per ADR-002 / Errata-008.
* **Integration Tests:**
  * `test_ci_synthetic_suite()`: Full suite execution on synthetic fixture database.
* **Risks:** Flaky test failures in CI. (Mitigation: Use deterministic test seeds and mock clock timestamps).
* **Exit Criteria:** Green CI pipeline status, tagged v1.0 release, and complete user documentation.

---

## 4. Summary Milestone Execution Matrix

| Milestone | Key Deliverable | Primary Risk | Exit Criteria |
|---|---|---|---|
| **M0: Bootstrap** | Repo & Pre-commit Hooks | Toolchain version drift | Clean `git commit` with zero-width check passing |
| **M1: Domain/Schema** | ULID & Schema Validator | Timestamp format drift | 100% test coverage over JSON schema validation |
| **M2: SQLite/JCS Storage**| SQLite Engine & JCS Hashing | Database locked / version <3.46 | All OCC, foreign key, & JCS hash tests pass |
| **M3: Local MCP Server** | MCP Transport & 6 Tools | Stdio transport crashes | MCP stdio tool test suite passes with 0 failures |
| **M4: Context Compiler** | 7-Stage Compiler Pipeline | Token budget overflow | Reproducible `dist/` build artifacts & `manifest.json` |
| **M5: Unified CLI (v0.1)**| `pakb` CLI Binary | Argument parsing ambiguity | Daily usage of `pakb` CLI in live workflow |
| **M6: Stable Release v1.0**| CI Pipeline & v1.0 Release | Flaky CI tests | Green CI run on synthetic fixtures & tagged v1.0 |

---

## 5. Implementation Roadmap Freeze Statement

**PAKB Implementation Roadmap v1.0 is the canonical engineering execution plan for the Personal AI Knowledge Base.** This specification is frozen. The single senior engineer executing the system MUST follow the critical path, milestone order, acceptance criteria, and exit tests defined herein.
