# Getting Started with AI Engineering Toolkit (`AIET`)

> **Local-First Context Compilation, Agent Memory, and Model Context Protocol (MCP) Infrastructure for AI Applications.**

---

## 1. Installation

Install `@aiet/core` and `@aiet/cli` in your project or monorepo using `pnpm`, `npm`, or `yarn`:

```bash
# Install core SDK and compiler CLI
pnpm add @aiet/core @aiet/cli
```

Verify the CLI installation:

```bash
pnpm pakb --version
# Output: 1.0.0
```

---

## 2. Initialize Your First Project

Run `pakb init` to generate a standard PAKB configuration and directory structure:

```bash
pnpm pakb init
```

This creates the following file hierarchy:

```
my-ai-project/
├── pakb.config.json
└── primitives/
    ├── entities/
    │   └── system.json
    ├── directives/
    │   └── rules.json
    └── assertions/
        └── facts.json
```

### Generated `pakb.config.json`

```json
{
  "input": "./primitives",
  "output": "./dist",
  "targets": [
    "AGENTS.md",
    "CLAUDE.md",
    ".cursorrules",
    "manifest.json"
  ],
  "budget": 500,
  "strict_mode": true
}
```

---

## 3. Defining Primitives

PAKB uses 5 foundational primitives to build deterministic system context:

1. **Entity**: Named system objects (e.g. system, API, persona).
2. **Directive**: Explicit behavioral rules and safety constraints.
3. **Assertion**: Fact claims anchored to documentation or evidence.
4. **Event**: Temporal log records and milestones.
5. **Relation**: Explicit graph links between primitives.

### Example Entity (`primitives/entities/system.json`)

```json
{
  "schema_version": "1.0.0",
  "id": "ent_01J4X89K9Z1A2B3C4D5E6F7G8H",
  "created_at": "2026-08-08T00:00:00.000Z",
  "updated_at": "2026-08-08T00:00:00.000Z",
  "name": "Customer AI Assistant",
  "entity_type": "system",
  "status": "active",
  "sensitivity": "public",
  "activation": "always",
  "summary": "Customer service AI agent responsible for handling user inquiries."
}
```

### Example Directive (`primitives/directives/rules.json`)

```json
{
  "schema_version": "1.0.0",
  "id": "dir_01J4X89K9Z1A2B3C4D5E6F7G8I",
  "created_at": "2026-08-08T00:00:00.000Z",
  "updated_at": "2026-08-08T00:00:00.000Z",
  "title": "Zero Secret Exposure",
  "statement": "Never output API keys, passwords, or PII tokens in prompt responses.",
  "severity": "error",
  "cadence": "per_turn",
  "sensitivity": "public",
  "activation": "always"
}
```

---

## 4. Compilation Workflow

Compile your primitives into token-budgeted system preambles:

```bash
# One-shot build
pnpm pakb compile
```

### Live Watch Mode

For active development, run `compile --watch`. The compiler will watch `primitives/` and automatically re-render system preambles when primitives are added, edited, or removed:

```bash
pnpm pakb compile --watch
```

Output files written to `./dist/`:
- `AGENTS.md` (Standard multi-agent system prompt)
- `CLAUDE.md` (Claude Code instructions)
- `.cursorrules` (Cursor IDE rule prompt)
- `manifest.json` (Bit-for-bit reproducible build manifest & JCS SHA-256 fingerprint)

---

## 5. Model Context Protocol (MCP) Integration

Expose your local PAKB memory to IDE agents (Cursor, Windsurf, Claude Code) using `@aiet/mcp-server`.

### Programmatic MCP Server Setup

```typescript
import { PAKBStorageRepository, PAKBMCPServer, createDatabaseConnection } from "@aiet/core";

// 1. Initialize SQLite storage connection
const db = createDatabaseConnection({ filename: "./pakb.db" });
const storage = new PAKBStorageRepository(db);

// 2. Start MCP server
const mcpServer = new PAKBMCPServer(storage);
await mcpServer.startStdio();

console.log("PAKB MCP Server listening on stdio.");
```

### Connecting to Claude Code or Cursor

In your `.cursor/mcp.json` or `claude.json`:

```json
{
  "mcpServers": {
    "pakb-memory": {
      "command": "node",
      "args": ["./node_modules/@aiet/mcp-server/dist/bin.js"]
    }
  }
}
```

Available MCP Tools & Resources:
- `pakb_get_primitive({ id })`: Fetch primitive by Base32 ULID.
- `pakb_search({ query })`: FTS5 BM25 full-text search.
- `pakb_traverse_graph({ seed_id, max_depth })`: Multi-hop graph traversal (<3ms).
- `pakb_propose_memory({ ... })`: Agent proposes memory update for human review.
