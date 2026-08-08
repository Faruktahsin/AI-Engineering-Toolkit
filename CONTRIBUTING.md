# Contributing to AI Engineering Toolkit (AIET)

Thank you for your interest in contributing to the **AI Engineering Toolkit (AIET)**!

AIET is a local-first, deterministic, persistent-memory infrastructure framework for AI agents.

---

## Code of Conduct

All contributors are expected to follow our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before participating in discussions or submitting pull requests.

---

## Development Setup

### Prerequisites
- **Node.js**: v18.x or v20.x+
- **pnpm**: v9.x (`corepack enable pnpm`)
- **Git**

### Clone & Install

```bash
# 1. Clone the repository
git clone https://github.com/ai-engineering-toolkit/aiet.git
cd aiet

# 2. Install dependencies
pnpm install

# 3. Build all workspace packages
pnpm build

# 4. Run typecheck & linter
pnpm typecheck
pnpm lint

# 5. Run full test suite
pnpm test
```

---

## Monorepo Architecture

AIET is structured as a pnpm monorepo:
- **`packages/core`**: Unified SDK client (`createAIET`).
- **`packages/cli`**: Production developer CLI (`aiet`).
- **`packages/mcp-server`**: MCP integration server.
- **`packages/storage`**: SQLite WAL memory engine.
- **`packages/compiler`**: Deterministic context compiler.
- **`packages/governance`**: Proposal approval engine & audit log.
- **`packages/consolidation`**: Duplicate & contradiction detection.
- **`packages/adapter-*`**: Framework adapters (Vercel AI SDK, LangGraph, OpenAI Agents).
- **`examples/`**: Official runnable demo applications.

---

## Pull Request Guidelines

1. **Branch Naming**: Use descriptive branch names: `feature/name`, `fix/issue-description`, `docs/update`.
2. **Conventional Commits**: Format commit messages according to Conventional Commits:
   - `feat(core): add memory explainability provider`
   - `fix(storage): correct FTS query phrase escaping`
   - `docs(readme): add quickstart guide`
3. **Tests Required**: Every new feature or fix must include unit or integration tests in `tests/`.
4. **Validation Checklist**:
   Before submitting a PR, ensure all checks pass:
   ```bash
   pnpm biome check --write .
   pnpm build
   pnpm typecheck
   pnpm lint
   pnpm test
   ```

---

## Reporting Issues

If you encounter bugs, security issues, or have feature requests, please submit an issue on GitHub:
- Bug Reports: Include Node version, OS, reproduction steps, and full error logs.
- Security Issues: See [SECURITY.md](SECURITY.md) for private disclosure instructions.
