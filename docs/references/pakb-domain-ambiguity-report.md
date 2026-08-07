# Personal AI Knowledge Base (PAKB) — Domain Model Ambiguity & Implementation Risk Report

**Document Type:** Specification Vulnerability & Ambiguity Audit  
**Perspective:** Hostile Implementation Engineer  
**Target Specification:** `PAKB-Refactored-Domain-Model.md`  
**Date:** 5 August 2026  
**Status:** Audit Complete — High Divergence Risk Identified  

---

## Executive Audit Summary

An independent, hostile implementation audit of the refactored 5-primitive PAKB Domain Model (`PAKB-Refactored-Domain-Model.md`) reveals **18 critical specification ambiguities, schema contradictions, missing operational rules, and type collision risks**.

If two independent engineering teams build systems from this specification today, **their implementations will be mutually incompatible**. Data serialized by System A will fail validation, trigger unhandled runtime exceptions, or cause silent data corruption in System B.

---

## Section 1: Identifier & Schema Definition Risks

### 1.1 Unspecified ID Format & Namespace Collision Risk
* **Specification Defect:** The specification requires `entity_id`, `directive_id`, `assertion_id`, `event_id`, and `relation_id` across the 5 primitives, but specifies **no identifier format, character set, or namespacing rule**.
* **Divergence Scenario:**
  * Developer A implements 128-bit UUIDv4 strings (`550e8400-e29b-41d4-a716-446655440000`).
  * Developer B implements URN-based human-readable slugs (`ent:owner:main`, `rel:102`).
  * Developer C implements auto-incrementing 64-bit integers (`1`, `2`, `3`).
* **Implementation Risk:** System A's relational foreign-key validation will fail when importing System B's string URNs. Furthermore, `RELATION.source_id` and `RELATION.target_id` cannot validate referential integrity without knowing whether IDs are globally unique across all 5 primitives or scoped per primitive table.

### 1.2 Open vs. Closed Enum Discriminants
* **Specification Defect:** The `type` field in `ENTITY` lists `owner`, `contact`, `organization`, `workstream`, `objective`, `environment`. The spec fails to declare whether this is a **strict closed enum** or an **extensible open string**.
* **Divergence Scenario:**
  * Developer A implements strict enum validation. Any record with `type: vehicle` or `type: software_agent` throws a schema validation error.
  * Developer B treats `type` as an open string and adds arbitrary custom types.
* **Implementation Risk:** System A will reject System B's dataset outright during import/export.

---

## Section 2: Structural Composition vs. Relation Ambiguities (Dual Representation)

### 2.1 Nested Metadata vs. Edge Relations
* **Specification Defect:** The specification provides an optional `metadata` key-value dictionary on `ENTITY` while simultaneously providing `RELATION` edges. It fails to define whether hierarchical or composite structures MUST be edges or CAN be nested objects.
* **Divergence Scenario:**
  * Developer A models a Project containing Sub-tasks by nesting an array of task objects directly inside `ENTITY.metadata = { "sub_tasks": [...] }`.
  * Developer B models Sub-tasks as separate `ENTITY` records (`type: workstream`) connected to the parent Project via `RELATION` edges (`predicate: sub_task_of`).
* **Implementation Risk:** System A's graph query engine will fail to discover Sub-tasks in System B's store because System A expects them as relational graph edges, while System B buried them in unstructured metadata JSON.

### 2.2 Missing Scoping Reference on `DIRECTIVE`
* **Specification Defect:** Section 3.2 states that a `DIRECTIVE` can be *"Scoped to an ENTITY (e.g. a rule specific to a workstream)"*. However, Section 3.2 lists **no `scoped_entity_id` field** under either Required or Optional fields for `DIRECTIVE`.
* **Divergence Scenario:**
  * Developer A invents an un-spec'd field on `DIRECTIVE`: `DIRECTIVE.scoped_entity_id = "proj_123"`.
  * Developer B uses a `RELATION` edge: `source_id: "dir_456"`, `target_id: "proj_123"`, `predicate: "governs"`.
* **Implementation Risk:** System B will ignore System A's directive scope because it looks for `RELATION` edges in the graph, rendering System A's scoped rule globally active in System B!

---

## Section 3: Operational Attribute Contradictions & Token Budget Failures

### 3.1 Undefined Field Contradiction in Always-On Trigger Rules
* **Specification Defect:** Section 3.2 states that a `DIRECTIVE` activation class is `always_on` if `enforcement == hard` OR `is_global_style == true`. However, **`is_global_style` is NOT defined as a field in Section 3.2**.
* **Divergence Scenario:** Developer A adds a boolean `is_global_style` field to `DIRECTIVE`. Developer B checks if `domain == "global_style"`. Developer C ignores `is_global_style` entirely because it's not in the field list.
* **Implementation Risk:** Directives intended for Tier 0 (Preamble) will fail to activate in System B and C, omitting critical style or safety rules from the prompt context.

### 3.2 Token Budget Overflow Strategy Void
* **Specification Defect:** Section 4 caps Tier 0 (Always-On Preamble) at **≤500 tokens**. The spec provides **zero overflow policy** for when the total size of all `always_on` primitives exceeds 500 tokens.
* **Divergence Scenario:**
  * Developer A's system throws a fatal build error and halts compilation.
  * Developer B's system silently truncates directives from the bottom of the list.
  * Developer C's system demotes `soft` directives to `on_demand` (Tier 1) and retains `hard` constraints.
* **Implementation Risk:** Non-deterministic prompt outputs. In System B, critical safety constraints at the bottom of the file are silently dropped, causing security bypasses.

### 3.3 Qualitative Volatility Metrics Without Quantitative Realization
* **Specification Defect:** `volatility` accepts `invariant`, `low`, `medium`, `high`. The spec provides no quantitative time-to-live (TTL), cache eviction window, or re-verification schedule for these labels.
* **Divergence Scenario:**
  * Developer A maps `high` volatility to a 1-hour cache TTL.
  * Developer B maps `high` volatility to a 30-day manual review prompt.
* **Implementation Risk:** Inconsistent freshness behavior across systems.

---

## Section 4: Missing Operational Mechanics for `ASSERTION` and `DIRECTIVE`

### 4.1 Required Discriminant Listed as Optional
* **Specification Defect:** Section 3.3 lists `type` (`fact`, `decision_adr`, `insight`, `credential_reference`) under **Optional Fields** for `ASSERTION`. However, Section 4 (Mapping Matrix) relies on `type` as the primary discriminant to identify ADRs and Credentials!
* **Divergence Scenario:** Developer A creates an `ASSERTION` with `claim: "Adopt PostgreSQL"` and leaves `type` empty/null.
* **Implementation Risk:** System B's query parser, which filters for `type == "decision_adr"`, will miss Developer A's decision record entirely because `type` was omitted as permitted by Section 3.3.

### 4.2 Ambiguous Handling of Expired / Superseded Assertions
* **Specification Defect:** `ASSERTION` contains optional temporal fields `valid_from` and `valid_to`, plus a `status` of `superseded`. The spec does not define query behavior for expired or superseded assertions.
* **Divergence Scenario:**
  * Developer A's query engine excludes any `ASSERTION` where `valid_to < NOW()`.
  * Developer B's query engine includes expired assertions but prepends an `[EXPIRED]` string flag.
* **Implementation Risk:** Inconsistent retrieval results and context pollution.

---

## Section 5: Security & Redaction Asymmetry

### 5.1 Missing `sensitivity` Field on `ENTITY`, `DIRECTIVE`, and `EVENT`
* **Specification Defect:** The `sensitivity` field (`public`, `internal`, `restricted`) exists **ONLY on `ASSERTION`**. `ENTITY`, `DIRECTIVE`, `EVENT`, and `RELATION` have NO `sensitivity` field defined in Section 3.
* **Divergence Scenario:**
  * A user puts a private medical diagnosis or home address into `ENTITY.description` or `EVENT.summary`.
  * Developer A assumes `ENTITY` and `EVENT` records are always safe for prompt context because they lack a `sensitivity` attribute.
  * Developer B adds an un-spec'd `sensitivity` field to all 5 primitives.
* **Implementation Risk:** Severe PII disclosure. System A will leak sensitive personal data contained in `ENTITY` or `EVENT` records directly into LLM prompts because the specification restricted privacy classification to `ASSERTION` alone!

---

## Section 6: Relation Semantics & Graph Traversal Vulnerabilities

### 6.1 Ungoverned Predicate Vocabulary & Directionality
* **Specification Defect:** `RELATION.predicate` lists string examples (`works_with`, `owns`, `depends_on`, `supersedes`, `governs`, `supports`), but fails to specify whether predicates are a closed enum, if inverse predicates must be inferred, or if relations are strictly directed.
* **Divergence Scenario:**
  * Developer A writes `source_id: "Alice"`, `target_id: "Bob"`, `predicate: "manages"`.
  * Developer B queries "Who is Bob's manager?" and expects a `managed_by` edge. Since System A did not write an inverse edge, System B returns `null`.
* **Implementation Risk:** Complete relational lookup failure during multi-hop graph queries.

### 6.2 Orphan Edge & Cascading Delete Policy Void
* **Specification Defect:** The spec provides no policy for dangling `RELATION` edges when a target `ENTITY` or `ASSERTION` is deleted or archived.
* **Divergence Scenario:** System A hard-deletes an `ENTITY`, leaving orphaned `RELATION` edges. System B attempts to resolve the graph and throws an unhandled `NullPointerException` or `KeyError`.

---

## Summary Table of Specification Ambiguities

| # | Spec Area | Defect Description | System Divergence Consequence |
|---|---|---|---|
| 1 | Identifiers | No format/namespacing for IDs | Foreign key validation & import crashes |
| 2 | Discriminants | `ENTITY.type` open vs closed enum | Dataset rejection during cross-system import |
| 3 | Composition | Hierarchy in `metadata` vs `RELATION` edges | Failure to retrieve sub-entities in graph queries |
| 4 | Directives | Missing `scoped_entity_id` in field list | Scoped rules treated as global directives |
| 5 | Always-On | Un-spec'd `is_global_style` field referenced | Failure to activate global style rules in preamble |
| 6 | Token Budget | No overflow strategy for >500 token preambles | Arbitrary truncation or dropped safety rules |
| 7 | Assertions | `ASSERTION.type` listed as optional, used as required | ADRs and credentials missed in query filters |
| 8 | Security | `sensitivity` field missing on `ENTITY` & `EVENT` | Silent PII & private context leakage into prompts |
| 9 | Relations | Unspecified predicate inverse/directionality | Multi-hop graph query lookup failures |
| 10 | Graph Depth | No max recursion depth for CTE queries | Infinite loops / stack overflow on cyclic graphs |
