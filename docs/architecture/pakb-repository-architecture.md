# Personal AI Knowledge Base (PAKB) — Repository Architecture v1.0

**Specification Title:** PAKB Repository Architecture v1.0  
**Status:** Frozen Normative Repository Design  
**Publication Date:** 5 August 2026  
**Author:** Senior Software Architect  
**Technology Stack:** TypeScript, Node.js 22+, pnpm Workspaces, SQLite (`better-sqlite3`), Drizzle ORM, MCP SDK (`@modelcontextprotocol/sdk`), Vitest, Biome, Changesets  
**Parent Specifications:** 
* `PAKB-Refactored-Domain-Model.md` (Domain Model v1.0)
* `PAKB-ADRs-v1.0.md` (Architecture Decision Records v1.0)
* `pakb-schema-v1.json` (JSON Schema v1.0)
* `PAKB-Storage-Semantics-v1.0.md` (Storage Semantics v1.0)
* `PAKB-SQLite-Storage-Architecture-v1.0.md` (SQLite Storage Architecture v1.0)
* `PAKB-MCP-Server-Architecture-v1.0.md` (MCP Server Architecture v1.0)
* `PAKB-Compiler-Architecture-v1.0.md` (Compiler Architecture v1.0)
* `PAKB-Implementation-Roadmap-v1.0.md` (Implementation Roadmap v1.0)

---

## 1. Executive Summary & Monorepo Overview

This document specifies the canonical repository structure for the Personal AI Knowledge Base (PAKB). The repository is structured as a production-quality, local-first **pnpm monorepo** written in TypeScript for Node.js 22+.

The design enforces strict package boundaries through a **Directed Acyclic Graph (DAG)** to eliminate circular dependencies, ensure clean separation of concerns, and enable independent package testing and build caching.

---

## 2. Package Dependency Topology (Internal DAG)

To prevent circular dependencies, package imports follow a strict top-down dependency flow:

```
                         ┌─────────────────────────┐
                         │      @pakb/testing      │
                         │   (Mocks & Fixtures)    │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │      @pakb/schema       │
                         │ (JSON Schema & TS Types)│
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │      @pakb/domain       │
                         │ (ULID & Sanitization)   │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │      @pakb/storage      │
                         │ (SQLite, Drizzle, JCS)  │
                         └────────────┬────────────┘
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
  ┌─────────────────────────┐                   ┌─────────────────────────┐
  │    @pakb/mcp-server     │                   │     @pakb/compiler      │
  │   (MCP Resources/Tools) │                   │  (7 Stages & Tiktoken)  │
  └────────────┬────────────┘                   └────────────┬────────────┘
               │                                             │
               └──────────────────────┬──────────────────────┘
                                      ▼
                         ┌─────────────────────────┐
                         │        @pakb/cli        │
                         │   (Executable `pakb`)   │
                         └─────────────────────────┘
```

---

## 3. Directory Tree Structure

```
pakb/
├── .changeset/
│   ├── config.json
│   └── README.md
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── docs/
│   ├── architecture/
│   │   ├── domain-model.md
│   │   ├── adrs.md
│   │   ├── storage-semantics.md
│   │   ├── sqlite-architecture.md
│   │   ├── mcp-architecture.md
│   │   ├── compiler-architecture.md
│   │   └── repository-architecture.md
│   └── user-guide.md
├── packages/
│   ├── schema/
│   │   ├── src/
│   │   │   ├── json-schema.json
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── domain/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── ulid.ts
│   │   │   ├── sanitization.ts
│   │   │   └── validation.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── storage/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── connection.ts
│   │   │   ├── schema.ts
│   │   │   ├── jcs-hash.ts
│   │   │   ├── repository.ts
│   │   │   └── migrations/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── mcp-server/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── server.ts
│   │   │   ├── resources.ts
│   │   │   ├── tools/
│   │   │   └── staging.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── compiler/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── pipeline.ts
│   │   │   ├── profiler.ts
│   │   │   ├── sorting.ts
│   │   │   ├── emitters/
│   │   │   └── manifest.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── cli/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── bin.ts
│   │   │   └── commands/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── testing/
│       ├── src/
│       │   ├── index.ts
│       │   ├── fixtures.ts
│       │   └── mocks.ts
│       ├── package.json
│       └── tsconfig.json
├── outputs/
├── biome.json
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsup.config.ts
└── tsconfig.json
```

---

## 4. Package Specifications & Boundary Contracts

### 4.1 Package `@pakb/schema`
* **Purpose:** Leaf package defining the canonical `pakb-schema-v1.json` JSON schema and generated TypeScript interfaces.
* **Responsibilities:** Export valid JSON Schema Draft 2020-12 payload and TypeScript types.
* **Public API:**
  ```ts
  export { PAKB_JSON_SCHEMA } from "./json-schema.json";
  export type { Entity, Directive, Assertion, Event, Relation, AnyPrimitive } from "./types";
  ```
* **Allowed Dependencies:** None (leaf package).
* **Forbidden Dependencies:** `@pakb/domain`, `@pakb/storage`, `@pakb/mcp-server`, `@pakb/compiler`, `@pakb/cli`, `@pakb/testing`.
* **Testing Strategy:** Vitest schema structure validation tests.

---

### 4.2 Package `@pakb/domain`
* **Purpose:** Pure domain logic layer implementing Base32 ULID generation and zero-width character sanitization per ADR-001/ADR-002.
* **Responsibilities:**
  * Generate prefixed Base32 ULIDs matching `^(ent|dir|ast|evt|rel)_[0-9A-HJKMNP-TV-Z]{26}$`.
  * Strip zero-width Unicode characters (`U+200B`, `U+200D`, `U+202E`) and scan for secret regexes.
  * In-memory schema validation using `jsonschema`.
* **Public API:**
  ```ts
  export function generateULID(prefix: "ent" | "dir" | "ast" | "evt" | "rel"): string;
  export function sanitizeText(text: string): { sanitized: string; secretDetected: boolean };
  export function validatePrimitive(payload: unknown): ValidationResult;
  ```
* **Allowed Dependencies:** `@pakb/schema`, `jsonschema`, `ulid`.
* **Forbidden Dependencies:** `@pakb/storage`, `@pakb/mcp-server`, `@pakb/compiler`, `@pakb/cli`, `better-sqlite3`, `drizzle-orm`.
* **Testing Strategy:** Vitest unit tests covering 100 positive and negative schema/ULID validation cases.

---

### 4.3 Package `@pakb/storage`
* **Purpose:** Physical SQLite storage backend implementing DDL migrations, Drizzle ORM schema mappings, RFC 8785 JCS SHA-256 canonical hashing, and FTS5 search.
* **Responsibilities:**
  * Manage SQLite database connections and enforce mandatory PRAGMAs (`journal_mode=WAL`, `foreign_keys=ON`).
  * Compute RFC 8785 JCS SHA-256 hashes for primitive comparison and deduplication.
  * Execute OCC updates validating `updated_at` timestamps.
* **Public API:**
  ```ts
  export class PAKBStorageRepository {
    constructor(dbPath: string);
    public calculateJCSHash(primitive: AnyPrimitive): string;
    public getPrimitive(id: string): Promise<AnyPrimitive | null>;
    public insertPrimitive(primitive: AnyPrimitive, options?: { autorename?: boolean }): Promise<void>;
    public updatePrimitive(primitive: AnyPrimitive, expectedUpdatedAt: string): Promise<void>;
    public searchFTS5(query: string, options?: SearchOptions): Promise<SearchResult[]>;
    public traverseGraph(seedId: string, maxDepth?: number): Promise<GraphResult>;
  }
  ```
* **Allowed Dependencies:** `@pakb/schema`, `@pakb/domain`, `better-sqlite3`, `drizzle-orm`, `canonicalize`.
* **Forbidden Dependencies:** `@pakb/mcp-server`, `@pakb/compiler`, `@pakb/cli`.
* **Testing Strategy:** Vitest integration tests against in-memory SQLite (`:memory:`) testing PRAGMAs, foreign key cascades, JCS hashing, and OCC write conflicts.

---

### 4.4 Package `@pakb/mcp-server`
* **Purpose:** Local-first Model Context Protocol (MCP) server implementing `pakb://` resource handlers and the 6 canonical MCP tools.
* **Responsibilities:**
  * Bind stdio and HTTP SSE transports using `@modelcontextprotocol/sdk`.
  * Expose resource handlers (`pakb://preamble/tier0`, `pakb://entities/{id}`, `pakb://graph/neighborhood/{id}`).
  * Execute the 6 canonical tools (`pakb_get_primitive`, `pakb_search`, `pakb_traverse_graph`, `pakb_get_timeline`, `pakb_propose_memory`, `pakb_compile_preamble`).
* **Public API:**
  ```ts
  export class PAKBMCPServer {
    constructor(storage: PAKBStorageRepository);
    public startStdio(): Promise<void>;
    public startSSE(port: number): Promise<void>;
  }
  ```
* **Allowed Dependencies:** `@pakb/schema`, `@pakb/domain`, `@pakb/storage`, `@modelcontextprotocol/sdk`.
* **Forbidden Dependencies:** `@pakb/compiler`, `@pakb/cli`.
* **Testing Strategy:** Vitest integration tests querying MCP resources and executing tool calls over stdio mocks.

---

### 4.5 Package `@pakb/compiler`
* **Purpose:** Deterministic, 7-stage build pipeline transforming PAKB SQLite data into AI context artifacts (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`, Tier 0 preamble, `manifest.json`).
* **Responsibilities:**
  * Ingest database primitives and evaluate ADR-004 Priority Rank ordering.
  * Profile token consumption using `cl100k_base` (tiktoken) enforcing Tier 0 preamble cap (≤500 tokens).
  * Format and emit build artifacts and `manifest.json` atomically.
* **Public API:**
  ```ts
  export class PAKBCompiler {
    constructor(storage: PAKBStorageRepository);
    public compile(options?: CompilerOptions): Promise<CompilationResult>;
    public profileTokens(text: string): number;
  }
  ```
* **Allowed Dependencies:** `@pakb/schema`, `@pakb/domain`, `@pakb/storage`, `tiktoken`.
* **Forbidden Dependencies:** `@pakb/mcp-server`, `@pakb/cli`.
* **Testing Strategy:** Vitest unit/integration tests verifying 7 build stages, token budget demotion, and bit-for-bit output reproducibility.

---

### 4.6 Package `@pakb/cli`
* **Purpose:** Unified command-line interface executable binary (`pakb`).
* **Responsibilities:** Parse CLI flags and execute user commands (`pakb init`, `pakb compile`, `pakb mcp`, `pakb proposals`).
* **Public API:**
  ```ts
  export function runCLI(args: string[]): Promise<void>;
  ```
* **Allowed Dependencies:** `@pakb/schema`, `@pakb/domain`, `@pakb/storage`, `@pakb/mcp-server`, `@pakb/compiler`, `commander`.
* **Forbidden Dependencies:** None (root consumer).
* **Testing Strategy:** Vitest CLI invocation tests.

---

### 4.7 Package `@pakb/testing`
* **Purpose:** Shared test utilities, synthetic test fixture databases, and mock objects for unit and integration testing.
* **Responsibilities:** Export test helpers and synthetic SQLite database instances (`synthetic_pakb.db`).
* **Public API:**
  ```ts
  export function createMockStorage(): PAKBStorageRepository;
  export function getSyntheticPrimitiveFixture(): AnyPrimitive;
  ```
* **Allowed Dependencies:** `@pakb/schema`, `@pakb/domain`.
* **Forbidden Dependencies:** `@pakb/mcp-server`, `@pakb/compiler`, `@pakb/cli`.

---

## 5. Root Configuration Files

### 5.1 `pnpm-workspace.yaml`
```yaml
packages:
  - "packages/*"
```

### 5.2 `biome.json`
```json
{
  "$schema": "https://biomejs.dev/schemas/1.8.3/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  }
}
```

---

## 6. Repository Architecture Freeze Statement

**PAKB Repository Architecture v1.0 is the normative monorepo specification for the Personal AI Knowledge Base.** This specification is frozen. All conforming TypeScript/Node.js implementations MUST follow the package topology, public APIs, forbidden dependency rules, and configuration standards defined herein.
