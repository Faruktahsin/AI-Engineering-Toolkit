# Autonomous Memory Governance (`@aiet/governance`)

> **Mandatory Safety Layer, Proposal Staging Queue (`memory_proposals`), Immutable Audit Ledger (`audit_log`), and Zero-Egress Sensitivity Boundary for AI-Engineering-Toolkit (`AIET`).**

---

## 1. Overview

`@aiet/governance` sits as the mandatory control gate between decision evaluation (`@aiet/decision-engine`) and storage mutation (`@aiet/storage`). It ensures that no memory primitive is created, updated, merged, or superseded without passing policy checks, privacy boundary filters, and proposal approval staging when required.

---

## 2. Governance Architecture

```
[ Decision Result (@aiet/decision-engine) ]
                    |
                    v
    [ Governance Policy Evaluator ]
                    |
      +-------------+-------------+
      |                           |
(AUTO_APPLY)             (REQUIRE_APPROVAL)
      |                           |
      v                           v
[ Apply State Mutation ]   [ Insert Pending Proposal ]
      |                           |
      |                     (User Action via API/MCP)
      |                           |
      +-------------+-------------+
                    |
                    v
     [ Immutable Audit Log Entry ]
```

---

## 3. Policy Modes & Rules

| Policy Mode | Criteria | System Action |
| :--- | :--- | :--- |
| **`AUTO_APPLY`** | High confidence ($\ge 0.85$), non-sensitive (`PUBLIC`), low-risk decision (`CREATE` / `UPDATE`). | Instantly mutates storage and logs `auto_create` / `auto_update` in `audit_log`. |
| **`REQUIRE_APPROVAL`** | Sensitive data (`RESTRICTED`), structural merges (`MERGE`), or medium confidence ($0.60 - 0.85$). | Inserts pending row into `memory_proposals` queue awaiting human approval. |

---

## 4. Zero-Egress Privacy Boundary

AIET enforces local privacy for all `RESTRICTED` sensitivity memory primitives:
- `isPromptCompilationAllowed(primitive)` returns `false` if `primitive.sensitivity === "restricted"`.
- `RESTRICTED` primitives remain strictly in local SQLite WAL storage and are **permanently blocked** from prompt preambles and external LLM API streams.

---

## 5. Usage Example

```typescript
import {
  GovernanceManager,
  PAKBStorageRepository,
  createDatabaseConnection,
} from "@aiet/core";

const db = createDatabaseConnection({ filename: "./agent-memory.db" });
const storage = new PAKBStorageRepository(db);
const gov = new GovernanceManager(storage);

// 1. Create Memory Proposal
const proposal = await gov.createMemoryProposal(candidate, decisionResult);

// 2. Inspect Pending Proposals
const pendingProposals = await gov.getPendingProposals();

// 3. User Approves Proposal
if (pendingProposals[0]) {
  await gov.approveMemoryProposal(pendingProposals[0].proposal_id);
}

// 4. Retrieve Audit History
const auditHistory = await gov.getAuditHistory();
console.log("Audit History:", auditHistory);
```

---

## 6. Governance MCP Tools

- `pakb_list_memory_proposals`: Returns all pending memory proposals requiring human confirmation.
- `pakb_approve_memory`: Approves a pending proposal by `proposal_id`.
- `pakb_reject_memory`: Rejects a pending proposal by `proposal_id`.
- `pakb_memory_audit`: Retrieves chronological audit history logs.
