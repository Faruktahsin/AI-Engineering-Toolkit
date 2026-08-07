# Personal AI Knowledge Base — Phase 0 Addendum: Peer Review Evaluation & Revised Architecture

**Document Type:** Formal Addendum & Architecture Revision  
**Prepared for:** Faruk Tahsin  
**Date:** 5 August 2026  
**Status:** Approved Architectural Revision (Post Peer-Review)  
**Parent Document:** `Personal AI Knowledge Base — Phase 0 Research Report`

---

## 1. Overview & Evaluation Summary

This addendum formalizes the evaluation of the independent peer review conducted on the Phase 0 Research Report. Each critique was assessed for technical validity, structural consistency, and alignment with empirical evidence. 

The review resulted in **2 Acceptances**, **4 Partial Acceptances**, and **1 Rejection**. The resulting architectural revisions resolve key internal contradictions in the original report while steering clear of over-engineering.

### Scorecard Summary

| # | Peer Review Focus Area | Decision | Core Architectural Impact |
|---|---|---|---|
| 1 | **MCP & Context Architecture** | **Accept** | Shift from static file-stuffing to a dual-path distribution (Static Preamble + MCP Resource Server). |
| 2 | **Maintenance Paradox & Security** | **Accept** | Shift from banning writes to "Agent Proposes, Human Commits" PR workflow. |
| 3 | **Dublin Core / Dumb-Down Principle** | **Reject** | Retain Dumb-Down Principle; peer review misconstrued value replacement for type generalization. |
| 4 | **"Spec-First" Thesis** | **Partially Accept** | Retain `FORMAT.md` from Day 1 for N=1 tool usage; defer normative spec until second implementer. |
| 5 | **Graph Representation vs. Flat Schema** | **Partially Accept** | Reject full GraphRAG as over-engineering; adopt SQLite typed edges with recursive CTEs + JSON Schema. |
| 6 | **3-Arm Eval & Counterfactuals ($A_2$)** | **Partially Accept** | Retain $A_2$ counterfactual arm, but restrict it exclusively to Stratum 1 (KB-necessary facts). |
| 7 | **Security / CI Exposure (T8)** | **Partially Accept** | Restrict CI runs to synthetic test fixtures only; real KB evaluations run strictly locally. |

---

## 2. Detailed Evaluation & Architectural Revisions

### Item 1: MCP & Context Architecture — [ACCEPT]

* **Peer Critique:** The original report argued that context rot and distractor interference make context-stuffing a correctness bug, yet it proposed compiling and injecting static files into agents on every turn. It failed to account for Model Context Protocol (MCP) as the standardized dynamic context retrieval interface.
* **Analysis & Resolution:** The critique identified a genuine blind spot and an internal contradiction in the original report. However, the reviewer's counter-proposal ("files are dead, everything is MCP") goes too far. Identity-level facts (e.g., name, timezone, non-negotiable safety rules) cannot be left to an agent's discretion to query via tool calls.
* **Revised Architecture:** The **Volatility × Activation matrix** now serves as the primary **Distribution Scheme**:
  * **Always-On Invariant Context (≤500 tokens):** Emitted as static preambles (`CLAUDE.md`, `.cursorrules`, `AGENTS.md`) with zero runtime overhead.
  * **Volatile / On-Demand Context:** Served dynamically via a local **MCP Resource Server** (`resources/read`, `tools/call`).
  * **Compiler Role:** Shifts from "generating target files per tool" to "partitioning content by activation layer and budget constraints."

---

### Item 2: Maintenance Paradox & Security Boundary — [ACCEPT]

* **Peer Critique:** The original report labeled maintenance collapse as a top failure mode and showed humans only sustain "review-and-approve", yet it banned automated writes. It also relied on human code reviews while acknowledging zero-width Unicode attacks are invisible in GitHub PR UIs.
* **Analysis & Resolution:** The critique correctly identified a paradox in enforcing manual authoring while acknowledging human maintenance collapse. However, the reviewer's alternative ("sandboxed agentic writes") reintroduces persistent injection vectors (MINJA / SpAIware).
* **Revised Architecture: "Agent Proposes, Human Commits"**
  * The AI agent dynamically drafts memory and preference updates as isolated, structured PRs or diffs.
  * Automated pre-commit hooks sanitize hidden Unicode, strip zero-width characters, and run secret scanners.
  * The human user reviews and commits the proposed diff. This eliminates manual authoring, breaks the persistent injection chain, and keeps code reviews effective by keeping diffs small and atomic.

---

### Item 3: Dublin Core / Dumb-Down Principle — [REJECT]

* **Peer Critique:** The reviewer argued that falling back from a refined term to a generic parent term creates ambiguity and harms LLM attention mechanisms.
* **Analysis & Resolution:** The critique stems from a fundamental misunderstanding of the Dumb-Down Principle. Dumb-down does *not* replace a specific value with a generic value (e.g., changing `financial_risk_tolerance: low` to `preference: low`). That would be lossy truncation. 
* **Correct Application:** Dumb-down guarantees that when a consumer does not recognize a refined property type, it falls back to the parent property while **retaining the full literal value** (e.g., `preference: financial risk tolerance is low`).
* **Revised Architecture:** The Dumb-Down Principle remains a normative requirement. In a dual-path (Static + MCP) distribution model, this guarantee prevents new schema extensions from breaking older or simpler client adapters.

---

### Item 4: "Spec-First" Thesis — [PARTIALLY ACCEPT]

* **Peer Critique:** Protocols like LSP, OpenAPI, and MCP succeeded because they were specified early to enable multi-vendor interoperability.
* **Analysis & Resolution:** While the reviewer's counter-examples are valid, in every case (LSP by Microsoft, MCP by Anthropic), the spec author also controlled a primary consuming tool. This actually reinforces the Consumer Thesis (having an obligated reader).
* **Revised Decision:** Clarify the sequencing. Develop `FORMAT.md` alongside the personal tool from Day 1 for N=1 usage. Defer publishing a formal, normative specification until a second independent implementer requests it.

---

### Item 5: Graph Representation vs. Flat Schema — [PARTIALLY ACCEPT]

* **Peer Critique:** Banning relationship modeling handicaps the system's ability to perform multi-hop relational reasoning across personal entities.
* **Analysis & Resolution:** The reviewer is correct that banning relationship modeling was overly restrictive. However, full GraphRAG or RDF triple-stores represent massive over-engineering for personal-scale context (N=1).
* **Revised Architecture:** Use a lightweight **SQLite database with typed edges and recursive Common Table Expressions (CTEs)** for local relational and multi-hop queries, with JSON Schema validating the interface boundaries.

---

### Item 6: 3-Arm Evaluation & Counterfactuals ($A_2$) — [PARTIALLY ACCEPT]

* **Peer Critique:** Counterfactual KBs ($A_2$) with altered facts test LLM sycophancy and parametric memory conflict rather than KB retrieval performance.
* **Analysis & Resolution:** Valid point for facts where the LLM holds strong parametric priors. However, for genuinely personal facts where parametric accuracy is at chance level, $A_2$ remains essential to prove the model is using the KB rather than guessing.
* **Revised Decision:** Retain the 3-arm evaluation framework ($A_0, A_1, A_2$), but **restrict $A_2$ counterfactual testing exclusively to Stratum 1 (KB-necessary facts)**.

---

### Item 7: Security / CI Exposure & Threat Model — [PARTIALLY ACCEPT]

* **Peer Critique:** Running evaluations in CI risks exposing sensitive personal data in runner logs and third-party judge APIs (Threat T8).
* **Analysis & Resolution:** Correct insight regarding CI privacy risks.
* **Revised Decision:** CI runs are strictly restricted to **synthetic test fixtures** and deterministic checks (schema validation, secret scanning, Unicode detection). Real KB evaluations run exclusively in local environments on a scheduled cadence.

---

## 3. Revised System Architecture Matrix

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PAKB SOURCE CORE                               │
│            (SQLite Entity Graph + JSON Schema Validation)               │
└────────────────────┬───────────────────────────────┬────────────────────┘
                     │                               │
       Static Preambles (≤500 tokens)        Dynamic MCP Endpoint
       (Always-On / Invariant)              (On-Demand / Volatile)
                     │                               │
       ┌─────────────┴─────────────┐                 │
       ▼                           ▼                 ▼
  `AGENTS.md`               `.cursorrules`      Local MCP Server
  `CLAUDE.md`                                 (`resources`, `tools`)
```

---

## 4. Summary of Architectural Changes (The 11 Items)

1. **Distribution Protocol:** Dual-path distribution (Static Preamble ≤500 tokens + Local MCP Server).
2. **Compiler Function:** Re-scoped to partition content by activation layer rather than per-tool formatting.
3. **Memory Ingestion:** "Agent Proposes, Human Commits" PR workflow replacing pure manual authoring.
4. **Data Store:** SQLite with typed edges and recursive CTEs replacing flat text files for relational queries.
5. **Validation Layer:** JSON Schema maintained for interface boundary validation.
6. **Schema Degradation:** Dublin Core Dumb-Down Principle enforced to ensure backward compatibility.
7. **Specification Timeline:** `FORMAT.md` authored for Day 1 tool usage; formal spec deferred to Phase 3.
8. **Evaluation Framework:** 3-arm eval retained, with $A_2$ counterfactuals restricted to Stratum 1 facts.
9. **CI/CD Execution:** CI restricted to synthetic test fixtures and deterministic security scans.
10. **Security Controls:** Pre-commit hooks for zero-width Unicode stripping and secret scanning.
11. **Threat Model:** Added T8 (CI Data Exposure) and T9 (Judge-Channel Injection) to formal threat matrix.

---

## 5. Unchanged Core Postulates

* **The Consumer Thesis:** Producer-side marginal cost versus consumer-side value dictates survival.
* **Primary Audience:** N=1 author-as-consumer remains the sole primary design target.
* **Staleness as a Correctness Bug:** Context rot actively misleads models via distractor interference.
* **Gold-Judge Boundary:** Relative evaluation comparisons survive noisy judges; absolute scores do not.
