# AIET Official Demo: Enterprise Customer Support Agent

This official example demonstrates how enterprise developers build a compliant AI Customer Support Agent using **AIET**, `@aiet/adapter-vercel`, and `@aiet/governance`.

---

## 1. Architecture Diagram

```mermaid
flowchart TD
    Customer([Customer / Agent]) --> SupportAgent[CustomerSupportAgent]
    SupportAgent --> Core SDK["@aiet/core (AIETClient)"]
    SupportAgent --> VercelAdapter["@aiet/adapter-vercel Provider"]
    SupportAgent --> Governance["@aiet/governance Proposal Engine"]
    Governance --> AuditLog["Audit Ledger (JCS Hashes)"]
    Governance --> Storage["SQLite Memory Engine"]
```

---

## 2. AIET Infrastructure Components Used

- **`@aiet/core`**: Unified facade API managing memory storage and search.
- **`@aiet/adapter-vercel`**: Vercel AI SDK integration supplying context preambles with source attribution.
- **`@aiet/governance`**: Proposal system trapping sensitive mutations (e.g. SLA refund credit exemptions) for human approval.
- **`@aiet/schema`**: Entity (`ent_`), Event (`evt_`), and Assertion (`ast_`) primitive structures.

---

## 3. Installation & Setup

```bash
# From workspace root
corepack pnpm install --filter @aiet/example-customer-support-agent...
```

---

## 4. Running the Demo

```bash
# Run using tsx
corepack pnpm --filter @aiet/example-customer-support-agent start

# Run unit tests
corepack pnpm --filter @aiet/example-customer-support-agent test
```

---

## 5. Example Interaction

```text
1. Register Customer:
   Agent registers Entity primitive `ent_01J...` (Name: "Acme Corp", Tier: "Enterprise").

2. Record Interaction:
   Agent records Event primitive `evt_01J...` ("Customer reported 500 error on billing API").

3. Propose Exemption:
   Agent proposes Assertion primitive (`ast_01J...`) for 15% SLA credit refund.
   -> Governance traps mutation in `memory_proposals` table with status `pending`.

4. Retrieve Vercel AI SDK Context:
   Agent fetches context preamble using `@aiet/adapter-vercel` for system prompt injection.
```
