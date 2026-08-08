# Phase 6.2 CLI Design — AI Engineering Toolkit (AIET)

> **Architectural & Command Design Specification for `@aiet/cli` (`aiet`)**  
> *Date: August 8, 2026*

---

## 1. Executive Summary

Phase 6.2 evolves the `@aiet/cli` tool from a basic context compiler into a production-grade developer command-line interface. The CLI surface provides a unified tool for:
- Project initialization & directory scaffolding (`aiet init`)
- Environment & storage health diagnostics (`aiet doctor`)
- System status reporting (`aiet status`)
- Agent MCP server auto-connection (`aiet connect claude|cursor|windsurf`)
- Context preamble compilation (`aiet compile`)
- Full memory lifecycle operations (`aiet memory list|search|inspect|approve|reject|explain`)

---

## 2. Command Architecture Matrix

```
aiet
├── init [directory]         # Bootstraps .aiet/ directory, config.json, memory.db, & primitives/
├── doctor                   # Runs 6 environment & DB health diagnostics
├── status                   # Visual dashboard of storage, WAL mode, memory count, & proposals
├── connect <agent>          # Configures MCP for 'claude', 'cursor', or 'windsurf'
├── compile                  # Compiles primitives into AGENTS.md / CLAUDE.md with token budgeting
│
└── memory                   # Memory management command group
    ├── list                 # Lists stored primitives with type/limit filtering
    ├── search <query>       # Executes FTS5 + Vector hybrid RRF memory search
    ├── inspect <id>         # Displays detailed primitive attributes & lifecycle metrics
    ├── approve <id>         # Approves a pending governance memory proposal
    ├── reject <id> [reason] # Rejects a pending governance memory proposal
    └── explain <id>         # Explains primitive origin, confidence score, & audit lineage
```

---

## 3. Command Specifications

### 3.1 `aiet init [directory]`
- **Purpose**: Initializes a new local AIET project structure.
- **Scaffold Layout**:
  ```
  [targetDir]/
  └── .aiet/
      ├── config.json       # AIET project configuration file
      ├── memory.db         # SQLite WAL local memory database
      ├── primitives/       # Raw JSON primitives directory
      │   ├── entities/
      │   ├── directives/
      │   └── assertions/
      └── outputs/          # Compiled preambles (AGENTS.md, CLAUDE.md)
  ```
- **Options**: `-f, --force` to overwrite existing configuration.

### 3.2 `aiet status`
- **Purpose**: Displays visual terminal status dashboard.
- **Output**:
  ```
  ==================================================
                 AIET System Status                 
  ==================================================
  ✓ Storage Connected:   ./.aiet/memory.db
  ✓ SQLite WAL Mode:     Enabled
  ✓ Active Primitives:   12 (3 entities, 5 directives, 4 assertions)
  ✓ Embedding Provider:  Mock (Local-first, 0 external API calls)
  ✓ Agent MCP Status:    Connected (Claude Code / Cursor)
  ⚠ Pending Proposals:   1 proposal requiring governance review
  ==================================================
  ```

### 3.3 `aiet connect <agent>`
- **Arguments**: `agent` = `claude` | `cursor` | `windsurf`
- **Behavior**:
  - `claude`: Injects AIET MCP server entry into `~/.claude/mcp-config.json`.
  - `cursor`: Injects AIET MCP server entry into `.cursor/mcp.json`.
  - `windsurf`: Injects AIET MCP server entry into `~/.codeium/windsurf/mcp_config.json`.
- **Safety**: Reads existing config, merges `aiet-memory` server definition without overwriting other MCP servers, and creates a `.bak` backup file.

### 3.4 `aiet memory` Subcommands
1. **`aiet memory list`**: Options `--limit <n>`, `--type <entity|directive|assertion>`.
2. **`aiet memory search <query>`**: Options `--limit <n>`, `--alpha <float>`. Executes hybrid RRF retrieval via `@aiet/core` SDK.
3. **`aiet memory inspect <id>`**: Displays primitive details, sensitivity, volatility, and access count.
4. **`aiet memory approve <id>`**: Calls `aiet.governance.approveProposal(id)`.
5. **`aiet memory reject <id> [reason]`**: Calls `aiet.governance.rejectProposal(id, reason)`.
6. **`aiet memory explain <id>`**: Displays creation rationale, confidence score, decision rules applied, and audit history ledger.

---

## 4. UX & Terminal Ergonomics

- **Color Coding**: ANSI green (`✓`) for success, yellow (`⚠`) for warnings, red (`✕`) for errors, cyan for headers and IDs.
- **Error Handling**: Graceful error catching with actionable recovery suggestions.
- **Dependencies**: Uses lightweight built-ins (`node:fs`, `node:path`, `node:process`) and `commander`.

---

## 5. Verification Plan

1. **Unit & CLI Command Tests** in `packages/compiler-cli/tests/cli-commands.test.ts`.
2. **Full Monorepo Build & Validation**:
   - `corepack pnpm build`
   - `corepack pnpm typecheck`
   - `corepack pnpm lint`
   - `corepack pnpm test`
