# Vercel AI SDK Integration Guide — AI Engineering Toolkit (AIET)

> **Official Integration Guide for `@aiet/adapter-vercel`**  
> *Date: August 8, 2026*

---

## 1. Overview

`@aiet/adapter-vercel` bridges Vercel AI SDK chat streams (`streamText`, `generateText`) with AIET context compiler preambles and hybrid RRF memory search.

---

## 2. Installation

```bash
npm install @aiet/storage @aiet/adapter-vercel
```

---

## 3. Usage & System Middleware

```typescript
import { PAKBStorageRepository } from "@aiet/storage";
import {
  createAIETMemoryProvider,
  buildAIETSystemPrompt,
} from "@aiet/adapter-vercel";

const storage = new PAKBStorageRepository({ db_path: "./.aiet/memory.db" });
const memoryProvider = createAIETMemoryProvider(storage);

// 1. Build Token-Budgeted System Prompt
const systemPrompt = buildAIETSystemPrompt({
  budget: 500,
  target: "AGENTS.md",
  systemPrompt: "You are a senior TypeScript AI coding assistant.",
});

// 2. Stream Memory Events (SSE Format)
const sseStream = await memoryProvider.streamEvents("security rules");
console.log(sseStream);
```
