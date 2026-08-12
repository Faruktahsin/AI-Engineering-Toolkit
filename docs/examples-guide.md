# AIET Reference Examples Guide

These runnable, minimal console examples exercise selected AIET SDK and adapter APIs. They are reference implementations for developers—not production services, complete framework integrations, or security/compliance certifications.

---

## 1. Overview of Reference Examples

| Example Application | Path | Ecosystem / Adapter | Core Capabilities Demonstrated |
| :--- | :--- | :--- | :--- |
| **AI Coding Assistant** | [`examples/coding-agent/`](../examples/coding-agent) | `@aiet/core` | Directive/assertion storage, retrieval, and context compilation |
| **Research Agent** | [`examples/research-agent/`](../examples/research-agent) | `@aiet/adapter-langgraph`, `@aiet/consolidation` | Finding storage, checkpointer invocation, and rule-based contradiction detection |
| **Customer Support Agent** | [`examples/customer-support-agent/`](../examples/customer-support-agent) | `@aiet/adapter-vercel`, `@aiet/governance` | Restricted customer/event storage, memory-provider retrieval, and proposal creation |
| **Personal Assistant** | [`examples/personal-assistant/`](../examples/personal-assistant) | `@aiet/adapter-openai-agents` | Tool construction, preference/task storage, and retrieval-score explanation |

---

## 2. Decision Guide: Which Demo to Choose?

### Choose `coding-agent/` if you are:
- Building an AI coding assistant, IDE plugin, or terminal tool.
- Exploring context artifacts that can be used with Claude Code, Cursor, or Windsurf.
- Compiling token-budgeted system prompts (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`).

### Choose `research-agent/` if you are:
- Prototyping a research or analytical agent.
- Using **LangGraph** for multi-step agent orchestration.
- Needing to detect contradictory research findings over time.
- Exploring the checkpointer API with local AIET storage.

### Choose `customer-support-agent/` if you are:
- Building enterprise CRM, helpdesk, or customer support AI agents.
- Exploring the AIET Vercel adapter's memory-provider API.
- Handling customer entities, support history, and confidential facts.
- Exploring creation of governance proposals for review in an application you build.

### Choose `personal-assistant/` if you are:
- Building general-purpose productivity or personal assistant agents.
- Exploring construction of OpenAI Agents SDK-compatible tools.
- Inspecting the retrieval score explanation returned by the demo.

---

## 3. Comprehensive Feature & Integration Matrix

| AIET Package / Feature | `coding-agent` | `research-agent` | `customer-support-agent` | `personal-assistant` |
| :--- | :---: | :---: | :---: | :---: |
| **`@aiet/core` (SDK)** | ✅ | ✅ | ✅ | ✅ |
| **`@aiet/schema` (Primitives)** | ✅ | ✅ | ✅ | ✅ |
| **`@aiet/compiler` (Context Compilation)** | ✅ | ✅ | — | ✅ |
| **`@aiet/mcp-server` (MCP Server)** | ✅ | — | — | — |
| **`@aiet/adapter-langgraph`** | — | ✅ | — | — |
| **`@aiet/adapter-vercel`** | — | — | ✅ | — |
| **`@aiet/adapter-openai-agents`** | — | — | — | ✅ |
| **`@aiet/consolidation`** | — | ✅ | — | — |
| **`@aiet/governance`** | — | ✅ | ✅ | — |

---

## 4. Running and Testing Examples

From the repository root directory:

```bash
# 1. Install dependencies
corepack pnpm install

# 2. Build all example packages
corepack pnpm build

# 3. Run individual demos
corepack pnpm --filter @aiet/example-coding-agent start
corepack pnpm --filter @aiet/example-research-agent start
corepack pnpm --filter @aiet/example-customer-support-agent start
corepack pnpm --filter @aiet/example-personal-assistant start

# 4. Run integration tests for all examples
corepack pnpm test
```
