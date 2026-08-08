# AI Engineering Toolkit (AIET) v0.1.0-alpha Release Notes

We are thrilled to announce the initial public release of **AI Engineering Toolkit (AIET) v0.1.0-alpha**!

AIET is a local-first, deterministic, persistent-memory infrastructure platform designed to give AI agents persistent memory, autonomous knowledge formation, context compilation, safety governance, and framework integrations across modern AI agent ecosystems.

---

## Highlights

### ⚡ Unified Developer Ergonomics (`@aiet/core`)
Interact with the entire toolkit via a single entry point:
```typescript
import { createAIET } from "@aiet/core";

const aiet = createAIET();
await aiet.memory.add({
  schema_version: "1.0.0",
  id: "dir_01H...",
  statement: "Prefer TypeScript over JavaScript",
  domain: "coding_style",
});
```

### 🧠 Autonomous Memory Formation & Consolidation
- **Decision Engine (`@aiet/decision-engine`)**: Evaluates memory candidates using multi-dimensional scoring (importance, confidence, novelty, future usefulness, sensitivity) and outputs `CREATE`, `UPDATE`, `MERGE`, or `IGNORE` decisions.
- **Consolidation (`@aiet/consolidation`)**: Detects duplicate primitives and conflicting assertions (e.g. preference changes, outdated facts) and updates memory lineage automatically.

### 🛡️ Mandatory Governance & Audit Ledger (`@aiet/governance`)
- Safety control layer between autonomous decision engines and database persistence.
- Requires memory proposals (`memory_proposals`) for sensitive operations.
- Maintains a tamper-evident audit log ledger (`audit_log`) with JCS SHA-256 hash chains.

### 📄 Deterministic Context Compiler (`@aiet/compiler`)
- Compiles persistent memory primitives into `AGENTS.md`, `CLAUDE.md`, and `.cursorrules`.
- Enforces strict token budgeting, priority ranking, and produces **bit-for-bit reproducible build artifacts**.

### 🔌 Framework Integrations & Adapters
- **Model Context Protocol (`@aiet/mcp-server`)**: Instant MCP memory integration for Claude Code, Cursor, and Windsurf.
- **Vercel AI SDK (`@aiet/adapter-vercel`)**: `AIETMemoryProvider` and SSE memory match event streaming.
- **LangGraph (`@aiet/adapter-langgraph`)**: Persistent state checkpointer (`createAIETCheckpointer`).
- **OpenAI Agents SDK (`@aiet/adapter-openai-agents`)**: Function-calling agent tools (`createAIETAgentTools`).

---

## Official Demo Applications (`examples/`)

1. `examples/coding-agent`: Coding assistant with persistent developer memory & context compilation.
2. `examples/research-agent`: Research agent with knowledge consolidation & state checkpointing.
3. `examples/customer-support-agent`: Enterprise customer support agent with governance & streaming memory.
4. `examples/personal-assistant`: General AI personal assistant with agent tooling & memory explainability.

---

## Quickstart

```bash
# Install AIET CLI
npm install -g @aiet/cli

# Initialize AIET workspace
aiet init

# Connect to your favorite AI agent
aiet connect claude

# Run system diagnostics
aiet doctor
```

---

## License

AIET is open-source software licensed under the [Apache-2.0 License](LICENSE).
