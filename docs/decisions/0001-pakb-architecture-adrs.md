# Personal AI Knowledge Base (PAKB) — Architecture Decision Records v1.0

**Specification Title:** PAKB Architecture Decision Records v1.0  
**Status:** Frozen Normative Specification  
**Publication Date:** 5 August 2026  
**Author:** Senior Software Architect  
**Parent Specification:** `PAKB-Refactored-Domain-Model.md`  
**Consolidated Standards:** ADR-001 through ADR-005 (Errata Fully Integrated)  

---

## Document Overview & Governance

This document constitutes the final, consolidated normative specification for the PAKB Architecture Decision Record (ADR) layer. All errata items (Errata-001 through Errata-009) have been directly integrated into the normative text of ADR-001 through ADR-005.

Following publication of **v1.0**, the ADR layer is **FROZEN**. Conforming implementations MUST strictly adhere to the normative rules, regexes, and serialization algorithms defined herein.

---

## Index of Architecture Decision Records

* **ADR-001:** Identifier Strategy, Serialization Standards, & Import/Export Guarantees
* **ADR-002:** Universal Sensitivity Model, Sanitization Timing, & Inheritance Rules
* **ADR-003:** Graph Semantics, Directionality, Dynamic Inverses, & Traversal Bounds
* **ADR-004:** Context Activation Policy, Tokenizer Standardization, & Compiler Rules
* **ADR-005:** Composition Rules, Metadata Scope Restrictions, & Graph Normalization

---

# ADR-001: Identifier Strategy, Serialization Standards, & Import/Export Guarantees

* **Status:** Accepted (v1.0 Normative)
* **Date:** 5 August 2026
* **Deciders:** Senior Software Architect
* **Technical Domain:** Data Persistence, Serialization, & System Interoperability

## 1. Context & Problem Statement
The PAKB domain model requires identifiers (`entity_id`, `directive_id`, `assertion_id`, `event_id`, `relation_id`) across all 5 primitives. To ensure cross-system interoperability and deterministic deduplication, identifiers and string serialization must be strictly governed across independent implementations.

## 2. Normative Identifier Specification

### 2.1 Identifier Format & Casing
All identifiers across PAKB MUST use **Prefixed Crockford Base32 ULIDs** (Universally Unique Lexicographically Sortable Identifiers).
* **Structure:** `<prefix>_<26-character-ulid>`
* **Regex Standard:** `^(ent|dir|ast|evt|rel)_[0-9A-HJKMNP-TV-Z]{26}$`
* **Casing Normalization:** Generated ULID components MUST use strictly **UPPERCASE** Crockford Base32 characters, and prefixes MUST use strictly **lowercase** strings (`ent_`, `dir_`, `ast_`, `evt_`, `rel_`). Parsers MUST convert input ULID characters to uppercase before storing or indexing.

### 2.2 Namespace Prefixes

| Primitive Class | Prefix | Example Identifier |
|---|---|---|
| **`ENTITY`** | `ent_` | `ent_01J4X89K9Z1A2B3C4D5E6F7G8H` |
| **`DIRECTIVE`** | `dir_` | `dir_01J4X89K9Z2B3C4D5E6F7G8H9I` |
| **`ASSERTION`** | `ast_` | `ast_01J4X89K9Z3C4D5E6F7G8H9I0J` |
| **`EVENT`** | `evt_` | `evt_01J4X89K9Z4D5E6F7G8H9I0J1K` |
| **`RELATION`** | `rel_` | `rel_01J4X89K9Z5E6F7G8H9I0J1K2L` |

## 3. Serialization & Deduplication Rules

### 3.1 Date-Time String Serialization
All `created_at`, `updated_at`, `last_verified`, `timestamp`, `valid_from`, and `valid_to` string fields MUST be serialized in ISO 8601 UTC format with second precision and trailing 'Z' (`YYYY-MM-DDTHH:mm:ssZ`), omitting fractional seconds and numerical offset suffixes.
* **Regex Standard:** `^20[0-9]{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]Z$`

### 3.2 Canonical SHA-256 Hash Calculation
SHA-256 hash calculation for primitive comparison and import deduplication MUST be computed on the UTF-8 encoded byte stream of the primitive object formatted strictly according to **RFC 8785 (JSON Canonicalization Scheme / JCS)**.

### 3.3 Import Collision Resolution Policy
* **Idempotent Merge:** If an incoming primitive matches an existing ID **and** produces an identical RFC 8785 JCS SHA-256 hash, the import operation is an idempotent no-op.
* **Collision Error:** If an incoming primitive matches an existing ID but produces a differing JCS SHA-256 hash, the import MUST throw `IDCollisionError` unless executed with `--autorename`.
* **Autorename Remapping:** When `--autorename` is specified, a new ULID is generated for the incoming primitive, and all incoming `RELATION` edges referencing the old ID are dynamically remapped to the new ULID.

---

# ADR-002: Universal Sensitivity Model, Sanitization Timing, & Inheritance Rules

* **Status:** Accepted (v1.0 Normative)
* **Date:** 5 August 2026
* **Deciders:** Senior Software Architect
* **Technical Domain:** Security, Privacy, & LLM Context Safety

## 1. Context & Problem Statement
Personal knowledge contains varying levels of sensitivity. Privacy classification must be uniformly defined across all primitives, with deterministic sanitization hooks to prevent accidental prompt disclosure.

## 2. Universal Sensitivity Specification

### 2.1 Universal Field Requirement
The `sensitivity` attribute is a **universal required property across ALL 5 Primitives** (`ENTITY`, `DIRECTIVE`, `ASSERTION`, `EVENT`, `RELATION`).
* **Allowed Values:** `public`, `internal`, `restricted`.

### 2.2 Sensitivity Definitions
* **`public`**: Safe for open publication or public template sharing.
* **`internal`**: Personal data safe for local AI processing via trusted endpoints, but restricted from public repos.
* **`restricted`**: Highly sensitive data (credentials, financial records, medical details, raw PII) that **MUST NEVER enter an LLM context window**.

## 3. Sensitivity Inheritance Rules

### 3.1 Creation-Time Sensitivity Inheritance
Sensitivity inheritance rules apply strictly at creation time to populate a primitive's required `sensitivity` field:
1. **Relation Edge Inheritance:** A `RELATION` edge automatically inherits the **maximum sensitivity** of its `source_id` and `target_id`:
   $$	ext{Sensitivity}(	ext{RELATION}) = \max(	ext{Sensitivity}(	ext{Source}), 	ext{Sensitivity}(	ext{Target}))$$
2. **Entity Scoping Inheritance:** When a `DIRECTIVE`, `ASSERTION`, or `EVENT` is created and linked to an `ENTITY` with `sensitivity: restricted`, the new primitive defaults to `sensitivity: restricted`.

### 3.2 Authoritative Stored Value
Once authored and stored, a primitive's `sensitivity` value is authoritative and immutable without explicit human user modification. Dynamic runtime inheritance MUST NOT overwrite stored primitive sensitivity values.

## 4. Pre-Persisted Sanitization Pipeline
* **Sanitization Order:** Zero-width character stripping (`U+200B`, `U+200D`, `U+202E`) and secret scanning MUST occur **prior** to primitive ID assignment and JCS SHA-256 hashing.
* **Post-Persisted Immutability:** Post-persisted primitive content MUST NOT be mutated in-place by sanitization hooks.
* **Prompt Exclusion:** Context compilation engines MUST filter out any primitive where `sensitivity == restricted`.

---

# ADR-003: Graph Semantics, Directionality, Dynamic Inverses, & Traversal Bounds

* **Status:** Accepted (v1.0 Normative)
* **Date:** 5 August 2026
* **Deciders:** Senior Software Architect
* **Technical Domain:** Knowledge Graph & Multi-Hop Query Engine

## 1. Context & Problem Statement
Graph queries over `RELATION` edges require deterministic rules for edge directionality, inverse relation traversal, predicate naming, and recursion limits.

## 2. Graph Semantics Specification

### 2.1 Directionality
All `RELATION` edges are strictly **directed** (`source_id` $\rightarrow$ `target_id`).
* `source_id`: Origin primitive identifier.
* `target_id`: Target primitive identifier.

### 2.2 Standardized Core Predicates & Extensions
Implementations MUST support the following standardized core predicates:

| Predicate | Semantic Meaning | Allowed Source Types | Allowed Target Types |
|---|---|---|---|
| `governs` | Directive applies to target | `DIRECTIVE` | `ENTITY`, `ASSERTION` |
| `owns` | Source owns/maintains target | `ENTITY` | `ENTITY`, `ASSERTION` |
| `depends_on` | Source requires target | `ENTITY`, `ASSERTION` | `ENTITY`, `ASSERTION` |
| `supersedes` | Source replaces target | `ASSERTION`, `DIRECTIVE` | `ASSERTION`, `DIRECTIVE` |
| `supports` | Source provides evidence for target | `ASSERTION`, `EVENT` | `ASSERTION` |
| `located_at` | Source is positioned in target | `ENTITY`, `EVENT` | `ENTITY` (environment) |
| `member_of` | Source belongs to group/org | `ENTITY` | `ENTITY` |

Custom predicates are permitted if prefixed with `ext_` (regex: `^ext_[a-z0-9_]+$`). Free-form non-prefixed strings are prohibited.

### 2.3 Dynamic Inverse Relation Resolution
Inverse relations MUST NOT be physically persisted as duplicate `RELATION` records. Inverse queries MUST be resolved dynamically by matching stored `RELATION` records where `target_id == seed_id` and `predicate == <forward_predicate>`.
* `source` $\xrightarrow{	ext{governs}}$ `target` $\iff$ `target` $\xleftarrow{	ext{governed\_by}}$ `source`
* `source` $\xrightarrow{	ext{depends\_on}}$ `target` $\iff$ `target` $\xleftarrow{	ext{required\_by}}$ `source`

### 2.4 Traversal Bounds & Cycle Handling
* **Maximum Depth Limit:** Depth is defined strictly as the count of traversed `RELATION` edges from the seed node ($D = 0$). Recursive graph queries MUST enforce a hard depth cap of **$	ext{MAX\_DEPTH} = 3$**, returning primitives at edge distances $D \in \{0, 1, 2, 3\}$.
* **Cycle Prevention:** Traversal algorithms MUST maintain an active-path tracking array (`visited_ids`). Re-encountering an ID along an active path immediately terminates that traversal branch.

---

# ADR-004: Context Activation Policy, Tokenizer Standardization, & Compiler Rules

* **Status:** Accepted (v1.0 Normative)
* **Date:** 5 August 2026
* **Deciders:** Senior Software Architect
* **Technical Domain:** Context Engineering & Prompt Compilation

## 1. Context & Problem Statement
Tier 0 (Always-On Preamble) is capped at ≤500 tokens. The compiler must use a deterministic tokenization algorithm, priority ordering, and demotion strategy when candidates exceed budget.

## 2. Activation Tiers Specification
* **Tier 0 (Always-On Preamble):** Static preambles (`CLAUDE.md`, `.cursorrules`, `AGENTS.md`). Strictly capped at **500 tokens**.
* **Tier 1 (On-Demand MCP):** Served dynamically via local MCP server resource endpoints (`resources/read`, `tools/call`).
* **Tier 2 (Restricted Vault):** Stored locally; redacted from prompts.

## 3. Canonical Tokenizer Standard
Tier 0 token budget calculations MUST be evaluated using the **`cl100k_base` (tiktoken)** encoding. Conforming compilers MUST ensure the generated Tier 0 preamble byte stream does not exceed 500 tokens under `cl100k_base`.

## 4. Tier 0 Priority Ranking & Overflow Rules

### 4.1 Tier 0 Priority Rank Order
When candidate primitives are evaluated for Tier 0 inclusion, they MUST be sorted in the following strict order:
1. `DIRECTIVE` (`enforcement == hard` AND `domain == security`)
2. `ENTITY` (`type == owner`)
3. `DIRECTIVE` (`enforcement == hard` AND `domain == code_style/safety`)
4. `DIRECTIVE` (`enforcement == soft` AND `domain == global_style`)
5. Secondary Sort: `last_verified` timestamp (descending / newest first).
6. Tertiary Sort: `id` string lexicographical UTF-8 byte comparison ascending (e.g., `dir_01J...`).

### 4.2 Overflow & Demotion Mechanics
1. Candidates are added to the preamble in Priority Rank order until adding the next item would exceed 500 tokens under `cl100k_base`.
2. Any candidate `DIRECTIVE` with `enforcement == soft` that cannot fit within the 500-token cap is **demoted to Tier 1 (On-Demand MCP)**.
3. **Hard Constraint Safeguard:** `DIRECTIVE` items with `enforcement == hard` CANNOT be demoted to Tier 1. If the sum of all `enforcement == hard` directives alone exceeds 500 tokens, the build compiler MUST fail with `PreambleBudgetExceededError`.

---

# ADR-005: Composition Rules, Metadata Scope Restrictions, & Graph Normalization

* **Status:** Accepted (v1.0 Normative)
* **Date:** 5 August 2026
* **Deciders:** Senior Software Architect
* **Technical Domain:** Information Architecture & Data Normalization

## 1. Context & Problem Statement
To preserve a 10-year durable graph architecture, unstructured JSON metadata must be strictly bounded to prevent entity embedding or hidden key storage.

## 2. Metadata Scope Restrictions
The `metadata` dictionary on any primitive is **strictly restricted to ephemeral UI or tool-internal state**:
* **Permitted Metadata Keys:** Ephemeral UI parameters (e.g., `editor_cursor_pos`, `ui_collapsed_state`, `import_source_path`, `cli_theme_override`).
* **Prohibited Metadata Keys:** String keys matching `^(ent|dir|ast|evt|rel)_[0-9A-HJKMNP-TV-Z]{26}$` or exact strings `scoped_entity_id`, `target_id`, `source_id`.

## 3. Mandatory Edge Creation & Anti-Pattern Rules

### 3.1 Mandatory Edge Enforcement
An explicit `RELATION` edge MUST be created whenever:
1. An `ENTITY` contains sub-workstreams, sub-goals, or sub-tasks (`predicate: owns`).
2. A `DIRECTIVE` governs a specific `ENTITY` or `ASSERTION` (`predicate: governs`).
3. An `ASSERTION` supersedes another `ASSERTION` (`predicate: supersedes`).

### 3.2 Prohibited Anti-Patterns
1. **Anti-Pattern A (Embedded Entities):** Placing nested arrays of JSON objects inside `metadata`.
2. **Anti-Pattern B (Custom Scoping Keys):** Adding un-spec'd foreign key string fields (such as `scoped_entity_id`) to `DIRECTIVE` or `ASSERTION`.
3. **Anti-Pattern C (Delimited ID Lists):** Storing comma-separated lists of target IDs inside text fields.

---

## Freeze Statement

**PAKB Architecture Decision Records v1.0 is the normative architecture specification for the Personal AI Knowledge Base.** The domain model and ADR layer are frozen. All future structural, behavioral, or algorithmic changes require a new versioned ADR update (e.g., ADR v1.1 or v2.0) rather than ad hoc edits to v1.0.
