# `@aiet/mcp-server`

> Model Context Protocol (MCP) server integration for Claude Code, Cursor, and Windsurf for **AIET**.

---

## Capabilities

Exposes local AIET memory primitives, hybrid search, preamble compilation, and governance proposal approvals as MCP tools:
- `pakb_get_primitive`: Retrieve primitive by ID
- `pakb_search`: Execute hybrid FTS5 + Vector search
- `pakb_propose_memory`: Stage memory candidate proposal
- `pakb_list_memory_proposals`: List pending proposals
- `pakb_approve_memory`: Approve memory proposal
- `pakb_reject_memory`: Reject memory proposal
- `pakb_memory_audit`: Retrieve audit log history
- `pakb_find_duplicates`: Detect duplicate primitives
- `pakb_list_contradictions`: List memory contradictions
- `pakb_resolve_contradiction`: Resolve memory contradiction
