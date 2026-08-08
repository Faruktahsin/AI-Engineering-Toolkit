# AIET Official Demo: General AI Personal Assistant

This official example demonstrates how developers build a General AI Personal Assistant using **AIET**, `@aiet/adapter-openai-agents`, and `@aiet/core`. *(Note: This is an infrastructure demonstration, not Personal AI PAKB).*

---

## 1. Architecture Diagram

```mermaid
flowchart TD
    User([User]) --> Assistant[PersonalAssistantAgent]
    Assistant --> OpenAITools["@aiet/adapter-openai-agents (Function Tools)"]
    OpenAITools --> Core SDK["@aiet/core (AIETClient)"]
    Assistant --> Explainability["Memory Explainability Engine"]
    Core SDK --> Storage["SQLite WAL Local Store"]
```

---

## 2. AIET Infrastructure Components Used

- **`@aiet/core`**: Core facade for memory CRUD, vector search, and budget compilation.
- **`@aiet/adapter-openai-agents`**: Automatic OpenAI tool definitions for agent function calls.
- **`@aiet/schema`**: `Directive` (preferences) and `Assertion` (tasks) schemas.

---

## 3. Installation & Setup

```bash
# From workspace root
corepack pnpm install --filter @aiet/example-personal-assistant...
```

---

## 4. Running the Demo

```bash
# Run using tsx
corepack pnpm --filter @aiet/example-personal-assistant start

# Run unit tests
corepack pnpm --filter @aiet/example-personal-assistant test
```

---

## 5. Example Interaction

```text
1. OpenAI Function Tools Discovered:
   - `aiet_search_memory`
   - `aiet_propose_memory`
   - `aiet_compile_context`
   - `aiet_get_proposals`

2. Save User Preference:
   Assistant persists Directive `dir_01J...` ("I prefer morning meetings between 9 AM and 11 AM EST").

3. Save Task:
   Assistant persists Assertion `ast_01J...` ("Task: Prepare quarterly engineering roadmap presentation").

4. Memory Explanation Query:
   User: "Why did you schedule my meeting at 9 AM?"
   Assistant: [Retrieves Directive `dir_01J...` with attribution rationale and combined BM25 + Vector RRF score].
```
