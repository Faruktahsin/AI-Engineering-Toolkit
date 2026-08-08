# Windsurf IDE Integration Guide — AI Engineering Toolkit (AIET)

> **Official Guide for Connecting Windsurf IDE to AIET via Model Context Protocol (MCP)**  
> *Date: August 8, 2026*

---

## 1. Overview

Windsurf IDE integrates with AIET through MCP to enable Cascade AI agents to retrieve persistent memory, search project assertions, and submit memory update proposals.

---

## 2. Installation & Configuration

Run the AIET connector:

```bash
aiet connect windsurf
```

This updates `~/.codeium/windsurf/mcp_config.json`:

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

## 3. Capabilities & Features

- **Hybrid Memory Search**: FTS5 BM25 text + vector similarity search across past coding decisions and rules.
- **Attributed Context**: Responses include source confidence scores and sensitivity classifications.
- **Governance Safety Gate**: Cascade agents cannot mutate persistent storage directly; memory changes are staged into `memory_proposals` table for user approval.
