# AI Engineering Interview Preparation Handbook

## 1. System Design: Local-First Agent Memory System
- **Question**: Design a zero-leak, local-first long-term memory system for an AI coding assistant.
- **Key Concepts**: SQLite WAL mode, FTS5 BM25 search, JCS SHA-256 deduplication, 5-primitive knowledge graph (`Entity`, `Directive`, `Assertion`, `Event`, `Relation`), MCP stdio server.

## 2. Context Engineering: Token Budget Optimization
- **Question**: How do you fit 50,000 tokens of project documentation into a strict 500-token prompt preamble?
- **Key Concepts**: 7-stage deterministic context compiler, tiktoken profiling, ranking algorithms, instruction pruning.

## 3. Security: Unicode & Steganographic Prompt Injections
- **Question**: How do you prevent hidden zero-width space prompt injection in untrusted text inputs?
- **Key Concepts**: Zero-width unicode sanitization, character filtering, secret scanning before context assembly.
