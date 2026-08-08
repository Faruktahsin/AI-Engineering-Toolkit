# OpenAI Agents SDK Integration Guide — AI Engineering Toolkit (AIET)

> **Official Integration Guide for `@aiet/adapter-openai-agents`**  
> *Date: August 8, 2026*

---

## 1. Installation

```bash
npm install @aiet/core @aiet/adapter-openai-agents
```

---

## 2. Usage & Configuration

```typescript
import { createAIET } from "@aiet/core";
import { createAIETAgentTools } from "@aiet/adapter-openai-agents";

// 1. Initialize AIET SDK
const aiet = createAIET({ storage: "./.aiet/memory.db" });

// 2. Generate OpenAI Agent Function Tools
const tools = createAIETAgentTools(aiet);

// 3. Register tools with OpenAI Agent / Function calling
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Search project memory for database rules" }],
  tools: Object.values(tools).map((t) => ({ type: t.type, function: t.function })),
});
```

---

## 3. Supported Function Tools

| Tool Name | Description |
|---|---|
| `aiet_search_memory` | FTS5 + Vector hybrid retrieval with source attribution scores |
| `aiet_propose_memory` | Stages new memory candidate via governance pipeline |
| `aiet_compile_context` | Generates token-budgeted system preamble (`AGENTS.md`) |
| `aiet_get_proposals` | Retrieves pending memory proposals awaiting approval |
