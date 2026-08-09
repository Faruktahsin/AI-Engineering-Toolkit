# AIET v1.0.0 GitHub Release Checklist

This document serves as the pre-release checklist for maintainers releasing **AIET v1.0.0** on GitHub and npm.

---

## 1. Repository Cleanliness & Verification

- [x] All 28 workspace projects (24 packages and 4 official example apps) build cleanly (`pnpm build`).
- [x] TypeScript typecheck passes across monorepo (`pnpm typecheck`).
- [x] Biome linter & formatting check passes (`pnpm lint`).
- [x] Full automated test suite passes (`pnpm test` — all tests passing).
- [x] No temporary files, SQLite database dumps (`*.sqlite`, `*.db`), or log artifacts committed.

---

## 2. Community & License Files

- [x] `LICENSE` (Apache-2.0) present at repository root.
- [x] `CONTRIBUTING.md` provides developer setup, PR guidelines, and conventional commit rules.
- [x] `SECURITY.md` defines zero-egress policies and private vulnerability reporting.
- [x] `CODE_OF_CONDUCT.md` provides contributor standards and enforcement procedures.

---

## 3. Package & Monorepo Configuration

- [x] Root `package.json` specifies pnpm workspace configuration and scripts.
- [x] All public packages specify `@aiet/*` scope, `publishConfig: { "access": "public" }`, and `1.0.0` version.
- [x] Example apps (`examples/*`) marked `"private": true`.
- [x] Exports, typings (`dist/index.d.ts`), ESM, and CJS modules correctly declared.

---

## 4. Documentation & Release Notes

- [x] Root `README.md` updated with badges, architecture overview, feature comparison, quickstart guide, CLI commands, and demo links.
- [x] `CHANGELOG.md` documents release history.
- [x] `RELEASE_NOTES_v0.1.0.md` preserved as initial release milestone.
- [x] `docs/examples-guide.md` details usage of all 4 official example apps.
- [x] `docs/npm-publishing-strategy.md` documents publishing matrix and versioning SLA.

---

## 5. Automated CI/CD Pipelines

- [x] `.github/workflows/ci.yml` validates pull requests across Node.js 22.
- [x] `.github/workflows/release.yml` automates tag releases and npm publishing.

---

## 6. Pre-Publish Validation Sequence

```bash
# Maintainer final execution steps:
git checkout main
git pull origin main
pnpm clean && pnpm install
pnpm build && pnpm typecheck && pnpm lint && pnpm test
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```
