# AI Engineering Toolkit: System Architecture Specification

## 1. High-Level System Architecture

The AI Engineering Toolkit is structured as a modular mono-repo containing applications, core SDK packages, Python bindings, workflows, prompts, and evaluation harnesses.

```
+-----------------------------------------------------------------------------------+
|                            AI ENGINEERING TOOLKIT                                 |
|                             (Parent Repository)                                   |
+-----------------------------------------------------------------------------------+
                                          |
      +-------------------+---------------+---------------+-------------------+
      |                   |               |               |                   |
[Subsystem 01]      [Subsystem 02]  [Subsystem 03]  [Subsystem 04]      [Subsystem 05]
  PAKB Engine         Prompt Lab     Agent Harness    Eval Suite        Workflow Engine
 (Context/MCP)     (Engineering)  (Exec Runtimes)  (Benchmarking)      (n8n/LangGraph)
```

## 2. PAKB (Subsystem 01) Architecture
PAKB is the flagship subsystem providing local-first context compilation, SQLite storage, and MCP servers.

### 2.1 The 5 Primitives
1. `Entity`: Named domain objects (people, repositories, systems).
2. `Directive`: Explicit rules or constraints that govern AI behavior.
3. `Assertion`: Fact claims anchored to source files.
4. `Event`: Temporal occurrences with timestamp attributes.
5. `Relation`: Explicit edges connecting entities and assertions.

### 2.2 Local Storage Engine (`@aiet/storage`)
- **Engine**: SQLite in WAL (Write-Ahead Logging) mode.
- **Full-Text Search**: SQLite FTS5 for hybrid BM25 lexical search.
- **Hashing**: JSON Canonicalization Scheme (JCS) SHA-256 for entity deduplication.
- **Graph Traversal**: Recursive Common Table Expressions (CTEs) for multi-hop graph traversal in <3ms.

### 2.3 Context Compiler Pipeline (`@aiet/compiler`)
1. **Stage 1 (Normalizer)**: Parses input markdown/json and extracts candidate entities.
2. **Stage 2 (Sanitizer)**: Zero-width Unicode decontamination and secret scanning.
3. **Stage 3 (Fingerprint)**: Generates JCS SHA-256 hashes.
4. **Stage 4 (Ranking)**: Scores assertions using decay factors and BM25 relevance.
5. **Stage 5 (Token Profiler)**: Fits context into target budgets using `cl100k_base` (tiktoken).
6. **Stage 6 (Preamble Emitter)**: Generates static preamble injection (<500 tokens).
7. **Stage 7 (Manifest Builder)**: Builds reproducible build manifests and fingerprints.

## 3. Model Context Protocol (MCP) Layer
Exposes stdio/SSE MCP tools (`pakb_query`, `pakb_compile`, `pakb_assert`) and resources (`pakb://context/active`) to Claude Code, Cursor, Windsurf, and custom agent runtimes.
