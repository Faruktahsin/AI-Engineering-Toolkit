# AI Engineering Toolkit (`AIET`): Architecture Overview

> **Technical Architecture Specification for Deterministic Context Compilation, Local Agent Memory, and Model Context Protocol (MCP) Infrastructure.**

---

## 1. High-Level Architecture Diagram

```
+---------------------------------------------------------------------------------------------------+
|                                        AI APPLICATION / IDE AGENT                                 |
|                               (Cursor / Claude Code / Custom LLM Runner)                           |
+---------------------------------------------------------------------------------------------------+
                                    |                                   |
                         (MCP Stdio / SSE Transport)              (Direct TS Import)
                                    v                                   v
+---------------------------------------------------------------------------------------------------+
|                                            @aiet/core                                             |
|                                   (Unified Public SDK Facade)                                     |
+---------------------------------------------------------------------------------------------------+
       |                                |                               |                      |
       v                                v                               v                      v
+------------------+         +--------------------+         +--------------------+   +-------------------+
|  @aiet/compiler  |         |   @aiet/storage    |         |   @aiet/mcp-server |   |    @aiet/schema   |
| (7-Stage Engine) |         | (SQLite WAL/FTS5)  |         | (MCP Tool Handlers)|   | (Ajv Validations) |
+------------------+         +--------------------+         +--------------------+   +-------------------+
       |                                |                               |                      |
       +--------------------------------+-------------------------------+----------------------+
                                                |
                                                v
                                         @aiet/errors
                                 (Unified Domain Exception Registry)
```

---

## 2. Package Responsibilities

| Package Path | Package Name | Responsibility |
| :--- | :--- | :--- |
| `packages/core` | `@aiet/core` | Primary public SDK facade re-exporting compiler, storage, schema, and MCP server primitives. |
| `packages/compiler-cli` | `@aiet/cli` | Production CLI binary (`pakb`) providing `init`, `compile`, and `--watch` live development workflows. |
| `packages/compiler` | `@aiet/compiler` | Deterministic 7-stage prompt context compilation engine with `cl100k_base` (tiktoken) budgeting. |
| `packages/storage` | `@aiet/storage` | SQLite WAL storage repository providing schema migrations, JCS hashes, FTS5 BM25 search, and recursive CTE graph traversal. |
| `packages/schema` | `@aiet/schema` | Ajv Draft 2020-12 JSON Schemas and TypeScript interface definitions for the 5 PAKB primitives. |
| `packages/errors` | `@aiet/errors` | Single source of truth for all domain and infrastructure exception classes. |
| `packages/mcp-server` | `@aiet/mcp-server` | Model Context Protocol stdio/SSE server exposing structured PAKB memory tools and resources. |
| `packages/domain` | `@aiet/domain` | ULID generation, zero-width string sanitization, and runtime Ajv validator factories. |
| `packages/config` | `@aiet/config` | Zod schema definition (`PAKBConfigSchema`) and validation logic for `pakb.config.json`. |
| `packages/contracts` | `@aiet/contracts` | Shared protocol interfaces and compile target constants (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`). |
| `packages/utils` | `@aiet/utils` | Deterministic JSON Canonicalization Scheme (JCS RFC 8785) hash computation utilities. |
| `packages/logging` | `@aiet/logging` | Zero-dependency structured log formatting and log level controls. |
| `packages/testing` | `@aiet/testing` | Shared test fixtures, mock memory repositories, and end-to-end integration test runners. |
| `packages/pakb` | `@aiet/pakb` | Backward-compatibility alias re-exporting `@aiet/core`. |

---

## 3. End-to-End Data Flow

The following sequence illustrates the lifecycle of a primitive from JSON declaration to prompt context consumption by an LLM agent:

```
[ Primitive JSON File ]
         |
         v (1. Load & Validate)
+------------------------------------+
|  @aiet/cli: loadInputPrimitives()  |
|  - Recursively finds JSON files    |
|  - Validates Ajv Draft 2020-12     |
+------------------------------------+
         |
         v (2. Persist & Index)
+------------------------------------+
|  @aiet/storage: insertPrimitive()  |
|  - Calculates JCS SHA-256 Hash     |
|  - Writes to SQLite WAL Tables     |
|  - Updates FTS5 BM25 Search Index  |
+------------------------------------+
         |
         +---------------------------------------+
         |                                       |
         v (3a. Context Compilation)             v (3b. Real-time Agent Query)
+-----------------------------------+   +------------------------------------+
|  @aiet/compiler: CompilerPipeline |   | @aiet/mcp-server: PAKBMCPServer    |
|  - Stage 1: Validation            |   | - pakb_search({ query })           |
|  - Stage 2: Token Profiling       |   | - pakb_get_primitive({ id })       |
|  - Stage 3: Priority Ranking      |   | - pakb_traverse_graph({ seed_id }) |
|  - Stage 4: Budget Fitting        |   +------------------------------------+
|  - Stage 5: Decontamination       |                    |
|  - Stage 6: Artifact Formatting   |                    |
|  - Stage 7: JCS Fingerprinting    |                    |
+-----------------------------------+                    |
         |                                               |
         v (4. Compiled System Preamble)                  v (4. Dynamic Search Results)
+------------------------------------------------------------------------------------+
|                                    AI AGENT RUNTIME                                |
|           (Prompt Context = Compiled System Preamble + MCP Dynamic Results)        |
+------------------------------------------------------------------------------------+
```

---

## 4. Architectural Invariants

1. **Deterministic Compilation**: Given identical primitive inputs and token budget settings, `@aiet/compiler` will produce bit-for-bit identical output artifacts across executions.
2. **Zero Secret Disclosure**: All primitive statements and descriptions pass through decontamination sanitization before artifact emission.
3. **Local-First Privacy**: Memory persistence and search operate strictly within local SQLite WAL database files without external API dependencies.
