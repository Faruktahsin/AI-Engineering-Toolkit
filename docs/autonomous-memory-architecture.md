# Autonomous Memory Formation System: Phase 5 Architectural Specification

> **Evolving AI-Engineering-Toolkit (`AIET`) from a passive memory retrieval engine into a self-managing, local-first autonomous memory infrastructure for stateful AI agents.**

---

## 1. Problem Definition & Strategic Positioning

### 1.1 The Shift from Passive Retrieval to Autonomous Memory Formation

Most existing AI agent memory systems (e.g. basic RAG, vector store wrappers) operate as **passive memory retrieval engines**: they store whatever unstructured text strings an application sends them and retrieve top-$k$ matches based on keyword or vector similarity.

This passive model causes severe production failures in long-running AI agents:
1. **Memory Pollution & Noise**: Raw conversational turns flood vector indexes with trivial, transient statements (e.g., *"Hello", "Can you hear me?"*).
2. **Memory Contradiction & Drift**: As facts change over time (e.g., *"User lives in San Francisco"* vs *"User moved to New York"*), passive memory engines retrieve conflicting statements simultaneously, confusing the LLM.
3. **Lack of Lifecycle & Archival**: Un-pruned memory databases grow infinitely, increasing retrieval latency and cost while degrading prompt preamble quality.
4. **Privacy & Governance Gaps**: Cloud-hosted memory platforms expose sensitive user credentials and PII to third-party servers without user auditability.

**AIET Phase 5** solves this by establishing an **Autonomous Memory Formation System**—a self-managing, local-first pipeline that automatically extracts, evaluates, classifies, consolidates, and governs agent memory primitives while guaranteeing deterministic prompt preambles and local privacy.

---

### 1.2 Competitive Positioning & Differentiation Matrix

| Metric / Feature | **AIET (Phase 5)** | **Mem0** | **Zep** | **Letta / MemGPT** | **LangChain / LlamaIndex Memory** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Architecture** | **Local-First & Deterministic** | Cloud API / Self-hosted | Cloud API / Self-hosted | OS Agent Runtime | In-memory / DB Wrappers |
| **Memory Model** | **5 Typed Graph Primitives** | Unstructured JSON key-value | Dialog Graphs & Embeddings | Virtual Context Paging | Message History Arrays |
| **Memory Formation** | **Autonomous Extraction Pipeline** | LLM Extraction Prompt | Automatic Summarization | Explicit Agent Tool Calls | Manual String Appends |
| **Retrieval Engine** | **Hybrid RRF (FTS5 + Vector + Recency + Importance)** | Vector + Graph | Hybrid Vector + Knowledge Graph | Working Context Paging | Basic Vector Top-$K$ |
| **Conflict Resolution** | **Autonomous Contradiction Detection & JCS Hash Merging** | Basic Key Overwrites | Summary Compression | Manual Agent State Edits | None (Duplicate Vectors) |
| **Governance & Audit** | **Local SQLite WAL + JCS Hashes + Zero-Width Sanitization** | Cloud Terms | Cloud Terms | Local File Logs | None |

---

## 2. High-Level System Architecture & Component Diagram

```
+---------------------------------------------------------------------------------------------------+
|                                      CONVERSATION / EVENT STREAM                                  |
|                          (User Interaction / Agent Execution / Tool Calls)                        |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                    @aiet/extractor (Extractor Engine)                             |
|  - Micro-Extraction (Entity, Directive, Assertion, Event, Relation)                              |
|  - Candidate Primitive Candidate Generation                                                       |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                               @aiet/decision-engine (Decision Engine)                             |
|  - Novelty Scoring & Repetition Frequency Analysis                                                |
|  - Privacy & Sensitivity Tier Classification (Public / Internal / Restricted)                    |
|  - Expiration & Exemption Policy Assignment                                                       |
|  - Action Decision: IGNORE | CREATE | UPDATE | MERGE | REJECT                                      |
+---------------------------------------------------------------------------------------------------+
                                                  |
                        +-------------------------+-------------------------+
                        |                                                   |
                        v (Automated / Approved)                            v (Requires User Approval)
+---------------------------------------------------+     +-----------------------------------------+
|     @aiet/consolidation (Consolidation Engine)    |     |    @aiet/governance (User Approval Flow)  |
|  - FTS5 & Vector Duplication Detection            |     |  - Interactive Proposal Staging Queue   |
|  - Contradiction Resolution & Edge Re-linking     |     |  - Privacy Boundary Audit Logging       |
+---------------------------------------------------+     +-----------------------------------------+
                        |                                                   |
                        +-------------------------+-------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                     @aiet/storage & @aiet/core                                    |
|                      (SQLite WAL Engine, Vector Embeddings, JCS Fingerprints)                      |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Data Flow & Subsystem Specifications

### 3.1 Memory Extraction Pipeline (`@aiet/extractor`)

The extraction pipeline ingests raw conversational turns or agent event streams and emits schema-compliant PAKB primitive candidates.

```
[ Conversation Turn ] ---> [ Heuristic Pre-Filter ] ---> [ LLM Schema Extractor ] ---> [ Candidate Primitives ]
```

1. **Heuristic Pre-Filter**: Filters out conversational filler (*"Thanks", "Okay", "Got it"*) using zero-dependency pattern matchers to avoid unnecessary LLM extraction calls.
2. **LLM Schema Extractor**: Emits structured JSON matching the 5 PAKB Primitive Schemas (`Entity`, `Directive`, `Assertion`, `Event`, `Relation`).

---

### 3.2 Memory decision Engine (`@aiet/decision-engine`)

The Decision Engine evaluates candidate primitives against existing memory to decide whether a candidate should be stored, merged, updated, or ignored.

#### Decision Matrix

$$\text{DecisionScore} = w_1 \cdot \text{Novelty} + w_2 \cdot \text{Usefulness} + w_3 \cdot \text{Confidence} - w_4 \cdot \text{Redundancy}$$

- **IGNORE**: Novelty $< 0.2$ or Confidence $< 0.6$ (trivially redundant or low-confidence noise).
- **CREATE**: Novelty $> 0.8$ and Privacy Tier $\ne \text{RESTRICTED}$ (new fact or directive).
- **UPDATE**: Contradicts an existing assertion/directive with higher confidence or updated timestamp.
- **MERGE**: High semantic similarity ($> 0.92$) with an existing primitive; merges attributes and updates access stats.

---

### 3.3 Memory Types & Primitive Mappings

| Memory Category | Target PAKB Primitive | Key Attributes & Behavioral Semantics |
| :--- | :--- | :--- |
| **User Preferences** | `Directive` | `statement`, `enforcement: "soft"`, `domain: "user_preference"` |
| **User Facts** | `Assertion` | `claim`, `evidence_type: "stated"`, `type: "fact"` |
| **Long-Term Knowledge**| `Assertion` / `Entity` | `type: "fact"` or `type: "insight"`, `volatility: "low"` |
| **Project Context** | `Entity` / `Relation` | `type: "workstream"`, `predicate: "governs"` |
| **Skills & Tools** | `Directive` / `Assertion` | `statement`, `domain: "agent_capability"`, `enforcement: "hard"` |
| **Goals & Objectives** | `Entity` | `type: "objective"`, `status: "active"` |
| **Constraints & Safety** | `Directive` | `statement`, `enforcement: "hard"`, `domain: "safety"` |
| **Relationships** | `Relation` | `source_id`, `target_id`, `predicate`, `weight` |
| **Behavioral Patterns**| `Assertion` | `evidence_type: "inferred"`, `type: "insight"` |

---

### 3.4 Consolidation & Contradiction Resolution (`@aiet/consolidation`)

Consolidation runs both continuously during extraction and in background batch runs:

1. **Duplicate Detection**: Identifies primitives with JCS SHA-256 hash identity or vector similarity score $> 0.92$.
2. **Contradiction Resolution**: When Assertion $A_1$ (*"User prefers TypeScript"*) contradicts Assertion $A_2$ (*"User prefers Python"*):
   - Compares timestamps (`updated_at`), evidence types (`observed` $>$ `stated` $>$ `inferred`), and confidence scores.
   - Marks older primitive `status: "superseded"` and creates a `supersedes` relation edge.
3. **Memory Decay & Archival**: Primitives with low importance ($< 0.2$) and no access touches for $> 90$ days are transitioned to `archived` status, freeing space in active context budgets.

---

### 3.5 Memory Governance & Local Privacy (`@aiet/governance`)

Because AIET is strictly local-first:
- **Sensitivity Tiers**: Automatically flags credentials, financial keys, and private PII as `sensitivity: "restricted"`. Restricted primitives are stored locally in SQLite but permanently blocked from prompt preambles and external LLM APIs.
- **Audit Logging**: Logs every memory creation, modification, merge, and deletion in the immutable `audit_log` table with JCS SHA-256 build hashes.
- **User Approval Staging Queue**: Sensitive or high-impact directives can be routed to `memory_proposals` where a human user must approve them before activation.

---

## 4. Proposed Database Schema Changes

To support Autonomous Memory Formation, the following tables will be added to `@aiet/storage`:

```sql
-- Staging queue for pending memory proposals requiring approval or decision
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

-- Contradiction tracking log
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

## 5. New Monorepo Packages

Phase 5 introduces 4 modular workspace packages under `packages/`:

1. **`packages/extractor` (`@aiet/extractor`)**: Conversation turn parsing and candidate primitive extraction.
2. **`packages/decision-engine` (`@aiet/decision-engine`)**: Novelty scoring, decision logic (IGNORE/CREATE/UPDATE/MERGE), and privacy tier classification.
3. **`packages/consolidation` (`@aiet/consolidation`)**: Contradiction resolution, duplicate merge processing, and recency archival.
4. **`packages/governance` (`@aiet/governance`)**: Proposal staging queue, user approval workflows, and sensitivity tier enforcement.

---

## 6. Implementation Roadmap & Phases

```
+---------------------------------------------------------------------------------------+
|  Phase 5.1: Memory Extraction Engine (@aiet/extractor)                               |
|  - Parse transcript turns & emit schema-compliant candidate primitives                |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|  Phase 5.2: Decision Engine & Privacy Classifier (@aiet/decision-engine)               |
|  - Novelty scoring, decision matrix, sensitivity classification                       |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|  Phase 5.3: Consolidation & Contradiction Engine (@aiet/consolidation)                |
|  - Duplicate merging, contradiction detection, JCS edge re-linking                    |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|  Phase 5.4: Governance & Approval Staging Queue (@aiet/governance)                     |
|  - memory_proposals queue, user confirmation workflows, audit logging                 |
+---------------------------------------------------------------------------------------+
```

---

## 7. Testing & Verification Strategy

- **Deterministic Extraction Mock Tests**: Verify that structured candidate primitives match Draft 2020-12 Ajv schemas without requiring live LLMs.
- **Decision Engine Unit Tests**: Verify decision scores for high-novelty vs redundant inputs across sensitivity tiers.
- **Consolidation Integration Tests**: Verify that merging primitive $B$ into primitive $A$ updates relations and transfers vector embeddings without dangling references.
- **Zero-Egress Security Audits**: Confirm that `sensitivity: restricted` primitives are never written to prompt preambles or external LLM streams.
