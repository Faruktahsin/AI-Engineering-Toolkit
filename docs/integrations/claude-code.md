# Claude Code Integration Guide — AI Engineering Toolkit (AIET)

> **Official Guide for Connecting Claude Code CLI to AIET via Model Context Protocol (MCP)**  
> *Date: August 8, 2026*

---

## 1. Overview

Claude Code can seamlessly access AIET persistent memory, execute hybrid search queries, inspect primitives, and stage memory proposals using the standard Model Context Protocol (MCP).

---

## 2. Installation & Quick Setup

Run the zero-config CLI connector:

```bash
aiet connect claude
```

This automatically injects the AIET MCP server configuration into `~/.claude/mcp-config.json`:

```json
{
  "mcpServers": {
    "aiet-memory": {
      "command": "npx",
      "args": ["-y", "@aiet/mcp-server"]
    }
  }
}
```

---

## 3. Tool Capabilities in Claude Code

When starting a session with `claude`, the agent automatically discovers the following MCP tools:
- `pakb_search`: Hybrid FTS5 + Vector retrieval over persistent memories.
- `pakb_get_primitive`: Fetches detailed primitive data by Base32 ULID.
- `pakb_propose_memory`: Stages a new memory candidate for human approval.
- `pakb_compile_preamble`: Compiles Tier 0 system instructions (`CLAUDE.md`).
- `pakb_list_memory_proposals`: Inspects pending memory proposals requiring governance review.

---

## 4. Source Attribution & Explainability

All memory retrieval responses include rich source attribution metadata:
```json
{
  "primitive_id": "dir_01J4X89K9Z1A2B3C4D5E6F7G8H",
  "statement": "Never output raw API keys in prompt outputs",
  "attribution": {
    "confidence_score": 0.95,
    "sensitivity": "public",
    "volatility": "low",
    "selection_rationale": "Matched query 'security credentials' via FTS5 BM25 + Vector hybrid RRF score 0.89."
  }
}
```

---

## 5. Architecture

```
┌──────────────┐   Stdio / MCP   ┌─────────────────┐   SQLite WAL   ┌──────────────┐
│ Claude Code  │ ───────────────► │ @aiet/mcp-server│ ─────────────► │ .aiet/memory │
└──────────────┘                 └─────────────────┘                └──────────────┘
```
