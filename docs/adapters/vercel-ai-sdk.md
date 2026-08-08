# Vercel AI SDK Adapter (`@aiet/adapter-vercel`)

> **Inject Compiled AIET Prompt Context & Local Memory into Next.js and Vercel AI SDK Applications.**

---

## 🚀 Installation

Install `@aiet/adapter-vercel` along with `@aiet/core`:

```bash
pnpm add @aiet/adapter-vercel @aiet/core
```

---

## 💡 Overview

The Vercel AI SDK Adapter allows Next.js App Router applications to seamlessly inject **AI-Engineering-Toolkit (`AIET`)** compiled preambles into Vercel AI SDK `streamText` and `generateText` system prompts, while leveraging local SQLite FTS5 BM25 memory retrieval.

---

## 🛠️ Usage Example (Next.js App Router Route Handler)

### `app/api/chat/route.ts`

```typescript
import { buildAIETSystemPrompt, createAIETMemoryProvider } from "@aiet/adapter-vercel";
import { PAKBStorageRepository, createDatabaseConnection } from "@aiet/core";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

// 1. Initialize local SQLite Memory Engine
const db = createDatabaseConnection({ filename: "./agent-memory.db" });
const storage = new PAKBStorageRepository(db);
const memory = createAIETMemoryProvider(storage);

export async function POST(req: Request) {
  const { messages } = await req.json();
  const lastUserMessage = messages[messages.length - 1]?.content ?? "";

  // 2. Retrieve relevant memory context via FTS5 BM25 search
  const memoryContext = await memory.getMemoryContext(lastUserMessage, { limit: 5 });

  // 3. Build token-budgeted system prompt preamble (500 tokens)
  const systemPrompt = buildAIETSystemPrompt({
    budget: 500,
    strict_mode: true,
    systemPrompt: `You are Nova, an AI Assistant.\n\n${memoryContext}`,
  });

  // 4. Stream response using Vercel AI SDK
  const result = streamText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    messages,
  });

  return result.toDataStreamResponse();
}
```

---

## 📖 API Reference

### `buildAIETSystemPrompt(options)`

Compiles context primitives into a deterministic system prompt preamble.

#### Options (`AIETVercelContextOptions`)
- `primitives?: AnyPrimitive[]`: Optional array of in-memory primitives (if omitted, loads from compiled context).
- `budget?: number`: Token budget limit (default: `500`).
- `strict_mode?: boolean`: Enable strict budget enforcement (default: `true`).
- `target?: "AGENTS.md" | "CLAUDE.md" | ".cursorrules"`: Target preamble template (default: `"AGENTS.md"`).
- `systemPrompt?: string`: Base application instructions to append to compiled context.

---

### `createAIETMemoryProvider(storage)`

Wraps an `@aiet/core` `PAKBStorageRepository` for rapid memory queries.

#### Methods
- `getMemoryContext(query: string, options?: AIETMemoryQueryOptions): Promise<string>`: Returns formatted markdown list of relevant primitives matching `query`.
- `search(query: string, limit?: number)`: Returns raw FTS5 BM25 search results.
- `getPrimitive(id: string)`: Fetches primitive by ID.
