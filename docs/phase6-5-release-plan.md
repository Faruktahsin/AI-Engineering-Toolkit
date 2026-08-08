# Phase 6.5: AIET v0.1 Public Release Preparation Plan

## Executive Overview
Phase 6.5 transforms the **AI Engineering Toolkit (AIET)** monorepo into a production-grade, open-source repository ready for its **v0.1.0-alpha** public release.

This plan details release auditing, npm publishing strategy, repository polish, GitHub release automation, security verification, developer onboarding validation, and release documentation.

---

## Workstreams & Deliverables

### 1. Release Architecture & Audit (`docs/phase6-5-release-plan.md`)
- Audit repository root and package metadata across all 28 workspace projects.
- Ensure consistent license declarations, repository links, author metadata, and package descriptions.

### 2. Package Publishing Strategy (`docs/npm-publishing-strategy.md`)
- Document npm package matrix (`@aiet/core`, `@aiet/cli`, `@aiet/mcp-server`, `@aiet/adapter-*`, `@aiet/compiler`, etc.).
- Configure `publishConfig: { "access": "public" }` for published libraries and `private: true` for example apps and internal tools.
- Versioning specification for `v0.1.0-alpha`.

### 3. Open Source Governance & Community Standard Files
- **`LICENSE`**: Apache-2.0 open-source license text.
- **`CONTRIBUTING.md`**: Guide for external contributors, monorepo workflow, building, testing, and conventional commit standards.
- **`SECURITY.md`**: Security vulnerability disclosure policy, privacy boundaries, and local-first memory isolation principles.
- **`CODE_OF_CONDUCT.md`**: Contributor Covenant Code of Conduct.

### 4. GitHub Repository Polish & Release Checklist
- Polish root **`README.md`** with badges, visual architecture breakdown, feature matrix, quickstart guide, CLI reference, and demo links.
- Create **`docs/github-release-checklist.md`** for release maintainers.

### 5. Release Automation & GitHub Actions Workflows
- **`.github/workflows/ci.yml`**: Continuous Integration (Build, Typecheck, Lint, Test across Node.js 18 & 20).
- **`.github/workflows/release.yml`**: Automated tag release, release notes generation, and npm publishing pipeline.

### 6. Security Audit & Credential Hygiene
- Verify `.gitignore` excludes database files (`*.sqlite`, `*.db`), local logs, temporary artifacts, and credential secrets.
- Provide `.env.example` templates across examples and packages.

### 7. Release Documentation Artifacts
- **`CHANGELOG.md`**: Chronological release history.
- **`RELEASE_NOTES_v0.1.0.md`**: Feature highlights, architectural principles, installation guide, and API overview.
- **`docs/v0-1-release-checklist.md`**: Final pre-flight verification checklist.

### 8. Verification & Completion Report
- Validate `pnpm build`, `pnpm typecheck`, `pnpm lint`, and `pnpm test`.
- Create **`docs/phase6-5-completion-report.md`**.

---

## Execution Schedule
1. Step 1: Create `docs/phase6-5-release-plan.md` (Complete).
2. Step 2: Implement publishing strategy `docs/npm-publishing-strategy.md`.
3. Step 3: Create OSS community files (`LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`).
4. Step 4: Polish root `README.md` & `docs/github-release-checklist.md`.
5. Step 5: Configure `.github/workflows/ci.yml` and `.github/workflows/release.yml`.
6. Step 6: Create release artifacts (`CHANGELOG.md`, `RELEASE_NOTES_v0.1.0.md`, `docs/v0-1-release-checklist.md`).
7. Step 7: Monorepo build, lint, typecheck, and test execution.
8. Step 8: Create `docs/phase6-5-completion-report.md`.
