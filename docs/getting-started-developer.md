# Getting Started with AI Engineering Toolkit (AIET)

> **Step-by-step developer tutorial for integrating local-first memory, hybrid search, deterministic context compilation, and MCP agent connectivity with AIET.**

---

## Step 1: Install AIET

Install the unified `@aiet/core` SDK and global CLI:

```bash
# Install core SDK in your project
pnpm add @aiet/core

# Install CLI globally for project initialization & diagnostics
pnpm add -g @aiet/cli
```

---

## Step 2: Initialize Your Project

Run the interactive project initializer or create an `aiet.config.json` configuration:

```bash
aiet init
```

Alternatively, initialize AIET in code:

```typescript
import { createAIET } from "@aiet/core";

const aiet = createAIET({
  storage: "./my-agent-memory.db",
  embeddings: "mock", // 'mock' | 'openai' | 'ollama'
});
```

---

## Step 3: Run Health Diagnostics & Create Database

Verify that your system meets all requirements and that SQLite WAL mode is fully operational:

```typescript
const report = await aiet.doctor.diagnose({ storagePath: "./my-agent-memory.db" });
console.log(aiet.doctor.formatReport(report));
```

Or run via CLI:

```bash
aiet doctor
```

Output:
```
✓ [Node.js Environment] Node.js v22.4.0 detected (meets requirement >= v18)
✓ [SQLite Engine Support] SQLite WAL mode and FTS5 extension fully supported
✓ [Storage Path Access] Database location set to './my-agent-memory.db'
✓ [Embedding Provider (Mock)] Local-first mock embedding provider active
```

---

## Step 4: Connect Your AI Agent (Claude Code / Cursor MCP)

Register AIET's MCP server with your local agent IDE:

```bash
# Connect to Claude Code CLI
aiet connect claude

# Connect to Cursor IDE
aiet connect cursor
```

This adds the following MCP tool configuration to `.cursor/mcp.json`:

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

## Step 5: Store Agent Memory

Ingest conversation input or structured memory primitives:

```typescript
// Store directive from user chat
const result = await aiet.memory.add({
  messages: [
    { role: "user", content: "Always enforce TypeScript strict mode across all packages" }
  ]
});

console.log("Memory Status:", result.status); // 'inserted' or 'proposed'
```

---

## Step 6: Search Memory with Hybrid RRF Retrieval

Search your local knowledge base using combined FTS5 BM25 keyword match and vector cosine similarity:

```typescript
const response = await aiet.memory.search("TypeScript strict mode");

for (const match of response.results) {
  console.log(`[Score: ${match.combined_score.toFixed(3)}]`, match.primitive_id);
}
```

---

## Step 7: Compile System Context Preambles

Compile stored directives and facts into a token-budgeted prompt preamble file (`AGENTS.md`, `CLAUDE.md`, or `.cursorrules`):

```typescript
const result = await aiet.compiler.compile({
  targetFormat: "AGENTS.md",
  tokenBudget: 500,
  outputPath: "./AGENTS.md",
});

console.log(`Compiled ${result.token_count} tokens into ${result.target_format}`);
```

---

## Next Steps

- Explore Autonomous Memory Governance in [`docs/memory-governance.md`](./memory-governance.md)
- Learn about Memory Consolidation & Rollback in [`docs/memory-consolidation.md`](./memory-consolidation.md)
- Check out example applications in `examples/`
