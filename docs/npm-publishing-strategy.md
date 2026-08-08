# AIET npm Package Publishing Strategy (v0.1.0-alpha)

## Overview

The **AI Engineering Toolkit (AIET)** is structured as a pnpm monorepo with 28 workspace packages. This document defines the package classification, access controls, dependency rules, and publishing workflow for the initial public **`v0.1.0-alpha`** release.

---

## 1. Package Classification Matrix

### A. Public Framework Packages (`@aiet/*`) — Published to npm registry

| Package Name | Purpose | Access | Version |
| :--- | :--- | :--- | :---: |
| `@aiet/core` | Primary unified SDK facade for AIET client, memory, compiler, governance, doctor | `public` | `0.1.0-alpha` |
| `@aiet/cli` | Production Developer CLI (`aiet init`, `aiet memory`, `aiet compile`, `aiet doctor`) | `public` | `0.1.0-alpha` |
| `@aiet/mcp-server` | Model Context Protocol server for Claude Code, Cursor, and Windsurf | `public` | `0.1.0-alpha` |
| `@aiet/schema` | Formal Zod schemas & TypeScript types for memory primitives | `public` | `0.1.0-alpha` |
| `@aiet/domain` | Business domain rules, sanitization, validation, ULID generation | `public` | `0.1.0-alpha` |
| `@aiet/storage` | SQLite WAL local database engine, FTS5 BM25 search & RRF retrieval | `public` | `0.1.0-alpha` |
| `@aiet/compiler` | Context compilation pipeline & deterministic budget fitting | `public` | `0.1.0-alpha` |
| `@aiet/compiler-cli` | Standalone context compiler CLI (`aiet-compile`) | `public` | `0.1.0-alpha` |
| `@aiet/decision-engine` | Scoring & decision rules (CREATE, UPDATE, MERGE, IGNORE) | `public` | `0.1.0-alpha` |
| `@aiet/governance` | Proposal approval workflows, audit log ledger, privacy policies | `public` | `0.1.0-alpha` |
| `@aiet/consolidation` | Duplicate detection, contradiction detection, memory lineage | `public` | `0.1.0-alpha` |
| `@aiet/extractor` | Autonomous memory candidate extraction heuristics | `public` | `0.1.0-alpha` |
| `@aiet/embeddings` | Vector similarity math, serialization & base provider interface | `public` | `0.1.0-alpha` |
| `@aiet/embeddings-openai` | OpenAI text-embedding-3 integration | `public` | `0.1.0-alpha` |
| `@aiet/embeddings-ollama` | Ollama local embeddings provider | `public` | `0.1.0-alpha` |
| `@aiet/adapter-vercel` | Vercel AI SDK memory provider & SSE streaming adapter | `public` | `0.1.0-alpha` |
| `@aiet/adapter-langgraph` | LangGraph checkpointer & memory state saver | `public` | `0.1.0-alpha` |
| `@aiet/adapter-openai-agents` | OpenAI Agents SDK tool definitions (`createAIETAgentTools`) | `public` | `0.1.0-alpha` |
| `@aiet/config` | Configuration loader & workspace profile parser | `public` | `0.1.0-alpha` |
| `@aiet/contracts` | Primitive contract interfaces & type definitions | `public` | `0.1.0-alpha` |
| `@aiet/errors` | Standard error hierarchies & error code enumerations | `public` | `0.1.0-alpha` |
| `@aiet/logging` | Structured JSON logger & diagnostic tracing | `public` | `0.1.0-alpha` |
| `@aiet/utils` | Shared helper functions & string/path sanitization | `public` | `0.1.0-alpha` |
| `@aiet/testing` | Test harnesses, mock providers, and reproducibility fixtures | `public` | `0.1.0-alpha` |

### B. Private Workspace Packages — Not published to npm (`"private": true`)

| Package Path | Purpose |
| :--- | :--- |
| `examples/coding-agent` | Official Coding Assistant Demo Application |
| `examples/research-agent` | Official Research Agent Demo Application |
| `examples/customer-support-agent` | Official Customer Support Agent Demo Application |
| `examples/personal-assistant` | Official General AI Personal Assistant Demo Application |
| `packages/pakb` | PAKB compatibility shim / internal anchor |

---

## 2. Package Configuration Standards

Every public package `package.json` must contain:

```json
{
  "name": "@aiet/<package-name>",
  "version": "0.1.0-alpha",
  "description": "<Description>",
  "author": "AIET Contributors",
  "license": "Apache-2.0",
  "homepage": "https://github.com/ai-engineering-toolkit/aiet",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/ai-engineering-toolkit/aiet.git"
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
   Public packages MUST reference sibling packages using exact workspace protocol for local builds, e.g. `"@aiet/schema": "workspace:*"` which resolves to matching release version during publishing.

2. **External Dependencies**:
   - `better-sqlite3`: Peer dependency / external binary dependency for native SQLite WAL.
   - `zod`: Dependency for schema validation.
   - `ulid`: ULID generation.

3. **Semantic Versioning Specification**:
   - Initial alpha release: `0.1.0-alpha`.
   - Breaking API changes increment minor version during pre-1.0 (`0.2.0`).
   - Patch releases fix bugs without contract changes (`0.1.1-alpha`).

---

## 4. Publishing Command Sequence

```bash
# 1. Clean workspace & reinstall
pnpm clean && pnpm install

# 2. Execute full validation
pnpm build && pnpm typecheck && pnpm lint && pnpm test

# 3. Publish to npm registry (dry run)
pnpm -r publish --access public --dry-run

# 4. Live publish (via CI release workflow)
pnpm -r publish --access public --no-git-checks
```
