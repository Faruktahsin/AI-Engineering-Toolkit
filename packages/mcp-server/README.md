# `@aiet/mcp-server`

Local-first Model Context Protocol (MCP) server exposing Personal AI Knowledge Base (PAKB) resources and tools to AI agents per ADR-001 through ADR-005.

## Installation

```bash
pnpm add @aiet/mcp-server
```

## Usage

```typescript
import { PAKBStorageRepository } from "@aiet/storage";
import { PAKBMCPServer } from "@aiet/mcp-server";

const storage = new PAKBStorageRepository({ db_path: "path/to/pakb.db" });
const mcpServer = new PAKBMCPServer(storage);

// Start stdio transport for local agents
await mcpServer.startStdio();
```

## Resources

- `pakb://preamble/tier0`: Compiled Tier 0 Preamble (≤500 tokens).
- `pakb://entities/{id}`: Direct Entity resource.
- `pakb://graph/neighborhood/{id}`: Subgraph neighborhood (depth ≤ 3).
- `pakb://timeline/recent`: Recent event timeline.

## Tools

- `pakb_get_primitive`: Fetch single primitive by Base32 ULID.
- `pakb_search`: FTS5 full-text search with BM25 ranking.
- `pakb_traverse_graph`: Multi-hop recursive graph traversal (depth ≤ 3).
- `pakb_get_timeline`: Chronological event and milestone retrieval.
- `pakb_propose_memory`: Stage memory proposals ("Agent Proposes, Human Commits").
- `pakb_compile_preamble`: Tier 0 preamble compiler & token profiler (`cl100k_base`).

## License

[MIT](../../LICENSE)
