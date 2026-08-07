# AI Engineering Toolkit: 5-Phase Master Roadmap

This roadmap outlines the long-term execution plan for the **AI Engineering Toolkit (AIET)** and its flagship subsystem **PAKB**.

---

## Phase 1: Foundation & Infrastructure (Completed / Active)
- [x] Standardize repository identity to **AI Engineering Toolkit** with **PAKB** as Subsystem 01.
- [x] Establish `.github/` workflows for CI, CodeQL SAST, and automated releases.
- [x] Configure `.devcontainer/` and Husky pre-commit hooks (`check-zero-width.mjs`, `secret-scan.mjs`).
- [x] Introduce Turborepo (`turbo.json`) and pnpm workspace orchestration.
- [x] Publish constitutional architecture specifications (`AIET-STD-1.0`, `ARCHITECTURE.md`, `VISION.md`).

---

## Phase 2: PAKB Subsystem Consolidation & Dual SDK Parity
- [ ] Refactor `@aiet/pakb` TypeScript SDK and `aiet-python` PyPI package.
- [ ] Complete SQLite WAL / FTS5 storage engine and 5-primitive schema (`Entity`, `Directive`, `Assertion`, `Event`, `Relation`).
- [ ] Implement 7-stage deterministic context compiler with `cl100k_base` token budgeting.
- [ ] Enforce dual CJS/ESM bundling and full type safety across TS and Python.

---

## Phase 3: AI Engineering Content, Cookbooks & Eval Suite
- [ ] Develop `@aiet/eval` benchmark harness for context compression and recall accuracy.
- [ ] Expand `/prompts` into a versioned prompt engineering library with Promptfoo test runners.
- [ ] Author 4 production cookbooks (`01-context-compilation`, `02-agent-memory`, `03-eval-pipelines`).
- [ ] Launch `/learning` paths and `/interview` prep guide for AI engineering roles.

---

## Phase 4: Production Workflows, Python Package & MCP Ecosystem
- [ ] Expand standalone MCP server app (`apps/mcp-server`) with stdio and SSE transports.
- [ ] Publish official PyPI package (`aiet-python`) with FastMCP bindings.
- [ ] Build verified production workflows for n8n, LangGraph, and CrewAI in `/workflows/`.
- [ ] Release production CLI binary (`pakb` / `aiet`) for terminal context inspection.

---

## Phase 5: World-Class Community, Docs Portal & Benchmarking
- [ ] Launch Mintlify/Starlight documentation portal in `apps/docs`.
- [ ] Build interactive WASM context compiler playground in browser.
- [ ] Publish automated live performance benchmarks to GitHub Pages.
- [ ] Launch community showcase and global university curriculum kit.
