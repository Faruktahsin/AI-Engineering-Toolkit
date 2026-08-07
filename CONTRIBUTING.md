# Contributing to Personal AI Knowledge Base (PAKB)

Thank you for your interest in contributing to PAKB!

## Architectural Governance & Frozen Specifications

PAKB is built upon **frozen architecture specifications**. The following core specifications are frozen and MUST NOT be modified without a formal Architecture Decision Record (ADR) version upgrade:

- PAKB Domain Model v1.0
- PAKB Architecture Decision Records v1.0
- PAKB JSON Schema v1.0
- PAKB Storage Semantics v1.0
- PAKB SQLite Storage Architecture v1.0
- PAKB MCP Server Architecture v1.0
- PAKB Compiler Architecture v1.0
- PAKB API Contracts v1.0

## Monorepo Setup

```bash
# Clone repository
git clone https://github.com/faruktahsinarik/AI-Engineering-Toolkit.git
cd AI-Engineering-Toolkit

# Install dependencies with pnpm
pnpm install

# Run typecheck across all packages
pnpm typecheck

# Run Biome linter and formatter
pnpm lint
pnpm format

# Execute full Vitest test suite
pnpm test

# Build all workspace packages
pnpm build
```

## Pull Request Guidelines

1. **No Breaking Changes**: PRs must maintain 100% backward compatibility with API Contracts v1.0.
2. **Zero-Width Character & Secret Scanning**: All commits must pass `pnpm check:zero-width` and `pnpm check:secrets`.
3. **Strict Type Safety**: TypeScript typecheck (`pnpm typecheck`) must pass with zero errors.
4. **Deterministic Tests**: All new features or bug fixes must include Vitest tests with deterministic inputs.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
