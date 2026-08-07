# Personal AI Knowledge Base (PAKB) — Model Context Protocol (MCP) Server Architecture v1.0

**Specification Title:** PAKB MCP Server Architecture v1.0  
**Status:** Frozen Normative Specification  
**Publication Date:** 5 August 2026  
**Author:** Senior Software Architect  
**Target Standard:** Model Context Protocol (MCP) Draft Specification  
**Parent Specifications:** 
* `PAKB-Refactored-Domain-Model.md` (Domain Model v1.0)
* `PAKB-ADRs-v1.0.md` (Architecture Decision Records v1.0)
* `pakb-schema-v1.json` (JSON Schema v1.0)
* `PAKB-Storage-Semantics-v1.0.md` (Storage Semantics v1.0)
* `PAKB-SQLite-Storage-Architecture-v1.0.md` (SQLite Storage Architecture v1.0)

---

## 1. Overall System Architecture

The PAKB Model Context Protocol (MCP) Server acts as the canonical, local-first interface between the Personal AI Knowledge Base and AI agents (such as Claude Code, Cursor, Windsurf, Copilot, or custom agent runtimes).

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           AI AGENT RUNTIME                              │
│              (Claude Code, Cursor, Windsurf, Copilot)                   │
└────────────────────┬───────────────────────────────▲────────────────────┘
                     │                               │
       Static Preambles (≤500 tokens)        MCP Protocol (stdio / SSE)
       (Always-On / Tier 0)                 (On-Demand / Tier 1)
                     │                               │
       ┌─────────────┴─────────────┐                 │
       ▼                           ▼                 ▼
  `AGENTS.md`               `.cursorrules`    PAKB MCP SERVER
                                             ┌───────────────────────────┐
                                             │  • Resource Provider      │
                                             │  • Tool Catalog Execution │
                                             │  • Sanitization Pipeline  │
                                             │  • Token Budget Profiler  │
                                             └─────────────┬─────────────┘
                                                           │
                                                           ▼
                                                PAKB SQLITE STORAGE
                                            (`primitives_registry`, etc.)
```

The server operates locally over `stdio` or loopback HTTP SSE (`127.0.0.1`), exposing PAKB data strictly through MCP **Resources** and MCP **Tools**.

---

## 2. Resource Hierarchy & URI Conventions

All PAKB resources are exposed via the `pakb://` URI scheme.

### 2.1 URI Conventions

| Resource URI Pattern | Description | Activation Tier |
|---|---|---|
| `pakb://preamble/tier0` | Compiled Tier 0 Preamble (≤500 tokens) | **Tier 0 (Always-On)** |
| `pakb://entities/{id}` | Single Entity primitive payload | **Tier 1 (On-Demand)** |
| `pakb://directives/{id}` | Single Directive primitive payload | **Tier 1 (On-Demand)** |
| `pakb://assertions/{id}` | Single Assertion primitive payload | **Tier 1 (On-Demand)** |
| `pakb://events/{id}` | Single Event primitive payload | **Tier 1 (On-Demand)** |
| `pakb://relations/{id}` | Single Relation primitive payload | **Tier 1 (On-Demand)** |
| `pakb://graph/neighborhood/{id}` | Subgraph neighborhood around seed ID (depth ≤ 3) | **Tier 1 (On-Demand)** |
| `pakb://timeline/recent` | Chronological list of recent Event primitives | **Tier 1 (On-Demand)** |

---

## 3. Context Routing & Tier Interaction Strategy

```
                             INCOMING REQUEST
                                    │
                                    ▼
                     Is Primitive `sensitivity` == 'restricted'?
                                    │
                       ┌────────────┴────────────┐
                       │ YES                     │ NO
                       ▼                         ▼
            [REDACTED & EXCLUDED]      Is Activation Class 'always_on'?
            (Never enters prompt)                │
                                      ┌──────────┴──────────┐
                                      │ YES                 │ NO
                                      ▼                     ▼
                               TIER 0 PREAMBLE       TIER 1 MCP LAYER
                           (Capped at ≤500 tokens)  (On-Demand Resource/Tool)
```

1. **Tier 0 Preamble Compilation (`pakb_compile_preamble` / `pakb://preamble/tier0`):**
   * Pre-compiles static system context files (`AGENTS.md`, `.cursorrules`, `CLAUDE.md`) capped at strictly **≤500 tokens** under `cl100k_base` (tiktoken).
   * Contains owner identity, critical hard constraints, and global style directives.
2. **Tier 1 On-Demand MCP Layer:**
   * All structural, relational, and domain knowledge is retrieved dynamically via MCP tool calls or resource queries when required for specific tasks.
3. **Tier 2 Restricted Vault:**
   * Primitives with `sensitivity == 'restricted'` are permanently excluded from MCP resource listings, search indexes, and tool response payloads.

---

## 4. Complete Tool Catalog

The PAKB MCP Server exposes **6 canonical tools**:

1. `pakb_get_primitive`: Fetch a single primitive by Base32 ULID.
2. `pakb_search`: FTS5 full-text search with metadata filters.
3. `pakb_traverse_graph`: Multi-hop recursive CTE graph traversal up to depth 3.
4. `pakb_get_timeline`: Chronological event and milestone retrieval.
5. `pakb_propose_memory`: Agent memory proposal workflow ("Agent Proposes, Human Commits").
6. `pakb_compile_preamble`: Tier 0 preamble compiler and token profiler.

---

## 5. Detailed Tool Contracts

### 5.1 `pakb_get_primitive`
* **Purpose:** Retrieves a single primitive payload by its unique Base32 ULID identifier.
* **Inputs:**
  ```json
  {
    "id": "ent_01J4X89K9Z1A2B3C4D5E6F7G8H"
  }
  ```
  * `id` (string, required): Prefixed ULID matching `^(ent|dir|ast|evt|rel)_[0-9A-HJKMNP-TV-Z]{26}$`.
* **Outputs:**
  ```json
  {
    "primitive": {
      "schema_version": "1.0.0",
      "id": "ent_01J4X89K9Z1A2B3C4D5E6F7G8H",
      "created_at": "2026-08-05T12:00:00Z",
      "updated_at": "2026-08-05T12:00:00Z",
      "last_verified": "2026-08-05T12:00:00Z",
      "sensitivity": "internal",
      "volatility": "low",
      "activation": "on_demand",
      "name": "AI Engineering Toolkit",
      "type": "workstream",
      "status": "active"
    }
  }
  ```
* **Deterministic Behavior:** Queries `primitives_registry` and the corresponding primitive table. Returns the exact JSON representation matching `pakb-schema-v1.json`.
* **Failure Conditions:**
  * Throws `InvalidIDFormat` if `id` fails the ULID regex.
  * Throws `PrimitiveNotFound` if `id` does not exist in storage.
  * Throws `SecurityRedactionError` if primitive has `sensitivity == 'restricted'`.

---

### 5.2 `pakb_search`
* **Purpose:** Performs full-text search across non-restricted primitives using SQLite FTS5 BM25 ranking and structural filters.
* **Inputs:**
  ```json
  {
    "query": "architecture decision",
    "primitive_type": "assertion",
    "sensitivity_limit": "internal",
    "limit": 10
  }
  ```
  * `query` (string, required): Natural language or keyword search query.
  * `primitive_type` (string, optional): Filter by `entity`, `directive`, `assertion`, or `event`.
  * `sensitivity_limit` (string, optional): Maximum sensitivity tier (`public` or `internal`). Default `internal`.
  * `limit` (integer, optional): Max results to return (1-50, default 10).
* **Outputs:**
  ```json
  {
    "total_matches": 1,
    "results": [
      {
        "id": "ast_01J4X89K9Z3C4D5E6F7G8H9I0J",
        "primitive_type": "assertion",
        "score": -0.85,
        "snippet": "Adopt SQLite with typed edges and recursive CTEs for local graph queries.",
        "headline_claim": "Adopt SQLite with typed edges for PAKB graph queries."
      }
    ]
  }
  ```
* **Deterministic Behavior:** Executes FTS5 BM25 search over `fts_knowledge_index` filtering out `restricted` assets. Results sorted by BM25 score ascending (best match first).
* **Failure Conditions:**
  * Throws `InvalidSearchQuery` if query string is empty or malformed.
  * Throws `InvalidFilterError` if `primitive_type` is unknown.

---

### 5.3 `pakb_traverse_graph`
* **Purpose:** Executes multi-hop recursive graph traversal from a seed primitive up to $	ext{MAX\_DEPTH} = 3$ per ADR-003.
* **Inputs:**
  ```json
  {
    "seed_id": "ent_01J4X89K9Z1A2B3C4D5E6F7G8H",
    "max_depth": 2,
    "predicates": ["governs", "depends_on"]
  }
  ```
  * `seed_id` (string, required): Origin primitive ULID.
  * `max_depth` (integer, optional): Traversal depth (1-3, default 3).
  * `predicates` (array of strings, optional): Filter edges by specific predicates.
* **Outputs:**
  ```json
  {
    "seed_id": "ent_01J4X89K9Z1A2B3C4D5E6F7G8H",
    "nodes": [
      { "id": "ent_01J4X89K9Z1A2B3C4D5E6F7G8H", "depth": 0 },
      { "id": "dir_01J4X89K9Z2B3C4D5E6F7G8H9I", "depth": 1 }
    ],
    "edges": [
      {
        "id": "rel_01J4X89K9Z5E6F7G8H9I0J1K2L",
        "source_id": "dir_01J4X89K9Z2B3C4D5E6F7G8H9I",
        "target_id": "ent_01J4X89K9Z1A2B3C4D5E6F7G8H",
        "predicate": "governs"
      }
    ]
  }
  ```
* **Deterministic Behavior:** Executes the standardized recursive CTE query template defined in `PAKB-SQLite-Storage-Architecture-v1.0.md` §7. Evaluates both forward and dynamic inverse edges.
* **Failure Conditions:**
  * Throws `DepthBoundExceeded` if `max_depth > 3`.
  * Throws `PrimitiveNotFound` if `seed_id` does not exist.

---

### 5.4 `pakb_get_timeline`
* **Purpose:** Retrieves chronological `EVENT` primitives and milestone records within a specified temporal window.
* **Inputs:**
  ```json
  {
    "start_time": "2026-08-01T00:00:00Z",
    "end_time": "2026-08-05T23:59:59Z",
    "type": "milestone",
    "limit": 20
  }
  ```
  * `start_time` / `end_time` (ISO 8601 UTC strings, optional).
  * `type` (string, optional): `milestone`, `session_log`, `interaction`, `state_change`.
  * `limit` (integer, optional): Default 20, max 100.
* **Outputs:**
  ```json
  {
    "count": 1,
    "events": [
      {
        "id": "evt_01J4X89K9Z4D5E6F7G8H9I0J1K",
        "timestamp": "2026-08-05T12:00:00Z",
        "summary": "Completed Phase 0 Research and frozen architecture specifications.",
        "type": "milestone"
      }
    ]
  }
  ```
* **Deterministic Behavior:** Queries `events` table ordered by `timestamp` descending.
* **Failure Conditions:**
  * Throws `InvalidTimestampFormat` if timestamps violate ISO 8601 UTC format.

---

### 5.5 `pakb_propose_memory` ("Agent Proposes, Human Commits")
* **Purpose:** Allows an AI agent to draft a new primitive or memory update as an isolated proposal for human approval per ADR-002.
* **Inputs:**
  ```json
  {
    "proposal_type": "CREATE",
    "target_primitive_type": "directive",
    "payload": {
      "statement": "Prefer SQLite with WAL mode for local desktop storage.",
      "enforcement": "soft",
      "domain": "storage_architecture"
    },
    "rationale": "Derived from Phase 0 architecture review."
  }
  ```
* **Outputs:**
  ```json
  {
    "proposal_id": "prop_01J4X89K9Z9A8B7C6D5E4F3G2H",
    "status": "pending_human_review",
    "sanitization_status": "clean",
    "summary_diff": "+ [DIRECTIVE] Prefer SQLite with WAL mode for local desktop storage. (soft/storage_architecture)"
  }
* **Deterministic Behavior:**
  1. Pre-sanitizes string fields (strips zero-width characters, runs secret scanning).
  2. Validates payload against `pakb-schema-v1.json`.
  3. Writes proposal to isolated staging queue (`memory_proposals`).
  4. Returns proposal ID and diff. **Does NOT mutate `primitives_registry` until human approval.**
* **Failure Conditions:**
  * Throws `SchemaValidationError` if payload fails JSON schema validation.
  * Throws `SecretDetectedError` if pre-commit secret scanning finds credentials.

---

### 5.6 `pakb_compile_preamble`
* **Purpose:** Compiles and token-profiles Tier 0 static system context files (`AGENTS.md`, `.cursorrules`, `CLAUDE.md`) capped at ≤500 tokens per ADR-004.
* **Inputs:**
  ```json
  {
    "target_format": "AGENTS.md"
  }
  ```
  * `target_format` (string, required): `AGENTS.md`, `.cursorrules`, `CLAUDE.md`.
* **Outputs:**
  ```json
  {
    "target_format": "AGENTS.md",
    "token_count": 342,
    "max_budget": 500,
    "tokenizer": "cl100k_base",
    "content": "# PAKB Tier 0 System Preamble
..."
  }
  ```
* **Deterministic Behavior:** Fetches eligible Tier 0 primitives, applies priority sorting per ADR-004 §4.1, evaluates token counts using `cl100k_base` (tiktoken), demotes soft directives if overflowing, and emits formatted Markdown.
* **Failure Conditions:**
  * Throws `PreambleBudgetExceededError` if hard constraints alone exceed 500 tokens under `cl100k_base`.

---

## 6. Error Model & Response Semantics

All MCP tool errors return structured JSON payloads:

```json
{
  "error": {
    "code": "SECURITY_REDACTION_ERROR",
    "message": "Access to primitive 'ast_01J...' denied: primitive classification is 'restricted'.",
    "target_id": "ast_01J4X89K9Z3C4D5E6F7G8H9I0J"
  }
}
```

### Standard Error Codes:
* `INVALID_ID_FORMAT`: ID fails Base32 ULID regex.
* `PRIMITIVE_NOT_FOUND`: Identifier does not exist in storage.
* `SECURITY_REDACTION_ERROR`: Requested primitive has `sensitivity == 'restricted'`.
* `SCHEMA_VALIDATION_ERROR`: Payload violates `pakb-schema-v1.json`.
* `PREAMBLE_BUDGET_EXCEEDED`: Hard constraints exceed 500 token `cl100k_base` cap.
* `CONCURRENT_MODIFICATION_ERROR`: OCC `updated_at` timestamp mismatch.

---

## 7. Security Boundaries & Authentication

1. **Transport Isolation:** Local stdio or loopback HTTP SSE (`127.0.0.1` only). External network interfaces MUST NOT bind to the MCP server.
2. **Restricted Asset Redaction:** `sensitivity == 'restricted'` records are filtered out at the SQL query level before reaching application memory.
3. **Zero-Width Character Protection:** Pre-commit sanitization hooks strip zero-width spaces (`U+200B`), zero-width joiners (`U+200D`), and bidi overrides (`U+202E`) from all incoming tool parameters.

---

## 8. Extension Mechanisms

1. **Custom Predicates:** Custom graph relations MUST use the `ext_` prefix regex `^ext_[a-z0-9_]+$` per ADR-003.
2. **Ephemeral Metadata:** Non-structural tool state MUST be stored in `metadata` adhering to ADR-005 scope restrictions (`propertyNames` pattern `^(?!ent_|dir_|ast_|evt_|rel_|scoped_entity_id).*$`).

---

## 9. MCP Server Architecture Freeze Statement

**PAKB MCP Server Architecture v1.0 is the normative interface specification between PAKB and AI agents.** This specification is frozen. All conforming MCP servers MUST implement the URI hierarchy, tool catalog, token budget profiling, and memory proposal workflows defined herein. Any future interface modifications require a new versioned specification (e.g., MCP Server Architecture v1.1 or v2.0).
