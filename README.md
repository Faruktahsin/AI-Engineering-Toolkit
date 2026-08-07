# AI Engineering Toolkit (`AIET`)

> **Production-grade open-source product ecosystem and educational toolkit for AI Systems Engineering, Context Intelligence, and Local Agent Memory.**

[![CI](https://github.com/faruktahsin/AI-Engineering-Toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/faruktahsin/AI-Engineering-Toolkit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node: >=22.0.0](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-green.svg)](https://nodejs.org)
[![Python: >=3.11](https://img.shields.io/badge/Python-%3E%3D3.11-blue.svg)](https://python.org)
[![pnpm: >=9.0.0](https://img.shields.io/badge/pnpm-%3E%3D9.0.0-orange.svg)](https://pnpm.io)

---

## Architecture Overview

The **AI Engineering Toolkit** provides a complete ecosystem for building zero-leak, token-optimized, production-grade AI systems. 

```
+-----------------------------------------------------------------------------------+
|                            AI ENGINEERING TOOLKIT                                 |
|                             (Parent Repository)                                   |
+-----------------------------------------------------------------------------------+
                                          |
      +-------------------+---------------+---------------+-------------------+
      |                   |               |               |                   |
[Subsystem 01]      [Subsystem 02]  [Subsystem 03]  [Subsystem 04]      [Subsystem 05]
  PAKB Engine         Prompt Lab     Agent Harness    Eval Suite        Workflow Engine
 (Context/MCP)     (Engineering)  (Exec Runtimes)  (Benchmarking)      (n8n/LangGraph)
```

---

## Subsystems & Features

### 1. Subsystem 01: PAKB (Personal AI Knowledge Base) — *Flagship Module*
- **5 Fundamental Primitives**: `Entity`, `Directive`, `Assertion`, `Event`, and `Relation`.
- **Local SQLite Storage Engine**: WAL mode, JSON1 validation, FTS5 full-text search, and recursive CTE graph traversal in <3ms.
- **Deterministic Context Compiler**: 7-stage build pipeline, `cl100k_base` (tiktoken) profiling, zero-width Unicode decontamination, and reproducible build manifests.
- **Model Context Protocol (MCP) Server**: Exposes stdio and SSE tools to Claude Code, Cursor, Windsurf, and custom agent runtimes.

### 2. Cross-Platform SDK Parity
- **TypeScript / Node.js**: `@aiet/core`, `@aiet/pakb`, `@aiet/eval`, `@aiet/storage`, `@aiet/compiler`, `@aiet/cli`.
- **Python**: `aiet-python` (`uv pip install aiet-python`) with FastMCP bindings and `pytest` integration.

### 3. Prompt Engineering & Evaluation
- Versioned XML schemas and Promptfoo benchmark evaluation suites.

---

## Quickstart

### Node.js / TypeScript
```bash
# Install dependencies across the monorepo
pnpm install

# Run typecheck & linting
pnpm typecheck
pnpm lint

# Run unit and integration tests
pnpm test

# Build all packages via Turborepo
pnpm build
```

### Python
```bash
cd python
uv venv
source .venv/bin/activate
uv pip install -e ".[dev]"
pytest
```

---

## Documentation & Learning Resources

- [System Architecture](ARCHITECTURE.md)
- [Strategic Vision](VISION.md) & [Mission Statement](MISSION.md)
- [Development Guide](DEVELOPMENT.md)
- [AI Engineering Handbook](AI_ENGINEERING_GUIDE.md)
- [AI Engineering Interview Kit](INTERVIEW_GUIDE.md)
- [Awesome AI Engineering Resources](awesome/README.md)
- [Architecture Decisions (ADRs)](DECISIONS.md)

---

## License

[MIT](LICENSE)
