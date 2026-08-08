# Phase 6.1 Implementation Plan — Developer Experience & Core SDK Ergonomics

> **AI Engineering Toolkit (AIET) Developer Ergonomics & Facade API Implementation Plan**  
> *Date: August 8, 2026*

---

## 1. Objectives

Phase 6.1 transforms the modular AIET monorepo into a unified, developer-friendly SDK while preserving all underlying architecture and 100% backward compatibility.

---

## 2. Implementation Steps

### Step 1: Create Implementation Plan Artifact (`docs/phase6-1-implementation-plan.md`)
- Document goals, package changes, API facade design, and verification plan.

### Step 2: Implement Unified Facade SDK in `@aiet/core`
- **File Structure**:
  - `packages/core/src/facade.ts`: Implements `createAIET()` factory function and `AIETClient` facade.
  - `packages/core/src/memory-client.ts`: Implements `MemoryClient` (`search`, `add`, `list`, `get`, `merge`, `consolidate`).
  - `packages/core/src/compiler-client.ts`: Implements `CompilerClient` (`compile`).
  - `packages/core/src/governance-client.ts`: Implements `GovernanceClient` (`getPendingProposals`, `approveProposal`, `rejectProposal`, `getAuditHistory`).
  - `packages/core/src/doctor-client.ts`: Implements `DoctorClient` (`diagnose()`, `formatReport()`).
  - `packages/core/src/index.ts`: Re-exports `createAIET`, facade clients, and all existing package symbols.

### Step 3: Implement Diagnostics Module (`DoctorClient`)
- Diagnostic checks:
  1. Node.js version ($\ge 18$)
  2. SQLite WAL support
  3. Database directory / file accessibility
  4. Embedding provider readiness (OpenAI / Ollama / Mock)
  5. MCP configuration checks (Claude / Cursor / Windsurf paths)
  6. Key environment variables (`OPENAI_API_KEY`, `OLLAMA_HOST`, `AIET_STORAGE_PATH`)
- Output: Clean human-readable terminal report with status indicators (`✓`, `⚠`, `✕`).

### Step 4: Package Documentation Refresh
- Update `README.md` files for key public packages:
  - `packages/core/README.md`
  - `packages/cli/README.md`
  - `packages/storage/README.md`
  - `packages/compiler/README.md`
  - `packages/mcp-server/README.md`
  - `packages/governance/README.md`
  - `packages/consolidation/README.md`

### Step 5: Developer Journey Guide (`docs/getting-started-developer.md`)
- Complete 7-step onboarding tutorial from package installation to compiled prompt preambles and MCP setup.

### Step 6: Integration Tests & Monorepo Validation
- Create `packages/core/tests/facade.test.ts` testing `createAIET()`, `MemoryClient`, `CompilerClient`, `GovernanceClient`, and `DoctorClient`.
- Run full validation pipeline:
  - `corepack pnpm build`
  - `corepack pnpm typecheck`
  - `corepack pnpm lint`
  - `corepack pnpm test`

### Step 7: Completion Report (`docs/phase6-1-completion-report.md`)
- Summarize changes, deliverables, API signatures, and test suite results.
