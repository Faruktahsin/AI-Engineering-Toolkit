# Phase 6.3 Integration Plan — AI Agent Framework Integrations

> **Architecture & Plan Specification for AIET Ecosystem Integrations**  
> *Date: August 8, 2026*

---

## 1. Executive Summary

Phase 6.3 extends the AI Engineering Toolkit (AIET) into major AI agent framework ecosystems:
1. **Tier 1 MCP Experience Polish** (`@aiet/mcp-server`): Enhanced tool descriptions, memory explainability responses, and context source attribution.
2. **OpenAI Agents SDK Adapter** (`@aiet/adapter-openai-agents`): `createAIETAgentTools()` factory exposing function calling tools for OpenAI agents.
3. **LangGraph Adapter** (`@aiet/adapter-langgraph`): Graph node creators (`createAIETMemoryNode`, `createAIETGovernanceNode`, `createAIETCompilerNode`) and state checkpointer synchronization.
4. **Vercel AI SDK Adapter Polish** (`@aiet/adapter-vercel`): Enhanced streaming memory events, metadata tracking, and source attribution.
5. **Comprehensive Integration Documentation**: Standardized guides under `docs/integrations/`.

---

## 2. Integration Architecture & Packages

```
AIET Agent Integrations Matrix
├── Tier 1: MCP Server (@aiet/mcp-server)
│   ├── Tool Discovery & Self-Describing Metadata
│   └── Source Attribution (Confidence, Sensitivity, Origin Rationale)
│
├── Tier 2: Framework Adapters
│   ├── @aiet/adapter-vercel        # Vercel AI SDK tool definitions & streaming events
│   ├── @aiet/adapter-openai-agents # OpenAI Agents SDK tools & context injection
│   └── @aiet/adapter-langgraph     # LangGraph nodes & state checkpointer sync
│
└── Documentation Suite (docs/integrations/)
    ├── claude-code.md
    ├── cursor.md
    ├── windsurf.md
    ├── openai-agents.md
    ├── langgraph.md
    └── vercel-ai-sdk.md
```

---

## 3. Package Specifications

### 3.1 `@aiet/mcp-server` Improvements
- **Attribution Payload**: Enriches `pakb_search` and `pakb_get` responses with explicit source attribution metadata:
  ```json
  {
    "primitive_id": "dir_01J4X89K9Z1A2B3C4D5E6F7G8H",
    "statement": "Never output raw API keys",
    "attribution": {
      "confidence_score": 0.95,
      "sensitivity": "public",
      "volatility": "low",
      "selection_rationale": "Matched query 'API safety' via FTS5 BM25 + Vector hybrid RRF score 0.84"
    }
  }
  ```

### 3.2 `@aiet/adapter-openai-agents` (New Package)
- **Target API**: `createAIETAgentTools(aietClient)`
- **Exposed Tools**:
  - `aiet_search_memory`: FTS5 + Vector hybrid search
  - `aiet_propose_memory`: Autonomous memory candidate submission via governance pipeline
  - `aiet_compile_context`: Generates token-budgeted system preamble
  - `aiet_get_proposals`: Inspects pending governance queue

### 3.3 `@aiet/adapter-langgraph` (New Package)
- **Target API**: Node factory functions and checkpointer integration:
  - `createAIETMemoryNode(aietClient)`: Pre-execution memory retrieval graph node
  - `createAIETGovernanceNode(aietClient)`: Memory candidate evaluation graph node
  - `createAIETCompilerNode(aietClient)`: Context preamble injection graph node

### 3.4 `@aiet/adapter-vercel` Polish
- **Enhanced `createAIETTools(aietClient)`**:
  - Adds event stream formatting (`streamMemoryEvents`)
  - Provides source attribution on search matches

---

## 4. Verification Plan

1. Create packages `packages/adapter-openai-agents` and `packages/adapter-langgraph`.
2. Add unit/integration tests in:
   - `packages/mcp-server/tests/mcp-attribution.test.ts`
   - `packages/adapter-openai-agents/tests/openai-adapter.test.ts`
   - `packages/adapter-langgraph/tests/langgraph-adapter.test.ts`
   - `packages/adapter-vercel/tests/vercel-adapter-streaming.test.ts`
3. Run full monorepo build, typecheck, lint, and test suite.
