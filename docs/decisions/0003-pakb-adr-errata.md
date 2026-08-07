# Personal AI Knowledge Base (PAKB) — ADR Technical Errata & Ambiguity Normative Fixes

**Document Type:** Formal Technical Errata  
**Author:** Hostile Specification Auditor  
**Date:** 5 August 2026  
**Status:** Approved Normative Clarifications  
**Target Specifications:** ADR-001 through ADR-005  

---

## Executive Overview

This Errata document eliminates every identified ambiguity, non-deterministic rule, serialization divergence, and edge-case conflict across ADR-001 through ADR-005. No conceptual changes or new primitives are introduced. The normative wording fixes below MUST be applied verbatim by all conforming implementations to guarantee bit-level interoperability.

---

## Errata Items & Normative Wording Fixes

### Errata-001: SHA-256 Hash Non-Determinism in Import Deduplication
* **Target:** ADR-001 (Section 3 — Import Collision Resolution)
* **Severity:** **CRITICAL**
* **Why Implementations Diverge:** ADR-001 specifies matching primitives via "SHA-256 hash", but fails to specify the canonical byte serialization format. Two systems serializing JSON with different key orderings, indentation, or whitespace will generate different SHA-256 hashes for identical data, causing deduplication failure.
* **Normative Wording Fix:**
  > "SHA-256 hash calculation for import deduplication MUST be computed on the UTF-8 encoded byte stream of the primitive object formatted strictly according to RFC 8785 (JSON Canonicalization Scheme / JCS)."

---

### Errata-002: Tokenizer Non-Determinism in Tier 0 Token Budget
* **Target:** ADR-004 (Section 1 & 4 — Context Activation Caps)
* **Severity:** **CRITICAL**
* **Why Implementations Diverge:** ADR-004 limits Tier 0 to "500 tokens". Different tokenizers (tiktoken `cl100k_base`, `o200k_base`, Llama-3, Claude BPE) produce different token counts for identical text. A preamble measuring 490 tokens under Llama-3 may measure 520 tokens under `cl100k_base`, causing System A to compile successfully while System B throws a `PreambleBudgetExceededError`.
* **Normative Wording Fix:**
  > "Tier 0 token budget calculations MUST be evaluated using the `cl100k_base` (tiktoken) encoding. Conforming compilers MUST ensure the generated Tier 0 preamble byte stream does not exceed 500 tokens under `cl100k_base`."

---

### Errata-003: Identifier Casing & String Comparison Ambiguity
* **Target:** ADR-001 (Section 1 & 2 — Identifier Format)
* **Severity:** **HIGH**
* **Why Implementations Diverge:** Crockford Base32 is natively case-insensitive, but ADR-001's regex uses uppercase `[0-9A-HJKMNP-TV-Z]`. If Team A stores `ent_01j4...` (lowercase) and Team B stores `ent_01J4...` (uppercase), string equality checks, database foreign keys, and hash comparisons will fail.
* **Normative Wording Fix:**
  > "Generated ULID components MUST use strictly UPPERCASE Crockford Base32 characters, and prefixes MUST use strictly lowercase strings (`ent_`, `dir_`, `ast_`, `evt_`, `rel_`). Parsers MUST convert input ULID characters to uppercase before storing or indexing."

---

### Errata-004: Timestamp Serialization Non-Determinism
* **Target:** ADR-001, ADR-004, and JSON Schema Specification
* **Severity:** **HIGH**
* **Why Implementations Diverge:** ISO 8601 / RFC 3339 permits optional fractional seconds (`.123`) and offset notations (`+00:00` vs `Z`). If Team A emits `2026-08-05T18:20:57Z` and Team B emits `2026-08-05T18:20:57.000+00:00`, JCS hashes will differ and equality filters will fail.
* **Normative Wording Fix:**
  > "All `created_at`, `updated_at`, `last_verified`, `timestamp`, `valid_from`, and `valid_to` string fields MUST be serialized in ISO 8601 UTC format with second precision and trailing 'Z' (`YYYY-MM-DDTHH:mm:ssZ`), omitting fractional seconds and numerical offset suffixes."

---

### Errata-005: Ambiguity in Traversal Depth Definition
* **Target:** ADR-003 (Section 5 — Traversal Bounds)
* **Severity:** **HIGH**
* **Why Implementations Diverge:** ADR-003 specifies `MAX_DEPTH = 3`. Team A interprets depth as hop count (3 edges, 4 nodes). Team B interprets depth as node count (2 edges, 3 nodes).
* **Normative Wording Fix:**
  > "Depth is defined strictly as the count of traversed `RELATION` edges from the seed node ($D = 0$). A query with $	ext{MAX\_DEPTH} = 3$ MUST traverse at most 3 consecutive edges, returning primitives at edge distances $D \in \{0, 1, 2, 3\}$."

---

### Errata-006: Inverse Relation Resolution Mechanics
* **Target:** ADR-003 (Section 4 — Inverse Traversal Rules)
* **Severity:** **HIGH**
* **Why Implementations Diverge:** ADR-003 specifies that `source -> governs -> target` implies `target <- governed_by <- source`, but does not state how inverse queries are executed over stored directed edges. Team A inserts a physical `governed_by` edge into the database; Team B queries dynamically. Inserting duplicate physical edges violates graph single-sourcing and creates update anomalies.
* **Normative Wording Fix:**
  > "Inverse relations MUST NOT be physically persisted as duplicate `RELATION` records. Inverse queries MUST be resolved dynamically by matching stored `RELATION` records where `target_id == seed_id` and `predicate == <forward_predicate>`."

---

### Errata-007: Timing of Zero-Width Character Sanitization
* **Target:** ADR-002 (Section 4 — Sanitization Pipeline)
* **Severity:** **MEDIUM**
* **Why Implementations Diverge:** If sanitization occurs *after* object creation, stripping zero-width characters mutates string fields, invalidating the object's SHA-256 hash and updating `updated_at`.
* **Normative Wording Fix:**
  > "Sanitization and zero-width character stripping MUST occur prior to primitive ID assignment and SHA-256 hashing. Post-persisted primitive content MUST NOT be mutated in-place by sanitization hooks."

---

### Errata-008: Explicit Sensitivity Precedence vs. Inheritance
* **Target:** ADR-002 (Section 3 — Sensitivity Inheritance Rules)
* **Severity:** **MEDIUM**
* **Why Implementations Diverge:** ADR-002 states scoped primitives default to `restricted` when linked to a `restricted` entity "unless explicitly overridden by the human user". Because `sensitivity` is a required field on all JSON Schema primitives, Team A applies inheritance dynamically at query time; Team B applies inheritance at creation time.
* **Normative Wording Fix:**
  > "Sensitivity inheritance rules apply strictly at creation time to populate the primitive's required `sensitivity` field. Once authored, the stored `sensitivity` value is authoritative and immutable without explicit user update."

---

### Errata-009: Scope of Prohibited Metadata Keys
* **Target:** ADR-005 (Section 1 — Metadata Restrictions)
* **Severity:** **MEDIUM**
* **Why Implementations Diverge:** ADR-005 regex `^(?!ent_|dir_|ast_|evt_|rel_|scoped_entity_id).*$` inadvertently prohibited standard words starting with `ent_` (such as `enterprise_id` or `entry_count`).
* **Normative Wording Fix:**
  > "Prohibited metadata keys are strictly string keys matching `^(ent|dir|ast|evt|rel)_[0-9A-HJKMNP-TV-Z]{26}$` or exact strings `scoped_entity_id`, `target_id`, `source_id`."

---

## Summary of Normative Errata Adjustments

| Errata # | Affected Specification | Issue Description | Severity | Normative Fix Summary |
|---|---|---|---|---|
| **001** | ADR-001 | Hash non-determinism in import deduplication | **CRITICAL** | Mandates RFC 8785 (JSON Canonicalization Scheme / JCS) for byte streams. |
| **002** | ADR-004 | Tokenizer non-determinism in Tier 0 budget | **CRITICAL** | Mandates `cl100k_base` (tiktoken) as canonical budget tokenizer. |
| **003** | ADR-001 | ULID casing ambiguity | **HIGH** | Mandates uppercase Crockford Base32 + lowercase prefix (`ent_01J4...`). |
| **004** | ADR-001, ADR-004 | Timestamp string formatting drift | **HIGH** | Mandates ISO 8601 UTC with second precision and trailing 'Z' (`YYYY-MM-DDTHH:mm:ssZ`). |
| **005** | ADR-003 | Ambiguous `MAX_DEPTH` definition | **HIGH** | Defines depth strictly as edge traversal count ($D \in \{0,1,2,3\}$). |
| **006** | ADR-003 | Inverse relation persistence ambiguity | **HIGH** | Prohibits duplicate inverse edge storage; mandates dynamic query resolution. |
| **007** | ADR-002 | Timing of zero-width character stripping | **MEDIUM** | Mandates sanitization *before* ID generation and hashing. |
| **008** | ADR-002 | Sensitivity inheritance vs stored value | **MEDIUM** | Specifies inheritance applies at creation time; stored value is authoritative. |
| **009** | ADR-005 | Over-broad metadata key prohibition regex | **MEDIUM** | Restricts regex to exact ID patterns and prohibited foreign key names. |
