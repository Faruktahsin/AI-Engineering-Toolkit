# AI Engineering Toolkit (`AIET`)

> **Local-First, Deterministic, Persistent-Memory Infrastructure Framework for Autonomous AI Agents.**

[![CI](https://github.com/Faruktahsin/AI-Engineering-Toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/Faruktahsin/AI-Engineering-Toolkit/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@aiet/core.svg)](https://www.npmjs.com/package/@aiet/core)
[![Node: >=22.0.0](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-green.svg)](https://nodejs.org)
[![pnpm: >=11.20.0](https://img.shields.io/badge/pnpm-%3E%3D11.20.0-red.svg)](https://pnpm.io)

---

## 💡 What is AIET?

**AI-Engineering-Toolkit (`AIET`)** is a production-grade infrastructure framework designed for software engineers building stateful, persistent-memory AI agents.

AIET is **local-first by default; use of external embedding providers is explicit opt-in and may transmit data to that provider.**

AIET solves the challenges of unstructured prompt context, context overflows, memory fragmentation, and unvetted autonomous agent mutations by providing:

- **5 Standardized Memory Primitives**: (`Entity`, `Directive`, `Assertion`, `Event`, `Relation`) with strict Zod & JSON Schemas.
- **Autonomous Memory Formation**: Candidate extraction (`@aiet/extractor`) and scoring engine (`@aiet/decision-engine`) for `CREATE`, `UPDATE`, `MERGE`, and `IGNORE` decisions.
- **Mandatory Safety & Governance**: Proposal approval workflows (`memory_proposals`) and tamper-evident audit ledger (`audit_log`) using JCS SHA-256 hash chains.
- **Autonomous Memory Consolidation**: Duplicate & contradiction detection (`@aiet/consolidation`) to supersede outdated facts or resolve conflicting preferences.
- **Deterministic 7-Stage Context Compiler**: Fits context into strict token budgets with bit-for-bit reproducible build manifests (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`).
- **Hybrid RRF Retrieval Engine**: SQLite WAL database with FTS5 BM25 search, vector embeddings, recency decay, and RRF ranking.
- **Framework Adapters & MCP Integration**: Native adapters for Vercel AI SDK, LangGraph, OpenAI Agents SDK, and Model Context Protocol (MCP) for Claude Code, Cursor, and Windsurf.

---

## 🏛️ Architecture Overview

AIET is organized as a high-performance monorepo of 28 workspace projects (24 publishable workspace packages plus 4 official example applications):

```
                                  +------------------------------------+
                                  |             @aiet/core             |
                                  |    (Unified Primary SDK Facade)    |
                                  +------------------------------------+
                                                    |
         +-----------------+----------------+-------+--------+------------------+
         |                 |                |                |                  |
   @aiet/storage    @aiet/compiler   @aiet/governance  @aiet/consolidation  @aiet/mcp-server
  (SQLite & RRF)   (Context Engine)  (Audit Ledger)   (De-duplication)   (MCP Stdio Server)
         |                 |                |                |                  |
         +-----------------+----------------+----------------+------------------+
                                                    |
                                                @aiet/cli
                                       (Developer CLI: aiet)
```

For a detailed deep dive into the monorepo architecture, read the **[Architecture Overview](docs/architecture-overview.md)**.

---

## 📦 Package Ecosystem

| Package | Role | Description |
| :--- | :--- | :--- |
| [`@aiet/core`](packages/core) | **Primary SDK Facade** | Single entrypoint combining memory, compiler, governance, and diagnostics |
| [`@aiet/cli`](packages/cli) | **Developer CLI** | Production CLI command runner (`aiet init`, `aiet doctor`, `aiet connect`) |
| [`@aiet/mcp-server`](packages/mcp-server) | **MCP Stdio Server** | Model Context Protocol server for Claude Code, Cursor, and Windsurf |
| [`@aiet/adapter-vercel`](packages/adapter-vercel) | **Vercel AI SDK Adapter** | `AIETMemoryProvider` and context middleware for Vercel AI SDK |
| [`@aiet/adapter-langgraph`](packages/adapter-langgraph) | **LangGraph Adapter** | LangGraph checkpointer (`createAIETCheckpointer`) and memory saver |
| [`@aiet/adapter-openai-agents`](packages/adapter-openai-agents) | **OpenAI Agents Adapter** | Function-calling tools (`createAIETAgentTools`) for OpenAI Agents SDK |

---

## 🚀 Framework Integration Matrix & Official Examples

AIET provides official, production-quality example applications demonstrating how to build autonomous agents across major frameworks:

| Framework / Adapter | Example Application | Capabilities Demonstrated | Link |
| :--- | :--- | :--- | :--- |
| **Native SDK (`@aiet/core`)** | `examples/coding-agent` | Developer preferences, ADR decision assertions, context compiler, MCP | [View Demo](examples/coding-agent) |
| **LangGraph (`@aiet/adapter-langgraph`)** | `examples/research-agent` | State checkpointing (`createAIETCheckpointer`), contradiction detection, memory consolidation | [View Demo](examples/research-agent) |
| **Vercel AI SDK (`@aiet/adapter-vercel`)** | `examples/customer-support-agent` | `AIETMemoryProvider`, SSE memory event streaming, governance approval workflow | [View Demo](examples/customer-support-agent) |
| **OpenAI Agents SDK (`@aiet/adapter-openai-agents`)** | `examples/personal-assistant` | Function-calling tools (`createAIETAgentTools`), memory explainability | [View Demo](examples/personal-assistant) |

---

## 🛠️ Quickstart

### 1. Installation

```bash
# Install core SDK facade
npm install @aiet/core

# Install AIET CLI globally
npm install -g @aiet/cli
```

### 2. Initialize Workspace & Connect MCP

```bash
# Initialize AIET workspace
aiet init

# Check system diagnostics
aiet doctor

# Connect AIET MCP server to Claude Code or Cursor
aiet connect claude
aiet connect cursor
```

### 3. Usage in Node.js / TypeScript

```typescript
import { createAIET } from "@aiet/core";

// Initialize AIET client
const aiet = createAIET();

// Add persistent developer preference
await aiet.memory.add({
  schema_version: "1.0.0",
  id: "dir_01H...",
  statement: "Prefer TypeScript strict mode and pure functional helpers",
  domain: "coding_style",
});

// Perform Hybrid RRF memory search
const searchRes = await aiet.memory.search("coding style preferences", { limit: 5 });
console.log(searchRes.results);

// Compile deterministic context files
const compiled = await aiet.compiler.compile("AGENTS.md");
console.log(compiled.content);

// Inspect governance audit ledger
const auditLog = await aiet.governance.getAuditHistory();
console.log(auditLog);
```

---

## 📖 Documentation Suite

- **[Getting Started Guide](docs/getting-started.md)**: Onboarding guide for new AIET users.
- **[Developer Onboarding](docs/getting-started-developer.md)**: Technical guide for monorepo contributors.
- **[Architecture Overview](docs/architecture-overview.md)**: Core architectural concepts and package boundaries.
- **[Developer Examples Guide](docs/examples-guide.md)**: Guide for choosing and running AIET demo apps.
- **[npm Publishing Strategy](docs/npm-publishing-strategy.md)**: Package matrix and semantic versioning SLA.
- **[Releasing Guide](docs/releasing.md)**: Maintainer guide for releases.
- **[Contributing Guide](CONTRIBUTING.md)**: Developer setup, PR standards, and conventional commit rules.
- **[Security Policy](SECURITY.md)**: Local-first zero-egress policies and vulnerability reporting.
- **[Changelog](CHANGELOG.md)**: Detailed release history.

---

## 📄 License

AIET is open-source software licensed under the [Apache-2.0 License](LICENSE).
