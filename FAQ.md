# Frequently Asked Questions (FAQ)

### What is the relationship between AI Engineering Toolkit and PAKB?
**AI Engineering Toolkit** is the parent open-source repository and product ecosystem. **PAKB (Personal AI Knowledge Base)** is Subsystem 01—the flagship context compiler, SQLite storage engine, and local MCP server.

### How does PAKB compare to Mem0, Zep, or naive RAG?
PAKB is 100% local-first, zero-leak, running on SQLite WAL mode without forced cloud dependencies or subscription APIs. It uses a 5-primitive knowledge graph (`Entity`, `Directive`, `Assertion`, `Event`, `Relation`) with recursive CTE queries for <3ms deterministic context retrieval.

### How do I connect PAKB to Claude Code or Cursor?
PAKB exposes a Model Context Protocol (MCP) server over stdio or SSE. Add `pakb-mcp` to your Claude Code or Cursor MCP configuration file.
