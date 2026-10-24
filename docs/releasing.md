# Release Preparation & Package Publishing Strategy

This document outlines the release process, versioning policy, and npm publishing workflow for the **AI Engineering Toolkit (`AIET`)** monorepo.

---

## 1. Versioning Strategy

AIET adheres to **Semantic Versioning 2.0.0 (`MAJOR.MINOR.PATCH`)**:

- **MAJOR (`x.0.0`)**: Incompatible API schema changes, removal of core primitives, or breaking changes to `@aiet/core` contracts.
- **MINOR (`1.x.0`)**: New backward-compatible primitives, framework adapters (LangChain, Vercel AI SDK), or CLI commands (`pakb compile --watch`).
- **PATCH (`1.0.x`)**: Backward-compatible bug fixes, performance optimizations, or schema validation updates.

All publishable packages in the monorepo maintain synchronized release versions; the current repository version is `1.0.2`.

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

All non-private `@aiet/*` workspace packages under `packages/` are published by the recursive release workflow. The package manifests and `docs/npm-publishing-strategy.md` define the current package matrix.

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

When a version tag matching `v*` is pushed:
1. GitHub Actions checks out the tagged commit.
2. Runs the full validation suite (`build`, `typecheck`, `lint`, `test`).
3. Publishes packages to npm with `--access public`.

```bash
# Manual CLI publishing (if required)
pnpm -r publish --access public --no-git-checks
```
