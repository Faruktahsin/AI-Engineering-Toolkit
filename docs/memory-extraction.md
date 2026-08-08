# Autonomous Memory Extraction (`@aiet/extractor`)

> **Conversation Turn Parsing, Conversational Filler Filtering, and Schema-Compliant Primitive Candidate Generation for AI-Engineering-Toolkit (`AIET`).**

---

## 1. Overview

`@aiet/extractor` is the first entry component of AIET's **Autonomous Memory Formation System**. It ingests raw conversation turns or event logs, filters out low-value conversational filler, automatically classifies sensitivity boundaries, and emits candidate memory primitives (`Entity`, `Directive`, `Assertion`, `Event`, `Relation`).

---

## 2. Architecture & Data Flow

```
[ ConversationInput (User/Assistant Messages) ]
                       |
                       v
     [ Conversational Filler Filter ] ----(Filler Turns)----> [ Skipped Turns Count ]
                       |
                       v (Substantive Turns)
         [ Sensitivity Classifier ]
                       |
                       v
         [ ExtractorProvider (Deterministic or LLM) ]
                       |
                       v
         [ Ajv Draft 2020-12 Validator ]
                       |
                       v
         [ ExtractionResult (Memory Candidates) ]
```

---

## 3. Core Interfaces

```typescript
export interface ChatMessage {
  readonly role: "user" | "assistant" | "system";
  readonly content: string;
  readonly timestamp?: string;
}

export interface ConversationInput {
  readonly messages: readonly ChatMessage[];
  readonly metadata?: Record<string, unknown>;
}

export interface MemoryCandidate {
  readonly primitive_type: "entity" | "directive" | "assertion" | "event" | "relation";
  readonly candidate: AnyPrimitive;
  readonly confidence_score: number;
  readonly rationale: string;
}

export interface ExtractionResult {
  readonly total_candidates: number;
  readonly candidates: readonly MemoryCandidate[];
  readonly skipped_turns: number;
}

export interface ExtractorProvider {
  readonly name: string;
  extract(input: ConversationInput): Promise<ExtractionResult>;
}
```

---

## 4. Sensitivity & Filler Utilities

- **`isConversationalFiller(content)`**: Detects conversational filler (*"thanks"*, *"ok"*, *"can you hear me?"*) to avoid wasteful LLM extraction calls.
- **`classifySensitivity(text)`**: Auto-detects sensitive credentials (OpenAI API keys, AWS credentials, Bearer tokens, private keys) and assigns `sensitivity: "restricted"`.

---

## 5. Extractor Providers

### 5.1 `DeterministicExtractorProvider`
Zero-dependency, rule-based extractor for local unit testing and offline execution:
- Extracts user preferences as `Directive` primitives (`domain: "user_preference"`).
- Extracts project workstreams as `Entity` primitives (`type: "workstream"`).
- Extracts facts as `Assertion` primitives (`type: "fact"`).

### 5.2 `LLMExtractorProvider`
Provider-agnostic LLM extraction wrapper accepting custom completion functions (OpenAI, Gemini, Claude, local Ollama):

```typescript
import { LLMExtractorProvider } from "@aiet/extractor";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const extractor = new LLMExtractorProvider({
  name: "openai-gpt-4o-extractor",
  llmCompletionFn: async (prompt: string) => {
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
    });
    return text;
  },
});
```
