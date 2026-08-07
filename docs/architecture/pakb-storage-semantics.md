# Personal AI Knowledge Base (PAKB) — Storage Semantics v1.0

**Specification Title:** PAKB Storage Semantics v1.0  
**Status:** Frozen Normative Specification  
**Publication Date:** 5 August 2026  
**Author:** Senior Software Architect  
**Parent Specifications:** 
* `PAKB-Refactored-Domain-Model.md` (Domain Model v1.0)
* `PAKB-ADRs-v1.0.md` (Architecture Decision Records v1.0)
* `pakb-schema-v1.json` (JSON Schema v1.0)

---

## 1. Scope & Storage Abstraction Layer

This document defines the normative persistence semantics for the Personal AI Knowledge Base (PAKB). Conforming storage backends—whether file-system based, relational, document, or key-value stores—MUST implement the behavioral guarantees defined herein.

This specification operates above the physical storage tier. It defines abstract state transitions, transaction guarantees, immutability constraints, and referential integrity policies independently of specific storage technologies or SQL dialects.

---

## 2. Normative Keyword Definitions
The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 / RFC 2119.

---

## 3. Object Lifecycle Semantics

### 3.1 Lifecycle States
Every primitive stored within PAKB exists in exactly one of the following four lifecycle states at any given moment:
1. **Active**: The primitive is live, valid, and available for context compilation and query operations.
2. **Superseded**: The primitive (typically an `ASSERTION` or `DIRECTIVE`) has been replaced by a newer primitive, but remains in storage for historical auditability and temporal graph navigation.
3. **Archived**: The primitive is soft-retired. It is excluded from standard active queries and context compilation, but remains retrievable via explicit historical query parameters.
4. **Deleted**: The primitive record has been permanently or tombstones-purged from the active storage engine.

```
                  ┌──────────────┐
                  │    ACTIVE    │
                  └──────┬───────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
  ┌──────────────┐┌──────────────┐┌──────────────┐
  │  SUPERSEDED  ││   ARCHIVED   ││   DELETED    │
  └──────────────┘└──────────────┘└──────────────┘
```

### 3.2 State Transitions

#### 3.2.1 Creation
* A new primitive MUST be assigned a valid, prefixed Crockford Base32 ULID per ADR-001.
* Prior to ID assignment and hashing, string fields MUST be sanitized per ADR-002 (zero-width character stripping and secret scanning).
* The storage engine MUST populate `created_at` and `updated_at` with the current UTC timestamp formatted per ADR-001 §3.1 (`YYYY-MM-DDTHH:mm:ssZ`).
* The storage engine MUST validate the payload against `pakb-schema-v1.json`. Payloads failing validation MUST NOT be persisted.

#### 3.2.2 Update
* An update modifies mutable fields of an existing `Active` primitive.
* The primitive's `id` and `created_at` MUST remain unchanged.
* The `updated_at` timestamp MUST be set to the current UTC timestamp (`YYYY-MM-DDTHH:mm:ssZ`).
* The update payload MUST be validated against `pakb-schema-v1.json`.

#### 3.2.3 Verification
* Verification updates the operational freshness marker (`last_verified`) of a primitive without altering its underlying domain content.
* Updating `last_verified` MUST update `updated_at` to the current UTC timestamp.

#### 3.2.4 Supersession
* When an `ASSERTION` or `DIRECTIVE` is superseded by a new primitive:
  1. The new primitive MUST be created with its own unique ULID.
  2. The old primitive's `status` MUST be set to `superseded` (for `ASSERTION`).
  3. An explicit `RELATION` edge MUST be created: `source_id: <new_primitive_id>`, `target_id: <old_primitive_id>`, `predicate: "supersedes"`.
  4. The old primitive MUST NOT be deleted or purged; it transitions to the `Superseded` lifecycle state.

#### 3.2.5 Archival
* Archival transitions an `Active` primitive (`ENTITY.status = "archived"`) out of standard operational query views.
* Archival MUST NOT break existing `RELATION` edges. Referencing edges remain valid in historical graph queries.

#### 3.2.6 Deletion
* Deletion is a terminal operation that removes or tombstones a primitive from storage.
* Deletion policies MUST adhere strictly to Section 8 (Referential Integrity & Cascading Deletion).

---

## 4. Immutability & Audit Rules

### 4.1 Immutable Fields
The following fields are strictly **immutable** once a primitive has been persisted:
1. `id`: Primary ULID identifier.
2. `created_at`: Original creation timestamp.
3. `schema_version`: Schema version under which the primitive was authored.

If a request attempts to mutate an immutable field, the storage engine MUST reject the operation and throw `ImmutableFieldViolationError`.

### 4.2 Mutable Fields
The following fields MAY be updated during the lifecycle of an `Active` primitive:
* `updated_at` (MUST be updated by the engine on any modification)
* `last_verified`
* `sensitivity`
* `volatility`
* `activation`
* Domain-specific payload fields (`name`, `statement`, `claim`, `summary`, `description`, `status`, `metadata`, etc.)

### 4.3 Audit Expectations
* Storage backends SHOULD maintain an immutable, append-only transaction audit log recording all primitive state mutations (`CREATE`, `UPDATE`, `SUPERSEDE`, `ARCHIVE`, `DELETE`).
* Audit records MUST record: `timestamp`, `primitive_id`, `operation_type`, `initiator` (`human_user` vs `agent_proposal`), and `previous_jcs_hash`.

---

## 5. Versioning & Migration Semantics

### 5.1 Object Versioning
* Primitive object versioning is represented by `updated_at` timestamp progression combined with RFC 8785 JCS SHA-256 hash comparison.
* Storage backends MUST treat any change in JCS SHA-256 hash as a distinct object revision.

### 5.2 Schema Versioning
* All persisted primitives MUST include `schema_version` set to a valid SemVer string matching `^1\.[0-9]+\.[0-9]+$` (for v1.x schema instances).
* Storage engines MUST reject primitive payloads where `schema_version` is incompatible with the supported engine major version.

### 5.3 Backward & Forward Compatibility Rules
* **Backward Compatibility**: A v1.x storage engine MUST be capable of reading primitives authored under any v1.y schema where $y \le x$.
* **Forward Compatibility**: Unrecognized fields outside the JSON schema are prohibited by `additionalProperties: false`. Ephemeral extensions MUST use the `metadata` object within the scope restrictions defined in ADR-005.

---

## 6. Import, Export, & Merge Semantics

### 6.1 Identity Preservation
* During export operations, primitive payloads MUST be serialized directly from their canonical storage representation, preserving all primary ULIDs and timestamps.
* During import operations, incoming ULIDs MUST be preserved by default to maintain cross-system graph edges.

### 6.2 Duplicate Detection
* Duplicate detection MUST evaluate incoming primitives using RFC 8785 JSON Canonicalization Scheme (JCS) SHA-256 byte stream hashing per ADR-001 §3.2.
* If an incoming primitive shares an `id` and an identical JCS SHA-256 hash with a stored primitive, the import operation MUST treat the item as a duplicate and perform an idempotent no-op.

### 6.3 Conflict Resolution & Merge Behavior
* If an incoming primitive shares an `id` with a stored primitive but produces a differing JCS SHA-256 hash:
  1. **Default Mode**: The storage engine MUST reject the batch and throw `IDCollisionError`.
  2. **Autorename Mode (`--autorename`)**: The engine MUST generate a new Base32 ULID for the incoming primitive, re-assign `id`, and dynamically update all incoming `RELATION` records referencing the old ID to the new ULID.

---

## 7. Transaction Semantics

### 7.1 Atomicity Requirements
* All state mutations involving multiple primitives (such as creating a new `ASSERTION` and its accompanying `RELATION` edge, or executing an `--autorename` import) MUST be executed within an **Atomic Transaction Boundary**.
* If any primitive or edge write within a transaction fails, the entire transaction MUST be rolled back, leaving the storage engine in its pre-transaction state.

### 7.2 Consistency Guarantees
* The storage engine MUST enforce schema validity (`pakb-schema-v1.json`), identifier regex patterns, and universal sensitivity requirements prior to committing any transaction.
* Read operations MUST guarantee **Read Committed** isolation at a minimum. Uncommitted transaction writes MUST NEVER be visible to concurrent queries or context compilation processes.

### 7.3 Failure Behavior
* Upon transaction failure (e.g. `IDCollisionError`, `PreambleBudgetExceededError`, schema validation error), the engine MUST:
  1. Abort the transaction and execute a complete state rollback.
  2. Emit a structured, deterministic error payload containing the failing `primitive_id`, error category, and violation detail.

---

## 8. Referential Integrity & Deletion Policies

### 8.1 Directed Edge Validation
* A `RELATION` record is a directed edge connecting `source_id` to `target_id`.
* The storage engine MUST verify that both `source_id` and `target_id` exist as valid primitive IDs prior to persisting a `RELATION`.
* Creating a `RELATION` pointing to a non-existent primitive ID MUST be rejected with `DanglingReferenceError`.

### 8.2 Deletion & Archival Cascading Semantics

#### 8.2.1 Soft Deletion / Archival Cascading
* Archiving or soft-deleting a target or source `ENTITY` MUST NOT delete referencing `RELATION` edges.
* The `RELATION` edges remain stored, but standard active graph queries MUST filter out edges connected to archived entities unless historical retrieval is explicitly enabled.

#### 8.2.2 Hard Deletion Policy
* When a primitive is permanently deleted (hard deletion):
  1. **Cascade Delete Edges**: The storage engine MUST automatically delete all `RELATION` records where `source_id == deleted_id` OR `target_id == deleted_id`.
  2. **Prohibit Cascade to Nodes**: Hard-deleting an `ENTITY` MUST NOT cause cascading deletion of connected `ENTITY` or `ASSERTION` nodes. Connected nodes remain intact; only the joining `RELATION` edges are purged.

---

## 9. Concurrency & Optimistic Locking

### 9.1 Optimistic Concurrency Control (OCC)
* Storage backends MUST implement **Optimistic Concurrency Control** for all update operations.
* The combination of `id` and `updated_at` serves as the concurrency token.

### 9.2 Conflict Detection
* An update request MUST provide the `id` and the expected `updated_at` timestamp of the primitive being modified.
* If the stored `updated_at` timestamp differs from the expected timestamp provided in the update request, a concurrent write has occurred.
* The storage engine MUST abort the update and throw `ConcurrentModificationError`.

### 9.3 Last-Write Policy Prohibition
* Unconditional "last-write-wins" overwrite policies are strictly **PROHIBITED**. All mutations MUST validate `updated_at` concurrency tokens to prevent silent data overwrites by concurrent agents.

---

## 10. Archive Semantics & Historical Retrieval

### 10.1 Archived vs. Deleted Distinction
* **Archived Primitives**: Retain full structural integrity and JCS hash validity. They represent historical context that is no longer active.
* **Deleted Primitives**: Completely removed from storage; referencing `RELATION` edges purged.

### 10.2 Historical Retrieval Rules
* Standard context compilation (Tier 0 and Tier 1 MCP resource listings) MUST exclude primitives where `status == "archived"` or `status == "superseded"` by default.
* Historical query interfaces MAY retrieve archived or superseded primitives when the query explicitly specifies `include_archived: true` or `include_superseded: true`.

---

## 11. Storage Semantics Freeze Statement

**PAKB Storage Semantics v1.0 is the normative persistence specification for the Personal AI Knowledge Base.** This specification is frozen. All conforming storage backends—regardless of underlying technology or database engine—MUST implement the behavioral guarantees defined herein. Any future modifications to persistence rules require a new versioned specification (e.g., Storage Semantics v1.1 or v2.0).
