# Personal AI Knowledge Base (PAKB) — Engineering Task Breakdown v1.0

**Specification Title:** PAKB Engineering Task Breakdown v1.0  
**Status:** Frozen Implementation Checklist  
**Publication Date:** 5 August 2026  
**Author:** Senior Software Architect  
**Parent Specifications:** 
* `PAKB-Refactored-Domain-Model.md` (Domain Model v1.0)
* `PAKB-ADRs-v1.0.md` (Architecture Decision Records v1.0)
* `pakb-schema-v1.json` (JSON Schema v1.0)
* `PAKB-Storage-Semantics-v1.0.md` (Storage Semantics v1.0)
* `PAKB-SQLite-Storage-Architecture-v1.0.md` (SQLite Storage Architecture v1.0)
* `PAKB-MCP-Server-Architecture-v1.0.md` (MCP Server Architecture v1.0)
* `PAKB-Compiler-Architecture-v1.0.md` (Compiler Architecture v1.0)
* `PAKB-Implementation-Roadmap-v1.0.md` (Implementation Roadmap v1.0)
* `PAKB-Repository-Architecture-v1.0.md` (Repository Architecture v1.0)
* `PAKB-API-Contracts-v1.0.md` (API Contracts v1.0)

---

## 1. Executive Summary & Task Structure

This Engineering Task Breakdown (ETB) specifies the complete, granular implementation task list for building PAKB v1.0. Every task is independently completable, explicitly mapped to an architectural milestone, assigned a complexity estimate (XS, S, M, L, XL), and bound to specific file paths, test requirements, and acceptance criteria.

---

## 2. Epics & Milestones Summary

* **EPIC-1: Monorepo Bootstrap & Infrastructure Setup** (Milestone 0)
* **EPIC-2: Canonical Domain Library & Schema Engine** (Milestone 1)
* **EPIC-3: SQLite Storage Backend & Hash Engine** (Milestone 2)
* **EPIC-4: Model Context Protocol (MCP) Server & Tools** (Milestone 3)
* **EPIC-5: Deterministic Context Compiler & Token Profiler** (Milestone 4)
* **EPIC-6: Unified CLI Binary & User Workflows** (Milestone 5)
* **EPIC-7: CI/CD Pipeline, Synthetic Harness & Release v1.0** (Milestone 6)

---

## 3. Detailed Engineering Task Breakdown

### EPIC-1: Monorepo Bootstrap & Infrastructure Setup (Milestone 0)

#### Feature 1.1: Workspace Infrastructure & Configuration
* **Task 1.1.1: Configure pnpm Workspace & Root Metadata**
  * **Dependencies:** None
  * **Complexity:** XS
  * **Package:** Root Repository
  * **Files to Change:** `pnpm-workspace.yaml`, `package.json`, `.gitignore`
  * **Acceptance Criteria:** `pnpm install` succeeds across all workspace folders.
  * **Tests Required:** `pnpm -r exec node -v` succeeds across packages.

* **Task 1.1.2: Configure Biome Linter, Formatter & Pre-Commit Hooks**
  * **Dependencies:** Task 1.1.1
  * **Complexity:** S
  * **Package:** Root Repository
  * **Files to Change:** `biome.json`, `.husky/pre-commit`, `package.json`
  * **Acceptance Criteria:** Pre-commit hook scans git staging area and blocks files containing zero-width Unicode characters (`U+200B`, `U+200D`, `U+202E`).
  * **Tests Required:** `test_precommit_unicode_stripping.sh` verifying commit rejection on zero-width character injection.

---

### EPIC-2: Canonical Domain Library & Schema Engine (Milestone 1)

#### Feature 2.1: JSON Schema & TypeScript Type Package
* **Task 2.1.1: Publish `@pakb/schema` Package**
  * **Dependencies:** Task 1.1.1
  * **Complexity:** S
  * **Package:** `@pakb/schema`
  * **Files to Change:** `packages/schema/src/json-schema.json`, `packages/schema/src/types.ts`, `packages/schema/src/index.ts`
  * **Acceptance Criteria:** Exports `PAKB_JSON_SCHEMA` and TypeScript types matching `PAKB-API-Contracts-v1.0.md` §4.
  * **Tests Required:** `packages/schema/tests/schema_structure.test.ts`.

#### Feature 2.2: Base32 ULID & Sanitization Domain Engine
* **Task 2.2.1: Implement Prefixed Base32 ULID Generator**
  * **Dependencies:** Task 2.1.1
  * **Complexity:** S
  * **Package:** `@pakb/domain`
  * **Files to Change:** `packages/domain/src/ulid.ts`, `packages/domain/src/index.ts`
  * **Acceptance Criteria:** Generates uppercase Crockford Base32 ULIDs with lowercase prefixes (`ent_`, `dir_`, `ast_`, `evt_`, `rel_`) matching regex `^(ent|dir|ast|evt|rel)_[0-9A-HJKMNP-TV-Z]{26}$`.
  * **Tests Required:** `packages/domain/tests/ulid.test.ts`.

* **Task 2.2.2: Implement Text Sanitizer & Secret Detector**
  * **Dependencies:** Task 2.2.1
  * **Complexity:** M
  * **Package:** `@pakb/domain`
  * **Files to Change:** `packages/domain/src/sanitization.ts`
  * **Acceptance Criteria:** Strips zero-width characters and detects API key regex patterns per ADR-002.
  * **Tests Required:** `packages/domain/tests/sanitization.test.ts`.

* **Task 2.2.3: Implement In-Memory Schema Validator**
  * **Dependencies:** Task 2.1.1, Task 2.2.2
  * **Complexity:** M
  * **Package:** `@pakb/domain`
  * **Files to Change:** `packages/domain/src/validation.ts`
  * **Acceptance Criteria:** Validates objects against `pakb-schema-v1.json`, enforcing `additionalProperties: false` and ISO 8601 UTC timestamp format (`YYYY-MM-DDTHH:mm:ssZ`).
  * **Tests Required:** `packages/domain/tests/validation.test.ts` (100 test cases).

---

### EPIC-3: SQLite Storage Backend & Hash Engine (Milestone 2)

#### Feature 3.1: Database Connection & PRAGMA Management
* **Task 3.1.1: Implement SQLite Connection Manager & PRAGMAs**
  * **Dependencies:** Task 2.2.3
  * **Complexity:** S
  * **Package:** `@pakb/storage`
  * **Files to Change:** `packages/storage/src/connection.ts`
  * **Acceptance Criteria:** Enforces `journal_mode=WAL`, `foreign_keys=ON`, `synchronous=NORMAL`, `busy_timeout=5000` on connection opening. Asserts SQLite version $\ge 3.46.0$.
  * **Tests Required:** `packages/storage/tests/connection.test.ts`.

#### Feature 3.2: DDL Migrations & Drizzle ORM Mappings
* **Task 3.2.1: Execute DDL Migrations & Table Setup**
  * **Dependencies:** Task 3.1.1
  * **Complexity:** M
  * **Package:** `@pakb/storage`
  * **Files to Change:** `packages/storage/src/schema.ts`, `packages/storage/src/migrations/0001_initial.sql`
  * **Acceptance Criteria:** Creates `primitives_registry`, `entities`, `directives`, `assertions`, `events`, `relations`, `audit_log`, `fts_knowledge_index`, and FTS5 synchronization triggers per `PAKB-SQLite-Storage-Architecture-v1.0.md` §4.
  * **Tests Required:** `packages/storage/tests/migrations.test.ts`.

#### Feature 3.3: RFC 8785 JCS Canonical Hash Engine & Repository
* **Task 3.3.1: Implement RFC 8785 JCS SHA-256 Hash Calculation**
  * **Dependencies:** Task 3.2.1
  * **Complexity:** S
  * **Package:** `@pakb/storage`
  * **Files to Change:** `packages/storage/src/jcs-hash.ts`
  * **Acceptance Criteria:** Computes deterministic JCS SHA-256 byte stream hashes per ADR-001 §3.2 / Errata-001.
  * **Tests Required:** `packages/storage/tests/jcs_hash.test.ts`.

* **Task 3.3.2: Implement Primitive Repository CRUD & OCC Updates**
  * **Dependencies:** Task 3.3.1
  * **Complexity:** L
  * **Package:** `@pakb/storage`
  * **Files to Change:** `packages/storage/src/repository.ts`
  * **Acceptance Criteria:** Implements `IPAKBStorageRepository` interface (`insertPrimitive`, `updatePrimitive`, `archivePrimitive`, `deletePrimitive`). Enforces OCC timestamp checking (`ConcurrentModificationError`) and `--autorename` ULID edge remapping.
  * **Tests Required:** `packages/storage/tests/repository_crud.test.ts`.

* **Task 3.3.3: Implement FTS5 Search & Recursive Graph Traversal Engine**
  * **Dependencies:** Task 3.3.2
  * **Complexity:** L
  * **Package:** `@pakb/storage`
  * **Files to Change:** `packages/storage/src/repository.ts`
  * **Acceptance Criteria:** Executes FTS5 search (excluding `restricted` assets) and recursive CTE graph traversal up to `max_depth = 3` with path cycle detection per ADR-003.
  * **Tests Required:** `packages/storage/tests/graph_traversal.test.ts`.

---

### EPIC-4: Model Context Protocol (MCP) Server & Tools (Milestone 3)

#### Feature 4.1: MCP Transport & Resource Provider
* **Task 4.1.1: Implement Local MCP Server & Resource Handlers**
  * **Dependencies:** Task 3.3.3
  * **Complexity:** M
  * **Package:** `@pakb/mcp-server`
  * **Files to Change:** `packages/mcp-server/src/server.ts`, `packages/mcp-server/src/resources.ts`
  * **Acceptance Criteria:** Exposes `pakb://preamble/tier0`, `pakb://entities/{id}`, `pakb://graph/neighborhood/{id}`, `pakb://timeline/recent` over stdio and loopback HTTP SSE (`127.0.0.1`).
  * **Tests Required:** `packages/mcp-server/tests/resources.test.ts`.

#### Feature 4.2: MCP Tool Catalog
* **Task 4.2.1: Implement Canonical MCP Tools**
  * **Dependencies:** Task 4.1.1
  * **Complexity:** L
  * **Package:** `@pakb/mcp-server`
  * **Files to Change:** `packages/mcp-server/src/tools/*.ts`
  * **Acceptance Criteria:** Implements `pakb_get_primitive`, `pakb_search`, `pakb_traverse_graph`, `pakb_get_timeline`, `pakb_propose_memory`, `pakb_compile_preamble` matching contracts in `PAKB-API-Contracts-v1.0.md` §7.
  * **Tests Required:** `packages/mcp-server/tests/tools.test.ts`.

---

### EPIC-5: Deterministic Context Compiler & Token Profiler (Milestone 4)

#### Feature 5.1: 7-Stage Compiler Pipeline & Tiktoken Profiler
* **Task 5.1.1: Implement `cl100k_base` Tiktoken Profiler & Priority Rank Engine**
  * **Dependencies:** Task 3.3.3
  * **Complexity:** M
  * **Package:** `@pakb/compiler`
  * **Files to Change:** `packages/compiler/src/profiler.ts`, `packages/compiler/src/sorting.ts`
  * **Acceptance Criteria:** Profiles text using `cl100k_base` (tiktoken) and sorts candidate directives/entities strictly per ADR-004 §4.1.
  * **Tests Required:** `packages/compiler/tests/sorting_profiler.test.ts`.

* **Task 5.1.2: Implement 7-Stage Compiler Pipeline & Target Emitters**
  * **Dependencies:** Task 5.1.1
  * **Complexity:** XL
  * **Package:** `@pakb/compiler`
  * **Files to Change:** `packages/compiler/src/pipeline.ts`, `packages/compiler/src/emitters/*.ts`, `packages/compiler/src/manifest.ts`
  * **Acceptance Criteria:** Executes 7 build stages, enforces 500-token Tier 0 budget under `cl100k_base`, demotes soft directives to MCP index, and emits `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, and `dist/manifest.json`.
  * **Tests Required:** `packages/compiler/tests/pipeline.test.ts` (verifying bit-for-bit reproducibility).

---

### EPIC-6: Unified CLI Binary & User Workflows (Milestone 5)

#### Feature 6.1: Executable CLI
* **Task 6.1.1: Implement `pakb` CLI Commands**
  * **Dependencies:** Task 4.2.1, Task 5.1.2
  * **Complexity:** L
  * **Package:** `@pakb/cli`
  * **Files to Change:** `packages/cli/src/bin.ts`, `packages/cli/src/commands/*.ts`
  * **Acceptance Criteria:** Implements `pakb init`, `pakb compile`, `pakb mcp`, `pakb proposals (list|approve|reject)`, `pakb export`, `pakb import`.
  * **Tests Required:** `packages/cli/tests/cli_commands.test.ts`.

---

### EPIC-7: CI/CD Pipeline, Synthetic Harness & Release v1.0 (Milestone 6)

#### Feature 7.1: CI Automation & Production Release
* **Task 7.1.1: Configure GitHub Actions CI & Synthetic Test Harness**
  * **Dependencies:** Task 6.1.1
  * **Complexity:** M
  * **Package:** Root Repository / `@pakb/testing`
  * **Files to Change:** `.github/workflows/ci.yml`, `packages/testing/src/fixtures.ts`
  * **Acceptance Criteria:** CI runs all tests on synthetic fixtures (`synthetic_pakb.db`), verifying linting, zero-width stripping, and JCS hashes in under 2 minutes. Real personal KB data is strictly excluded.
  * **Tests Required:** Full suite execution in CI.

* **Task 7.1.2: Tag PAKB Stable Release v1.0**
  * **Dependencies:** Task 7.1.1
  * **Complexity:** XS
  * **Package:** Root Repository
  * **Files to Change:** `package.json`, `.changeset/v1.0.0.md`
  * **Acceptance Criteria:** Tagged release `v1.0.0` published with changelog.
  * **Tests Required:** None.

---

## 4. Master Task Complexity Matrix

| Task ID | Title | Package | Milestone | Complexity | Dependencies |
|---|---|---|---|---|---|
| **1.1.1** | Configure pnpm Workspace | Root | M0 | **XS** | None |
| **1.1.2** | Biome Linter & Pre-Commit Hooks | Root | M0 | **S** | 1.1.1 |
| **2.1.1** | Publish `@pakb/schema` Package | `@pakb/schema` | M1 | **S** | 1.1.1 |
| **2.2.1** | Implement Prefixed Base32 ULID Generator | `@pakb/domain` | M1 | **S** | 2.1.1 |
| **2.2.2** | Implement Text Sanitizer & Secret Detector | `@pakb/domain` | M1 | **M** | 2.2.1 |
| **2.2.3** | Implement In-Memory Schema Validator | `@pakb/domain` | M1 | **M** | 2.1.1, 2.2.2 |
| **3.1.1** | SQLite Connection Manager & PRAGMAs | `@pakb/storage` | M2 | **S** | 2.2.3 |
| **3.2.1** | DDL Migrations & Schema Mappings | `@pakb/storage` | M2 | **M** | 3.1.1 |
| **3.3.1** | RFC 8785 JCS SHA-256 Hash Engine | `@pakb/storage` | M2 | **S** | 3.2.1 |
| **3.3.2** | Primitive Repository CRUD & OCC Updates | `@pakb/storage` | M2 | **L** | 3.3.1 |
| **3.3.3** | FTS5 Search & Recursive Graph Traversal | `@pakb/storage` | M2 | **L** | 3.3.2 |
| **4.1.1** | Local MCP Server & Resource Handlers | `@pakb/mcp-server` | M3 | **M** | 3.3.3 |
| **4.2.1** | Canonical MCP Tool Catalog Execution | `@pakb/mcp-server` | M3 | **L** | 4.1.1 |
| **5.1.1** | `cl100k_base` Profiler & Priority Sorting | `@pakb/compiler` | M4 | **M** | 3.3.3 |
| **5.1.2** | 7-Stage Compiler Pipeline & Target Emitters| `@pakb/compiler` | M4 | **XL** | 5.1.1 |
| **6.1.1** | Executable `pakb` CLI Binary & Workflows | `@pakb/cli` | M5 | **L** | 4.2.1, 5.1.2 |
| **7.1.1** | GitHub Actions CI & Synthetic Test Harness | Root / `@pakb/testing` | M6 | **M** | 6.1.1 |
| **7.1.2** | Tag PAKB Stable Release v1.0 | Root | M6 | **XS** | 7.1.1 |

---

## 5. Engineering Task Breakdown Freeze Statement

**PAKB Engineering Task Breakdown v1.0 is the canonical implementation checklist for the Personal AI Knowledge Base.** This task breakdown is frozen. The single senior engineer executing implementation MUST complete all tasks according to the specified dependencies, acceptance criteria, file paths, and test specifications.
