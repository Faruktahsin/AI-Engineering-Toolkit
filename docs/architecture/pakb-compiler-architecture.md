# Personal AI Knowledge Base (PAKB) — Compiler Architecture v1.0

**Specification Title:** PAKB Compiler Architecture v1.0  
**Status:** Frozen Normative Specification  
**Publication Date:** 5 August 2026  
**Author:** Senior Software Architect  
**Parent Specifications:** 
* `PAKB-Refactored-Domain-Model.md` (Domain Model v1.0)
* `PAKB-ADRs-v1.0.md` (Architecture Decision Records v1.0)
* `pakb-schema-v1.json` (JSON Schema v1.0)
* `PAKB-Storage-Semantics-v1.0.md` (Storage Semantics v1.0)
* `PAKB-SQLite-Storage-Architecture-v1.0.md` (SQLite Storage Architecture v1.0)
* `PAKB-MCP-Server-Architecture-v1.0.md` (MCP Server Architecture v1.0)

---

## 1. Executive Overview & Compiler Scope

The PAKB Compiler transforms canonical, validated primitives stored within the PAKB SQLite database into runtime-specific, AI-consumable context artifacts (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`, Tier 0 preambles, MCP resource manifests, and build manifests).

The compiler is deterministic, local-first, content-addressable, and operates without third-party network dependencies.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PAKB SQLITE STORAGE                           │
│     (`primitives_registry`, `entities`, `directives`, `assertions`)    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        PAKB COMPILER PIPELINE                           │
│  [1. Ingest] ➔ [2. Sanitize/Validate] ➔ [3. Sort/Rank] ➔ [4. Profile]   │
│         ➔ [5. Demote/Fit] ➔ [6. Target Emitters] ➔ [7. Emit Manifest]    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        ▼                            ▼                            ▼
  `dist/AGENTS.md`            `dist/CLAUDE.md`           `dist/.cursorrules`
  `dist/manifest.json`        `dist/tier0_preamble.txt`  `dist/mcp_index.json`
```

---

## 2. Compiler Architecture & Target Abstraction

The compiler architecture decouples canonical knowledge primitives from runtime target formats through a three-layer pipeline:

1. **Primitive Extraction Layer:** Queries SQLite storage for non-restricted primitives and evaluates dependency edges (`RELATION`).
2. **Context Slicing & Profiling Engine:** Applies sensitivity filters, sorts candidate primitives per ADR-004 Priority Order, and calculates token consumption using `cl100k_base` (tiktoken).
3. **Target Emitter Layer:** Formats the fitted context slice into target-specific syntax files (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`, JSON manifests).

---

## 3. Compilation Pipeline Build Stages

The compiler pipeline executes through **7 sequential, deterministic build stages**:

```
[1. Extraction] ➔ [2. Sanitization] ➔ [3. Classification] ➔ [4. Priority Ranking]
       ➔ [5. Token Budget Fitting] ➔ [6. Target Emitter Execution] ➔ [7. Manifest Emission]
```

### Stage 1: Extraction & Change Detection
* **Inputs:** PAKB SQLite Database handle (`pakb.db`).
* **Outputs:** Unfiltered primitive record set + database state hash.
* **Invariants:** Reads database using `PRAGMA journal_mode = WAL` under `Read Committed` transaction isolation.
* **Deterministic Guarantees:** Primitive extraction query sorts records by `id` ascending.
* **Failure Conditions:** Throws `DatabaseAccessError` if SQLite connection fails or database is locked.

---

### Stage 2: Schema Validation & Sanitization
* **Inputs:** Raw primitive records from Stage 1.
* **Outputs:** Sanitized, schema-valid primitive collection.
* **Invariants:** Every primitive MUST validate against `pakb-schema-v1.json`.
* **Deterministic Guarantees:** Strips zero-width Unicode characters (`U+200B`, `U+200D`, `U+202E`) and executes secret regex scanning per ADR-002 prior to byte processing.
* **Failure Conditions:**
  * Throws `SchemaValidationError` if any primitive violates `pakb-schema-v1.json`.
  * Throws `SecretDetectedError` if unredacted API keys or credentials are found.

---

### Stage 3: Sensitivity Classification & Exclusion
* **Inputs:** Sanitized primitive collection from Stage 2.
* **Outputs:** Filtered primitive collection containing strictly `sensitivity IN ('public', 'internal')`.
* **Invariants:** Primitives where `sensitivity == 'restricted'` are permanently purged from the compiler pipeline.
* **Deterministic Guarantees:** Pure filter predicate. Identical input yields identical output subset.
* **Failure Conditions:** None (empty subset is valid if all primitives are restricted).

---

### Stage 4: Priority Ranking & Ordering
* **Inputs:** Filtered primitives from Stage 3.
* **Outputs:** Deterministically ordered Tier 0 candidate queue.
* **Invariants:** Candidate primitives are sorted strictly according to ADR-004 §4.1:
  1. `DIRECTIVE` (`enforcement == hard` AND `domain == security`)
  2. `ENTITY` (`type == owner`)
  3. `DIRECTIVE` (`enforcement == hard` AND `domain == code_style/safety`)
  4. `DIRECTIVE` (`enforcement == soft` AND `domain == global_style`)
  5. Secondary Sort: `last_verified` timestamp (descending / newest first).
  6. Tertiary Sort: `id` lexicographical UTF-8 byte comparison ascending (`dir_01J...`).
* **Deterministic Guarantees:** Tertiary sort by `id` guarantees bit-for-bit tie-breaking.
* **Failure Conditions:** None.

---

### Stage 5: Token Budget Fitting & Demotion
* **Inputs:** Priority-ordered candidate queue from Stage 4.
* **Outputs:** Tier 0 Fitted Primitive List + Tier 1 Demoted Primitive List.
* **Invariants:**
  * Token counting MUST be computed using **`cl100k_base` (tiktoken)** per ADR-004 Errata-002.
  * Total formatted Tier 0 text length MUST NOT exceed **500 tokens** under `cl100k_base`.
* **Fitting Algorithm:**
  1. Candidates are added to the Tier 0 list in Priority Rank order.
  2. If adding a `DIRECTIVE` (`enforcement == soft`) causes total tokens to exceed 500, that directive is **demoted to the Tier 1 MCP list**.
  3. **Hard Constraint Safeguard:** `DIRECTIVE` items with `enforcement == hard` CANNOT be demoted. If hard constraints alone exceed 500 tokens, compilation fails immediately.
* **Failure Conditions:** Throws `PreambleBudgetExceededError` if hard constraints exceed 500 tokens under `cl100k_base`.

---

### Stage 6: Target Emitter Execution
* **Inputs:** Tier 0 Fitted List, Tier 1 Demoted List, and Target Profile configurations.
* **Outputs:** Formatted in-memory artifact string buffers (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`).
* **Invariants:** Target emitters format content according to target spec while preserving semantics.
* **Deterministic Guarantees:** Template rendering is pure and stateless.
* **Failure Conditions:** Throws `EmitterFormattingError` if a target profile template fails rendering.

---

### Stage 7: Manifest & Artifact Emission
* **Inputs:** Formatted artifact string buffers from Stage 6 + compilation metadata.
* **Outputs:** Written files in `dist/` directory + `dist/manifest.json`.
* **Invariants:** Build emission is **atomic**. Files are written to temporary staging (`dist/.tmp_build`) and renamed atomically to `dist/` upon complete build success.
* **Deterministic Guarantees:** Identical database inputs produce identical SHA-256 artifact hashes.
* **Failure Conditions:** Throws `ArtifactEmissionError` if disk write or directory rename fails.

---

## 4. Target Emitters & Output Specifications

The compiler MUST generate the following 6 core build artifacts:

### 4.1 Tier 0 Preamble (`dist/tier0_preamble.txt`)
* **Format:** Raw UTF-8 Text.
* **Content:** Compact natural language rendering of fitted Tier 0 primitives (Owner identity, hard security constraints, global style rules).
* **Token Cap:** Strictly ≤500 tokens under `cl100k_base`.

### 4.2 `AGENTS.md` (`dist/AGENTS.md`)
* **Format:** Markdown (Agentic AI Foundation standard).
* **Content:** Tier 0 preamble header followed by tool guidance and project workstream summaries.

### 4.3 `CLAUDE.md` (`dist/CLAUDE.md`)
* **Format:** Markdown (Anthropic Claude CLI / Desktop standard).
* **Content:** Formatted Tier 0 preamble + repository workflow directives.

### 4.4 Cursor Rules (`dist/.cursorrules`)
* **Format:** Plain text / YAML MDC rules.
* **Content:** Cursor editor system rules and code style guidelines.

### 4.5 MCP Resource Index (`dist/mcp_index.json`)
* **Format:** JSON.
* **Content:** Index of Tier 1 demoted primitives exposed as dynamic MCP resources (`pakb://...`).

### 4.6 Build Manifest (`dist/manifest.json`)
* **Format:** JSON.
* **Content:** Complete compilation metadata, token counts, primitive hashes, and demotion logs.

---

## 5. Normative Build Manifest Schema (`dist/manifest.json`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "PAKB Build Manifest Schema",
  "type": "object",
  "properties": {
    "build_id": { "type": "string", "pattern": "^bld_[0-9A-HJKMNP-TV-Z]{26}$" },
    "schema_version": { "type": "string", "pattern": "^1\.[0-9]+\.[0-9]+$" },
    "compiled_at": { "type": "string", "pattern": "^20[0-9]{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]Z$" },
    "source_jcs_hash": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
    "tokenizer": { "type": "string", "const": "cl100k_base" },
    "tier0_token_count": { "type": "integer", "maximum": 500 },
    "artifacts": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "filename": { "type": "string" },
          "sha256": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
          "byte_size": { "type": "integer" }
        },
        "required": ["filename", "sha256", "byte_size"],
        "additionalProperties": false
      }
    },
    "demoted_primitives": {
      "type": "array",
      "items": { "type": "string", "pattern": "^dir_[0-9A-HJKMNP-TV-Z]{26}$" }
    }
  },
  "required": [
    "build_id",
    "schema_version",
    "compiled_at",
    "source_jcs_hash",
    "tokenizer",
    "tier0_token_count",
    "artifacts",
    "demoted_primitives"
  ],
  "additionalProperties": false
}
```

---

## 6. Incremental Compilation & Caching Strategy

1. **Content-Addressable Cache:** The compiler computes an aggregate JCS SHA-256 hash across all active, non-restricted database primitives (`source_jcs_hash`).
2. **Cache Match Check:** Prior to executing Stage 4-7, the compiler checks `dist/manifest.json`. If `dist/manifest.json` exists, is valid, and its `source_jcs_hash` matches the current database hash, compilation is skipped (exit code `0`, `CACHE_HIT`).
3. **Cache Invalidation:** Any INSERT, UPDATE, or DELETE on active database primitives alters `source_jcs_hash`, triggering a full atomic rebuild.

---

## 7. Deterministic Build Reproducibility Rules

A PAKB compiler implementation is certified as **Build Reproducible** if and only if:
1. **Identical Input Guarantee:** Given identical database primitive records, identical tokenizer (`cl100k_base`), and identical target profile configurations, the compiler produces **bit-for-bit identical build artifacts and SHA-256 manifest hashes** across different operating systems and CPU architectures.
2. **No Non-Deterministic Functions:** Target emitters MUST NOT inject non-deterministic timestamps, system usernames, hostnames, or random seeds into generated text artifacts (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`). Timestamps are permitted ONLY in `dist/manifest.json`.

---

## 8. Compiler Architecture Freeze Statement

**PAKB Compiler Architecture v1.0 is the normative build pipeline specification for the Personal AI Knowledge Base.** This specification is frozen. All conforming compiler implementations MUST execute the 7 build stages, priority sorting algorithms, token profiling rules (`cl100k_base`), and manifest emission standards defined herein. Any future compiler modifications require a new versioned specification (e.g., Compiler Architecture v1.1 or v2.0).
