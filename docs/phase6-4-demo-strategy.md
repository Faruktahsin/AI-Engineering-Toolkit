# AIET Phase 6.4: Official Demo Applications Strategy

> **Historical planning artifact.** This document records the intended Phase 6.4 scope; it is not a statement that the current examples are production applications. For current scope, see the root README and `docs/examples-guide.md`.

## 1. Executive Strategy & Objectives

The goal of Phase 6.4 is to transform the AI-Engineering-Toolkit (AIET) from a high-performance infrastructure framework into a turnkey developer-ready platform by providing official, production-quality example applications under `examples/`.

AIET is fundamentally **infrastructure** for AI agents. AIET is **not** Personal AI PAKB (which is an application built on top of AIET). The demo applications in `examples/` demonstrate how developers in various domains can build persistent, self-learning, governed AI agents using AIET.

---

## 2. Official Demo Applications Blueprint

### Demo 1: `coding-agent/` (Developer Assistant)
- **Target Persona**: Software engineers & AI coding tool builders.
- **Core Purpose**: Demonstrate persistent developer memory, project architecture facts, coding preference enforcement, and deterministic context compilation (`AGENTS.md`, `CLAUDE.md`).
- **AIET Tech Stack**: `@aiet/core`, `@aiet/compiler-cli` (CLI context compiler), `@aiet/mcp-server`.
- **Key Workflow**:
  1. User states: "Use functional programming style with strict TypeScript types."
  2. Agent persists preference as a Directive primitive via `@aiet/core`.
  3. Context compiler builds updated `AGENTS.md` / `CLAUDE.md`.
  4. Subsequent prompt "Implement authentication" automatically receives the functional programming directive in its budget-fitted context window.

### Demo 2: `research-agent/` (Multi-Session Research System)
- **Target Persona**: Knowledge workers, researchers, and analytical agent developers.
- **Core Purpose**: Demonstrate long-running, multi-session memory, document facts, research event timelines, source attribution tracking, contradiction detection, and memory consolidation.
- **AIET Tech Stack**: `@aiet/adapter-langgraph`, `@aiet/consolidation`, `@aiet/core`.
- **Key Workflow**:
  1. Agent gathers research facts over multiple graph execution cycles.
  2. Checkpoints state as governed Event primitives via `@aiet/adapter-langgraph`.
  3. Automatically detects contradictory assertions (e.g., outdated paper metrics vs. new findings) and triggers consolidation workflows.

### Demo 3: `customer-support-agent/` (Enterprise Support & CRM Agent)
- **Target Persona**: Enterprise AI developers, customer success engineers.
- **Core Purpose**: Demonstrate customer entity management, interaction history, policy enforcement, and governance approval workflows for memory mutations.
- **AIET Tech Stack**: `@aiet/adapter-vercel`, `@aiet/governance`, `@aiet/core`.
- **Key Workflow**:
  1. Customer interacts with support agent powered by Vercel AI SDK.
  2. Agent proposes memory update (e.g., tier upgrade or refund request).
  3. Governance proposal system traps high-sensitivity memory mutations for user/human approval before persisting to storage.

### Demo 4: `personal-assistant/` (General AI Assistant Infrastructure)
- **Target Persona**: General AI agent builders, productivity app developers.
- **Core Purpose**: Demonstrate user preference tracking, recurring tasks, context compilation, and memory explainability (answering "Why did you remember this?").
- **AIET Tech Stack**: `@aiet/adapter-openai-agents`, `@aiet/core`.
- **Key Workflow**:
  1. User instructs function-calling OpenAI agent: "Remind me I prefer morning meetings."
  2. Agent calls `aiet_propose_memory` tool.
  3. When asked "Why did you schedule at 9 AM?", agent invokes memory explainability to trace back to the stored directive.

---

## 3. Integration Coverage Matrix

| Example Application | `@aiet/core` | CLI | MCP Server | OpenAI Adapter | LangGraph Adapter | Vercel AI SDK Adapter | Governance & Consolidation |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `coding-agent/` | ✅ | ✅ | ✅ | — | — | — | — |
| `research-agent/` | ✅ | — | — | — | ✅ | — | ✅ (Consolidation) |
| `customer-support-agent/` | ✅ | — | — | — | — | ✅ | ✅ (Governance) |
| `personal-assistant/` | ✅ | — | — | ✅ | — | — | — |

---

## 4. Standard Demo Structure & Requirements

Each demo under `examples/` must follow a standardized production layout:

```
examples/<demo-name>/
├── README.md              # Documentation, architecture diagram, setup, usage
├── package.json           # Dependencies and test scripts
├── tsconfig.json          # TypeScript configuration
├── src/
│   ├── index.ts           # Runnable demo entrypoint
│   └── agent.ts           # Agent logic using AIET integration
├── tests/
│   └── integration.test.ts # Integration test for the demo workflow
```

Each demo must be:
1. **Fully Build-able**: Standard `tsc` / `tsup` compile without errors.
2. **Runnable**: Executable via `pnpm demo` / `node dist/index.js` producing realistic output.
3. **Tested**: Verified via Vitest integration tests.

---

## 5. Implementation Sequence

1. Refactor/Implement `examples/coding-agent/`
2. Implement `examples/research-agent/`
3. Refactor/Implement `examples/customer-support-agent/`
4. Implement `examples/personal-assistant/`
5. Create comprehensive user guide `docs/examples-guide.md`
6. Run full verification suite (`pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`)
7. Produce `docs/phase6-4-completion-report.md`
