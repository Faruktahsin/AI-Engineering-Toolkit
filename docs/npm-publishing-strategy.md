# AIET npm Package Publishing Strategy (v1.0.1)

## Overview

The **AI Engineering Toolkit (AIET)** is structured as a pnpm monorepo of 28 workspace projects (24 publishable workspace packages plus 4 official example applications). This document defines the explicit package classification, access controls, dependency rules, and publishing matrix for the **`1.0.0`** release.

---

## 1. Explicit Package Classification Matrix

### Category 1: Public Framework Packages (`@aiet/*`) — Published to npm registry

| Package Name | Role & Purpose | Access | Target Release Version |
| :--- | :--- | :--- | :---: |
| `@aiet/core` | **Primary Unified SDK Facade** combining client, memory, compiler, governance, and diagnostics | `public` | `1.0.1` |
| `@aiet/cli` | **Developer CLI** (`aiet init`, `aiet memory`, `aiet compile`, `aiet doctor`) | `public` | `1.0.1` |
| `@aiet/mcp-server` | **MCP Stdio Server** for Claude Code, Cursor, and Windsurf | `public` | `1.0.1` |
| `@aiet/schema` | Formal Zod schemas & TypeScript types for memory primitives | `public` | `1.0.1` |
| `@aiet/domain` | Business domain rules, sanitization, validation, ULID generation | `public` | `1.0.1` |
| `@aiet/storage` | SQLite WAL local database engine, FTS5 BM25 search & RRF retrieval | `public` | `1.0.1` |
| `@aiet/compiler` | Context compilation pipeline & deterministic budget fitting | `public` | `1.0.1` |
| `@aiet/decision-engine` | Scoring & decision rules (CREATE, UPDATE, MERGE, IGNORE) | `public` | `1.0.1` |
| `@aiet/governance` | Proposal approval workflows, audit log ledger, privacy policies | `public` | `1.0.1` |
| `@aiet/consolidation` | Duplicate detection, contradiction detection, memory lineage | `public` | `1.0.1` |
| `@aiet/extractor` | Autonomous memory candidate extraction heuristics | `public` | `1.0.1` |
| `@aiet/embeddings` | Vector similarity math, serialization & base provider interface | `public` | `1.0.1` |
| `@aiet/embeddings-openai` | OpenAI text-embedding-3 integration | `public` | `1.0.1` |
| `@aiet/embeddings-ollama` | Ollama local embeddings provider | `public` | `1.0.1` |
| `@aiet/adapter-vercel` | Vercel AI SDK memory provider & SSE streaming adapter | `public` | `1.0.1` |
| `@aiet/adapter-langgraph` | LangGraph checkpointer & memory state saver | `public` | `1.0.1` |
| `@aiet/adapter-openai-agents` | OpenAI Agents SDK tool definitions (`createAIETAgentTools`) | `public` | `1.0.1` |
| `@aiet/config` | Configuration loader & workspace profile parser | `public` | `1.0.1` |
| `@aiet/contracts` | Primitive contract interfaces & type definitions | `public` | `1.0.1` |
| `@aiet/errors` | Standard error hierarchies & error code enumerations | `public` | `1.0.1` |
| `@aiet/logging` | Structured JSON logger & diagnostic tracing | `public` | `1.0.1` |
| `@aiet/utils` | Shared helper functions & string/path sanitization | `public` | `1.0.1` |
| `@aiet/testing` | Test harnesses, mock providers, and reproducibility fixtures | `public` | `1.0.1` |

### Category 2: Compatibility & Deprecated Packages

| Package Name | Purpose & Status | Access | Target Release Version |
| :--- | :--- | :--- | :---: |
| `@aiet/pakb` | **Backward Compatibility Alias**: Re-exports `@aiet/core` to prevent breaking legacy installations | `public` | `1.0.1` |

### Category 3: Official Example Applications — Not published to npm (`"private": true`)

| Application Path | Target Integration & Purpose | Access |
| :--- | :--- | :---: |
| `examples/coding-agent` | Developer preferences, ADR assertions, context compiler | `private` |
| `examples/research-agent` | LangGraph checkpointing & memory consolidation | `private` |
| `examples/customer-support-agent` | Vercel AI SDK memory provider & governance workflows | `private` |
| `examples/personal-assistant` | OpenAI Agents SDK tool integration & explainability | `private` |

---

## 2. Package Configuration Standards

Every public package `package.json` must contain:

```json
{
  "name": "@aiet/<package-name>",
  "version": "1.0.1",
  "description": "<Description>",
  "author": "AIET Contributors",
  "license": "Apache-2.0",
  "homepage": "https://github.com/Faruktahsin/AI-Engineering-Toolkit",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Faruktahsin/AI-Engineering-Toolkit.git"
  },
  "publishConfig": {
    "access": "public"
  },
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  }
}
```

---

## 3. Dependency Boundaries & Versioning Strategy

1. **Internal Monorepo Dependencies**:
   Public packages MUST reference sibling packages using exact workspace protocol for local builds, e.g. `"@aiet/schema": "workspace:*"` which resolves to the matching release version (`1.0.1`) during publishing.

2. **External Dependencies**:
   - `better-sqlite3`: Peer dependency / external binary dependency for native SQLite WAL.
   - `zod`: Dependency for schema validation.
   - `ulid`: ULID generation.

3. **Semantic Versioning Specification**:
   - Next stable release version: `1.0.1` (prepared on `main`; published only when the `v1.0.1` tag is created).
   - Patch releases (`1.0.x`) deliver bug fixes without contract breaking changes.
   - Minor releases (`1.x.0`) introduce backward-compatible feature enhancements.

---

## 4. Publishing Command Sequence

```bash
# 1. Clean workspace & reinstall
pnpm clean && pnpm install

# 2. Execute full validation pipeline
pnpm build && pnpm typecheck && pnpm lint && pnpm test

# 3. Publish to npm registry (dry run)
pnpm -r publish --access public --dry-run

# 4. Live publish (via CI release workflow)
pnpm -r publish --access public --no-git-checks
```
