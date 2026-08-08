# `@aiet/consolidation`

> Autonomous duplicate detection, contradiction resolution, and memory lineage rollback safety for **AIET**.

---

## Key Capabilities

- **Duplicate Detection**: Multi-modal matching via JCS hash, vector cosine similarity ($\ge 0.88$), and normalized text match.
- **Contradiction Detection**: Detects preference conflicts, subject attribute contradictions, and outdated facts.
- **Lineage & Rollback Safety**: Captures pre-mutation snapshots in `memory_lineage` to allow instant rollback via `rollbackConsolidation(lineageId)`.
