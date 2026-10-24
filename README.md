# AI Engineering Toolkit (`AIET`)

> **Local-First, Deterministic, Persistent-Memory Infrastructure Framework for Autonomous AI Agents.**

[![CI](https://github.com/Faruktahsin/AI-Engineering-Toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/Faruktahsin/AI-Engineering-Toolkit/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@aiet/core.svg)](https://www.npmjs.com/package/@aiet/core)
[![Node: 22.x](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org)
[![pnpm: >=11.20.0](https://img.shields.io/badge/pnpm-%3E%3D11.20.0-red.svg)](https://pnpm.io)

---

## 💡 What is AIET?

**AI-Engineering-Toolkit (`AIET`)** is an open-source infrastructure framework for software engineers building stateful, persistent-memory AI agents.

AIET is **local-first by default; use of external embedding providers is explicit opt-in and may transmit data to that provider.**

AIET solves the challenges of unstructured prompt context, context overflows, memory fragmentation, and unvetted autonomous agent mutations by providing:

- **5 Standardized Memory Primitives**: (`Entity`, `Directive`, `Assertion`, `Event`, `Relation`) with strict Zod & JSON Schemas.
- **Memory Candidate Formation**: Candidate extraction (`@aiet/extractor`) and scoring components (`@aiet/decision-engine`) for `CREATE`, `UPDATE`, `MERGE`, and `IGNORE` decisions.
- **Safety & Governance Components**: Proposal approval workflows (`memory_proposals`) and a JCS SHA-256 hash-linked audit ledger (`audit_log`).
- **Rule-Based Memory Consolidation**: Duplicate detection and scope-aware contradiction rules (`@aiet/consolidation`) for supported structured patterns. The 36-case synthetic generalization challenge currently detects none of its 20 expected contradictions; this is not evidence of general natural-language recall.
- **Deterministic 8-Stage Context Compiler**: Ingests, sanitizes, validates, normalizes, filters, ranks, fits, and emits context artifacts within configured token budgets (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`).
- **Hybrid RRF Retrieval Infrastructure**: SQLite WAL database with FTS5 BM25 search, vector embeddings, recency decay, and RRF ranking.
- **Framework Adapters & MCP Integration**: Native adapters for Vercel AI SDK, LangGraph, OpenAI Agents SDK, and Model Context Protocol (MCP) for Claude Code, Cursor, and Windsurf.

---

## 🏛️ Architecture Overview

AIET is organized as a monorepo of 28 workspace projects (24 publishable workspace packages plus 4 runnable reference examples):

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
| [`@aiet/cli`](packages/compiler-cli) | **Developer CLI** | CLI command runner (`aiet init`, `aiet doctor`, `aiet connect`) |
| [`@aiet/mcp-server`](packages/mcp-server) | **MCP Stdio Server** | Model Context Protocol server for Claude Code, Cursor, and Windsurf |
| [`@aiet/adapter-vercel`](packages/adapter-vercel) | **Vercel AI SDK Adapter** | `AIETMemoryProvider` and context middleware for Vercel AI SDK |
| [`@aiet/adapter-langgraph`](packages/adapter-langgraph) | **LangGraph Adapter** | LangGraph checkpointer (`createAIETCheckpointer`) and memory saver |
| [`@aiet/adapter-openai-agents`](packages/adapter-openai-agents) | **OpenAI Agents Adapter** | Function-calling tools (`createAIETAgentTools`) for OpenAI Agents SDK |

---

## 🚀 Framework Integration Matrix & Reference Examples

AIET includes runnable reference examples that exercise selected SDK and adapter APIs. They are intentionally small console demonstrations, not production applications or hosted services.

| Framework / Adapter | Example Application | Capabilities Demonstrated | Link |
| :--- | :--- | :--- | :--- |
| **Native SDK (`@aiet/core`)** | `examples/coding-agent` | Directive/assertion storage, retrieval, and compiled context | [View Example](examples/coding-agent) |
| **LangGraph (`@aiet/adapter-langgraph`)** | `examples/research-agent` | Checkpointer API, finding storage, and rule-based contradiction detection | [View Example](examples/research-agent) |
| **Vercel AI SDK (`@aiet/adapter-vercel`)** | `examples/customer-support-agent` | Customer/event storage, memory-provider retrieval, and proposal creation | [View Example](examples/customer-support-agent) |
| **OpenAI Agents SDK (`@aiet/adapter-openai-agents`)** | `examples/personal-assistant` | Adapter tool construction, preference/task storage, and retrieval explanation | [View Example](examples/personal-assistant) |

---

## 🛠️ Quickstart

### 1. Installation

```bash
# Install core SDK facade
npm install @aiet/core

# Install AIET CLI globally
npm install -g @aiet/cli
```

### 2. Initialize Workspace

```bash
# Initialize AIET workspace (creates sample JSON source files)
aiet init

# Check system health and diagnostics
aiet doctor

# Compile context artifacts in dry-run mode
aiet compile --dry-run

# Preview memory ingestion from sample files
aiet memory import --dry-run

# Validate and ingest primitives into persistent memory
aiet memory import

# View runtime dashboard and storage status
aiet status

# Connect AIET MCP server to Claude Code or Cursor
aiet connect claude
aiet connect cursor
```

### 3. Usage in Node.js / TypeScript

```typescript
import {
  ActivationClass,
  EnforcementSeverity,
  SensitivityTier,
  VolatilityRating,
  createAIET,
  generateULID,
} from "@aiet/core";

const aiet = createAIET({ storage: ".aiet/memory.db", embeddings: "mock" });
const now = new Date().toISOString();

try {
  // Add a persistent developer preference
  const added = await aiet.memory.add({
    schema_version: "1.0.0",
    id: generateULID("directive"),
    created_at: now,
    updated_at: now,
    last_verified: now,
    sensitivity: SensitivityTier.PUBLIC,
    volatility: VolatilityRating.LOW,
    activation: ActivationClass.ALWAYS_ON,
    statement: "Prefer TypeScript strict mode and pure functional helpers",
    enforcement: EnforcementSeverity.SOFT,
    domain: "coding_style",
  });
  console.log(added.status);

  // Search memory and compile a budgeted context preamble
  const searchRes = await aiet.memory.search("coding style preferences", { limit: 5 });
  console.log(searchRes.results);

  const compiled = await aiet.compiler.compile({
    targetFormat: "AGENTS.md",
    tokenBudget: 500,
  });
  console.log(compiled.content);
} finally {
  await aiet.close();
}
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
- **[Security Policy](SECURITY.md)**: Local-first privacy model, optional remote-provider boundaries, and vulnerability reporting.
- **[Changelog](CHANGELOG.md)**: Detailed release history.

---

## 💖 Support AIET

If AIET is useful to you, consider sponsoring its open-source development through GitHub Sponsors.

[Become a sponsor](https://github.com/sponsors/Faruktahsin)

---

## 📄 License

AIET is open-source software licensed under the [Apache-2.0 License](LICENSE).
