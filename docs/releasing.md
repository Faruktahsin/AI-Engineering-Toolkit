# Release Preparation & Package Publishing Strategy

This document outlines the release process, versioning policy, and npm publishing workflow for the **AI Engineering Toolkit (`AIET`)** monorepo.

---

## 1. Versioning Strategy

AIET adheres to **Semantic Versioning 2.0.0 (`MAJOR.MINOR.PATCH`)**:

- **MAJOR (`x.0.0`)**: Incompatible API schema changes, removal of core primitives, or breaking changes to `@aiet/core` contracts.
- **MINOR (`1.x.0`)**: New backward-compatible primitives, framework adapters (LangChain, Vercel AI SDK), or CLI commands (`pakb compile --watch`).
- **PATCH (`1.0.x`)**: Backward-compatible bug fixes, performance optimizations, or schema validation updates.

All packages in the monorepo maintain synchronized release versions (`1.0.0`) to prevent workspace resolution drift.

---

## 2. Conventional Commits & Automated Changelog

All commits merged to `main` must follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```text
feat(cli): add live watch mode compiler daemon
fix(storage): resolve __dirname reference error in ESM environments
docs(readme): update architecture diagram and data flow specification
```

Changelog updates are automatically generated during release runs using Conventional Commits tags (`feat`, `fix`, `BREAKING CHANGE`).

---

## 3. Package Publishing Workflow

AIET packages are published to the public npm registry under the `@aiet/` npm organization scope:

- `@aiet/core`
- `@aiet/cli`
- `@aiet/compiler`
- `@aiet/storage`
- `@aiet/schema`
- `@aiet/errors`
- `@aiet/config`
- `@aiet/mcp-server`
- `@aiet/contracts`
- `@aiet/utils`
- `@aiet/logging`
- `@aiet/testing`
- `@aiet/pakb`

### Pre-Release Verification Checklist

Before triggering an npm release, execute local validation:

```bash
# 1. Clean build all packages
corepack pnpm build

# 2. Verify static type safety
corepack pnpm typecheck

# 3. Verify linting & formatting
corepack pnpm lint

# 4. Run full Vitest suite
corepack pnpm test
```

### Automated Release Pipeline (GitHub Actions)

When a GitHub Release tag (e.g. `v1.0.0`) is published on GitHub:
1. GitHub Actions checks out tag `v1.0.0`.
2. Runs the full validation suite (`build`, `typecheck`, `lint`, `test`).
3. Publishes packages to npm with `--access public` and cryptographic OIDC build provenance (`--provenance`).

```bash
# Manual CLI publishing (if required)
pnpm -r publish --access public --no-git-checks
```
