# `@aiet/core`

> Primary TypeScript SDK and unified facade for the **AI Engineering Toolkit (AIET)**.

---

## Installation

```bash
npm install @aiet/core
# or
pnpm add @aiet/core
```

---

## Quickstart Usage

```typescript
import { createAIET } from "@aiet/core";

// 1. Initialize AIET Client Facade
const aiet = createAIET({
  storage: "./aiet-memory.db",
  embeddings: "mock", // 'mock' | 'openai' | 'ollama'
});

// 2. Add Memory Primitive or Conversation Input
await aiet.memory.add({
  messages: [
    { role: "user", content: "Always use TypeScript strict mode for AIET packages" }
  ]
});

// 3. Search Memory (FTS5 BM25 + Vector RRF Hybrid Search)
const results = await aiet.memory.search("TypeScript strict mode");
console.log("Memory Search Results:", results);

// 4. Compile System Preamble (Context Compiler)
const compiled = await aiet.compiler.compile({
  targetFormat: "AGENTS.md",
  tokenBudget: 500,
  outputPath: "./AGENTS.md"
});

// 5. Run Health Diagnostics
const report = await aiet.doctor.diagnose();
console.log(aiet.doctor.formatReport(report));

// Close Storage Connection
await aiet.close();
```

---

## Architecture Overview

`@aiet/core` encapsulates the underlying AIET packages:
- **`aiet.memory`**: Add, search, list, and consolidate memory primitives.
- **`aiet.compiler`**: Compile deterministic context preambles (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`).
- **`aiet.governance`**: Manage pending proposals, approval workflows, and audit ledgers.
- **`aiet.doctor`**: Diagnose environment health, SQLite support, and MCP agent configs.
