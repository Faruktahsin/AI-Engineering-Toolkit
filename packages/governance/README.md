# `@aiet/governance`

> Mandatory safety gate, proposal staging queue (`memory_proposals`), immutable audit ledger (`audit_log`), and zero-egress privacy enforcement for **AIET**.

---

## Key Concepts

- **Proposal Queue**: Human-in-the-loop review for sensitive (`RESTRICTED`), structural (`MERGE`), or medium-confidence proposals.
- **Audit Ledger**: Immutable log recording operation types, primitive IDs, initiators, and JCS hashes.
- **Zero-Egress Enforcement**: Permanently blocks `RESTRICTED` primitives from prompt preambles and external LLM streams.
