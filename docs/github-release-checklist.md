# AIET v0.1.0-alpha GitHub Release Checklist

This document serves as the pre-release checklist for maintainers releasing **AIET v0.1.0-alpha** on GitHub and npm.

---

## 1. Repository Cleanliness & Verification

- [x] All 28 workspace packages and examples build cleanly (`pnpm build`).
- [x] TypeScript typecheck passes across monorepo (`pnpm typecheck`).
- [x] Biome linter & formatting check passes (`pnpm lint`).
- [x] Full automated test suite passes (`pnpm test` — 163 tests passing).
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
- [x] All public packages specify `@aiet/*` scope, `publishConfig: { "access": "public" }`, and `0.1.0-alpha` version.
- [x] Example apps (`examples/*`) marked `"private": true`.
- [x] Exports, typings (`dist/index.d.ts`), ESM, and CJS modules correctly declared.

---

## 4. Documentation & Release Notes

- [x] Root `README.md` updated with badges, architecture overview, feature comparison, quickstart guide, CLI commands, and demo links.
- [x] `CHANGELOG.md` documents initial `v0.1.0-alpha` release highlights.
- [x] `RELEASE_NOTES_v0.1.0.md` detailed release notes prepared.
- [x] `docs/examples-guide.md` details usage of all 4 official example apps.
- [x] `docs/npm-publishing-strategy.md` documents publishing matrix and versioning SLA.

---

## 5. Automated CI/CD Pipelines

- [x] `.github/workflows/ci.yml` validates pull requests across Node.js 18 and 20.
- [x] `.github/workflows/release.yml` automates tag releases and npm publishing.

---

## 6. Pre-Publish Validation Sequence

```bash
# Maintainer final execution steps:
git checkout main
git pull origin main
pnpm clean && pnpm install
pnpm build && pnpm typecheck && pnpm lint && pnpm test
git tag -a v0.1.0-alpha -m "Release v0.1.0-alpha"
git push origin v0.1.0-alpha
```
