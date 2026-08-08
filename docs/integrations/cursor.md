# Cursor IDE Integration Guide — AI Engineering Toolkit (AIET)

> **Official Guide for Connecting Cursor IDE to AIET via Model Context Protocol (MCP)**  
> *Date: August 8, 2026*

---

## 1. Overview

Cursor IDE can connect directly to AIET's local-first memory engine via MCP, enabling agentic code assistance with project memory and rules (`.cursorrules`).

---

## 2. Installation & Configuration

Run the AIET connector from your workspace root:

```bash
aiet connect cursor
```

This generates `.cursor/mcp.json` in your project root:

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

## 3. Workflow & Usage

1. Open Cursor IDE.
2. In Cursor Settings -> Features -> MCP, verify `aiet-memory` shows a green connection indicator.
3. In Agent chat, ask Cursor:
   - *"Search project memory for coding guidelines."*
   - *"Propose a new rule that we must use Biome for formatting."*

---

## 4. Context Preamble Compilation

To keep Cursor's `.cursorrules` continuously updated with compiled project directives:

```bash
aiet compile --output .cursorrules
```
