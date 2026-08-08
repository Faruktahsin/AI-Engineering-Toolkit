# LangGraph Integration Guide — AI Engineering Toolkit (AIET)

> **Official Integration Guide for `@aiet/adapter-langgraph`**  
> *Date: August 8, 2026*

---

## 1. Overview

`@aiet/adapter-langgraph` provides state graph node creators and state checkpointer persistence for LangGraph workflows. AIET complements LangGraph's short-term state memory by providing local-first, governance-gated long-term storage and deterministic context compilation.

---

## 2. Installation

```bash
npm install @aiet/core @aiet/adapter-langgraph
```

---

## 3. Graph Node Creators & Usage

```typescript
import { createAIET } from "@aiet/core";
import {
  createAIETMemoryNode,
  createAIETCompilerNode,
  createAIETGovernanceNode,
  createAIETCheckpointer,
} from "@aiet/adapter-langgraph";

const aiet = createAIET({ storage: "./.aiet/memory.db" });

// 1. Create Graph Nodes
const memoryNode = createAIETMemoryNode(aiet);
const compilerNode = createAIETCompilerNode(aiet);
const governanceNode = createAIETGovernanceNode(aiet);

// 2. Create Checkpointer
const checkpointer = createAIETCheckpointer(aiet);

// 3. Execute Nodes within LangGraph State Transition Workflow
const memoryState = await memoryNode({ query: "architecture constraints" });
console.log("Retrieved AIET memories:", memoryState.aiet_memories);

const contextState = await compilerNode({});
console.log("Compiled System Context Preamble:", contextState.aiet_context);
```

---

## 4. Architecture

```
┌─────────────────┐       Graph Nodes       ┌──────────────────────┐   Local SQLite WAL   ┌──────────────┐
│ LangGraph Agent │ ──────────────────────► │ @aiet/adapter-langgraph│ ─────────────────► │ .aiet/memory │
└─────────────────┘                         └──────────────────────┘                      └──────────────┘
```
