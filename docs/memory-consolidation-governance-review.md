# Memory Consolidation & Governance Architecture Review

> **Strategic Architectural Review for Phase 5.3 & Phase 5.4: Sequencing, Safety Mechanisms, Schema Enhancements, and Risk Mitigation for AI-Engineering-Toolkit (`AIET`).**

---

## 1. Executive Summary & Recommended Implementation Sequence

### 1.1 Key Question: Should Governance precede Consolidation?

**RECOMMENDATION: YES. Implement Governance (`@aiet/governance`) FIRST as Phase 5.3, followed by Consolidation (`@aiet/consolidation`) as Phase 5.4.**

#### Architectural Justification:
1. **Safety Before Action**: Memory consolidation automatically mutates SQLite tables, re-links graph relation edges, supersedes facts, and deletes duplicate primitive records. Executing automated state mutations without a staging queue (`memory_proposals`) or audit system (`audit_log`) introduces irreversible data loss risks.
2. **Staging Queue Prerequisite**: Consolidation tasks (such as resolving conflicting assertions or merging duplicate entities) need a standardized proposal queue to stage decisions when confidence scores fall between $0.6$ and $0.85$ or when sensitive data is involved.
3. **User Control Invariant**: AIET's core philosophy prioritizes local privacy and user control. Governance provides the policy enforcement wrapper through which all autonomous memory consolidation operations must pass.

---

## 2. Safety Mechanisms Required Before Autonomous Modification

Before allowing AIET to autonomously modify storage, 5 safety guardrails must be active:

```
[ Memory Extraction / Decision ]
               |
               v
  +--------------------------+
  |    Sensitivity Check     | ---> (RESTRICTED? Lock to Local-Only SQLite)
  +--------------------------+
               |
               v
  +--------------------------+
  |    Confidence Check      | ---> (< 0.6? Reject; 0.6 - 0.85? Stage Proposal; > 0.85? Auto-Apply)
  +--------------------------+
               |
               v
  +--------------------------+
  |  JCS Hash & Audit Log    | ---> (Record SHA-256 immutable build fingerprint before write)
  +--------------------------+
               |
               v
  +--------------------------+
  |  Soft Deletion / Archival| ---> (Mark status = 'superseded' before permanent removal)
  +--------------------------+
```

1. **Staging Queue (`memory_proposals`)**: Staging table for pending decisions requiring human user confirmation or policy validation.
2. **Immutable Audit Ledger (`audit_log`)**: Logs every memory creation, update, merge, supersession, and deletion with JCS SHA-256 build hashes.
3. **Zero-Egress Sensitivity Boundaries**: Strict runtime check blocking `sensitivity: restricted` primitives from being sent to external LLMs or prompt preambles.
4. **Soft Deletion & Supersession**: Memory items are marked as `superseded` or `archived` rather than instantly hard-deleted, maintaining historical auditability.
5. **Reversible Graph Relinking**: When merging entity $B$ into entity $A$, relation edges retain a lineage pointer (`merged_from_id`) in metadata for rollbacks.

---

## 3. Detailed Memory Scenario Handling Matrix

| Scenario | Detection Mechanism | Resolution Workflow | Governance Guardrail |
| :--- | :--- | :--- | :--- |
| **Duplicate Memories** | JCS Hash match OR Vector similarity $> 0.92$ | `mergeMemories(primaryId, duplicateIds)` re-links relation edges and transfers vector embeddings. | Auto-applied if confidence $> 0.9$; staged in `memory_proposals` if confidence $0.7 - 0.9$. |
| **Contradictory Memories** | Keyword / Semantic contradiction detection (e.g. *"prefers Python"* vs *"prefers Java"*) | Compare timestamps (`updated_at`), evidence types (`observed` > `stated` > `inferred`), and confidence scores. Mark older item `status: "superseded"` and create `supersedes` relation edge. | Logged in `memory_contradictions` table; high-impact directives staged for user review. |
| **Outdated Memories** | Exponential recency decay score $\text{RecencyScore} < 0.2$ and zero access touches for $> 60$ days | Transition primitive status to `archived`, removing it from active token budget preambles while retaining SQLite storage. | User can inspect archived memories via MCP tool `pakb_list_archived`. |
| **Sensitive Memories** | Heuristic pattern match (API keys, passwords, credentials, PII) | Assign `sensitivity: "restricted"`. Store locally in SQLite WAL database. | Hard-blocked from prompt compiler preambles and external LLM APIs. |
| **User-Requested Deletion** | Direct API or MCP call `deleteMemory(id, options)` | Hard-delete or soft-delete primitive, purge FTS5 index, purge vector embedding, and record in `audit_log`. | Immediate execution; generates audit log entry with initiator `user`. |

---

## 4. Proposed Database Schema Changes

To support Governance (Phase 5.3) and Consolidation (Phase 5.4), the following tables will be added to `@aiet/storage`:

```sql
-- Phase 5.3: Memory Staging & Approval Queue Table
CREATE TABLE IF NOT EXISTS memory_proposals (
    proposal_id TEXT PRIMARY KEY CHECK (proposal_id GLOB 'prop_[0-9A-HJKMNP-TV-Z]*'),
    candidate_primitive_json TEXT NOT NULL CHECK (json_valid(candidate_primitive_json)),
    decision_type TEXT NOT NULL CHECK (decision_type IN ('create', 'update', 'merge', 'supersede')),
    target_primitive_id TEXT REFERENCES primitives_registry(id) ON DELETE CASCADE,
    confidence_score REAL NOT NULL CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'auto_applied')),
    reasoning TEXT,
    created_at TEXT NOT NULL CHECK (created_at GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z')
);

-- Phase 5.4: Contradiction & Lineage Tracking Table
CREATE TABLE IF NOT EXISTS memory_contradictions (
    contradiction_id TEXT PRIMARY KEY CHECK (contradiction_id GLOB 'crd_[0-9A-HJKMNP-TV-Z]*'),
    existing_primitive_id TEXT NOT NULL REFERENCES primitives_registry(id) ON DELETE CASCADE,
    competing_primitive_id TEXT NOT NULL REFERENCES primitives_registry(id) ON DELETE CASCADE,
    resolution_status TEXT NOT NULL CHECK (resolution_status IN ('unresolved', 'superseded', 'coexisted')),
    resolved_by TEXT NOT NULL CHECK (resolved_by IN ('auto_confidence', 'user_approval', 'decay')),
    created_at TEXT NOT NULL CHECK (created_at GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z')
);
```

---

## 5. Revised Monorepo Implementation Order

```
+---------------------------------------------------------------------------------------+
|  Phase 5.3: Governance & Staging System (@aiet/governance)                             |
|  - Add `memory_proposals` table to @aiet/storage                                      |
|  - Build ProposalStagingQueue, UserApprovalWorkflow, and Zero-Egress Boundary Guard   |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|  Phase 5.4: Memory Consolidation Engine (@aiet/consolidation)                         |
|  - Add `memory_contradictions` table to @aiet/storage                                 |
|  - Build ContradictionResolver, DuplicateMerger, and RecencyArchiver                  |
+---------------------------------------------------------------------------------------+
```

---

## 6. Risks & Mitigation Plan

| Risk | Mitigation |
| :--- | :--- |
| **Accidental Overwrite of Critical User Directives** | Directives with `enforcement: "hard"` can never be automatically superseded without explicit user approval in `memory_proposals`. |
| **Dangling Graph Relations After Merges** | Atomic SQLite transactions (`BEGIN...COMMIT`) with FK constraints `ON DELETE CASCADE` and edge re-linking routines. |
| **Performance Impact on Large Memory Databases** | Background asynchronous processing for proposal evaluation and batch consolidation runs. |
