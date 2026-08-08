# Autonomous Memory Consolidation (`@aiet/consolidation`)

> **Duplicate Detection, Contradiction Resolution, Memory Lineage & Rollback Safety with Mandatory Governance Control Integration for AI-Engineering-Toolkit (`AIET`).**

---

## 1. Overview

`@aiet/consolidation` is the autonomous memory maintenance system in AIET. It detects duplicate memories, resolves conflicting assertions or preferences, maintains memory lineage snapshots for rollback safety, and submits all state mutation actions (`MERGE`, `SUPERSEDE`, `ARCHIVE`) through the mandatory control gate of `@aiet/governance`.

---

## 2. Consolidation Pipeline Architecture

```
[ Extracted Candidate / Existing Primitives ]
                     |
                     v
       +-------------+-------------+
       |                           |
[ Duplicate Detector ]    [ Contradiction Detector ]
       |                           |
 (Hash/Vector/Text)        (Preferences/Facts)
       |                           |
       +-------------+-------------+
                     |
                     v
           [ Consolidation Engine ]
                     |
         (1) Save Memory Lineage Snapshot
         (2) Create Proposal via @aiet/governance
                     |
                     v
        [ Mandatory Governance Control Gate ]
```

---

## 3. Core Detection Capabilities

### Duplicate Detection (`DuplicateDetector`)
1. **JCS Hash Equality**: Bit-for-bit canonical JSON hash matching via `calculateJCSHash()`.
2. **Vector Similarity**: Cosine similarity ($\ge 0.88$) across high-dimensional vector embeddings.
3. **Text Exact**: Normalized string match across entity names, assertion claims, and event summaries.

### Contradiction Detection (`ContradictionDetector`)
1. **`PREFERENCE_CONFLICT`**: Detects conflicting user choices (e.g., "User prefers Java" vs "User prefers Python").
2. **`CONTRADICTING_ASSERTION`**: Detects conflicting subject attributes (e.g., "AIET uses PostgreSQL" vs "AIET uses SQLite").
3. **`OUTDATED_FACT`**: Detects older facts invalidated by newer assertions over time.

---

## 4. Consolidation Actions & Lineage Rollback

| Action | Description | Governance Policy |
| :--- | :--- | :--- |
| **`MERGE`** | Merges source primitive into target primitive and links relationship graph. | `REQUIRE_APPROVAL` |
| **`SUPERSEDE`** | Updates older fact status to `superseded` and activates new assertion. | `AUTO_APPLY` (High Conf) or `REQUIRE_APPROVAL` |
| **`ARCHIVE`** | Deactivates obsolete or invalid primitive into historical state. | `REQUIRE_APPROVAL` |
| **`COEXIST`** | Retains both primitives when contextual nuance supports dual existence. | `AUTO_APPLY` |

### Rollback Safety (`memory_lineage`)
Before any primitive mutation is submitted to governance, `ConsolidationEngine` records a bit-for-bit snapshot in `memory_lineage`. If an operation is rejected or needs reversal, calling `rollbackConsolidation(lineageId)` restores the exact original primitive into storage.

---

## 5. Usage Example

```typescript
import {
  ConsolidationEngine,
  ContradictionDetector,
  DuplicateDetector,
  GovernanceManager,
  PAKBStorageRepository,
  createDatabaseConnection,
} from "@aiet/core";

const db = createDatabaseConnection({ filename: "./agent-memory.db" });
const storage = new PAKBStorageRepository(db);
const gov = new GovernanceManager(storage);
const engine = new ConsolidationEngine(storage, gov);

// 1. Find Duplicates
const dupDetector = new DuplicateDetector();
const duplicates = dupDetector.findDuplicates(primitives);

// 2. Propose Consolidation with Lineage Tracking
const { proposal, lineage_id } = await engine.proposeConsolidation({
  action: "MERGE",
  sourcePrimitive: duplicateSource,
  targetPrimitiveId: targetEntity.id,
  reasoning: "Merge duplicate source entity into target entity",
  confidence: 0.95,
});

// 3. Rollback if Needed
await engine.rollbackConsolidation(lineage_id);
```

---

## 6. MCP Consolidation Tools

- `pakb_find_duplicates`: Scans storage primitives for potential duplicates using JCS hash, text, or vector similarity.
- `pakb_list_contradictions`: Lists detected memory contradictions (`detected`, `resolved`, `ignored`).
- `pakb_resolve_contradiction`: Resolves a detected memory contradiction (`merge`, `supersede`, `archive`, `coexist`).
