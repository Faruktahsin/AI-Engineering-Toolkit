# AIET Official Examples Guide

Welcome to the AI-Engineering-Toolkit (AIET) Official Examples Guide. This document helps developers select the right demo application based on their framework ecosystem, agent archetype, and required memory capabilities.

---

## 1. Overview of Official Demo Applications

| Example Application | Path | Ecosystem / Adapter | Core Capabilities Demonstrated |
| :--- | :--- | :--- | :--- |
| **AI Coding Assistant** | [`examples/coding-agent/`](file:///Users/faruktahsinarik/Documents/AI-Engineering-Toolkit/examples/coding-agent) | `@aiet/core`, `@aiet/mcp-server`, CLI | Developer preference enforcement, architecture decisions, `CLAUDE.md` / `AGENTS.md` compilation |
| **Research Agent** | [`examples/research-agent/`](file:///Users/faruktahsinarik/Documents/AI-Engineering-Toolkit/examples/research-agent) | `@aiet/adapter-langgraph`, `@aiet/consolidation` | Multi-session research memory, source tracking, contradiction detection, graph checkpoints |
| **Customer Support Agent** | [`examples/customer-support-agent/`](file:///Users/faruktahsinarik/Documents/AI-Engineering-Toolkit/examples/customer-support-agent) | `@aiet/adapter-vercel`, `@aiet/governance` | Customer entities, support history, policy exemptions, governance approval workflows |
| **Personal Assistant** | [`examples/personal-assistant/`](file:///Users/faruktahsinarik/Documents/AI-Engineering-Toolkit/examples/personal-assistant) | `@aiet/adapter-openai-agents` | OpenAI function calling tools, user tasks, preferences, memory explainability |

---

## 2. Decision Guide: Which Demo to Choose?

### Choose `coding-agent/` if you are:
- Building an AI coding assistant, IDE plugin, or terminal tool.
- Integrating with Claude Code, Cursor, or Windsurf over MCP.
- Compiling token-budgeted system prompts (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`).

### Choose `research-agent/` if you are:
- Building an autonomous web researcher or analytical agent.
- Using **LangGraph** for multi-step agent orchestration.
- Needing to detect contradictory research findings over time.
- Requiring state checkpointers that persist graph state into governed memory tables.

### Choose `customer-support-agent/` if you are:
- Building enterprise CRM, helpdesk, or customer support AI agents.
- Using the **Vercel AI SDK** (`useChat`, `streamText`).
- Handling customer entities, support history, and confidential facts.
- Needing **Governance Approval Workflows** to trap risky or sensitive memory updates for human review before persisting.

### Choose `personal-assistant/` if you are:
- Building general-purpose productivity or personal assistant agents.
- Using **OpenAI Agents SDK** or function-calling models.
- Needing **Memory Explainability** to answer "Why did the agent make this decision?".

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
