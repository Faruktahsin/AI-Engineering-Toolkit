# Personal AI Knowledge Base (PAKB) — Canonical Domain Model

**Document Type:** Architecture Domain Model  
**Author:** Senior Software Architect  
**Date:** 5 August 2026  
**Status:** Frozen Conceptual Specification (Phase 1)  
**Scope:** Conceptual entities, semantic relationships, operational lifecycles, and context activation boundaries. (Runtime-agnostic; no database, schema, or file format details).

---

## 1. Domain Modeling Philosophy & Activation Principles

The PAKB domain model represents the owner's mental model, preferences, historical decisions, active commitments, and operational rules. 

To prevent context bloat and distractor interference while guaranteeing safety, every domain entity is classified across three operational axes:

1. **Volatility**: Rate of state change over time (*Invariant*, *Low*, *Medium*, *High*).
2. **Lifetime**: Validity horizon (*Permanent*, *Epoch-bound*, *Project-bound*, *Ephemeral*).
3. **Activation Class**: Context routing layer:
   - **Always-On (Preamble / Tier 0)**: Injected into the initial system context (Strictly bounded ≤ 500 tokens total). Must be *Invariant* or *Low Volatility*.
   - **On-Demand (MCP / Tier 1)**: Served dynamically via Model Context Protocol tools and resource endpoints when relevant to a specific task.
   - **Restricted (Redacted / Tier 2)**: Stored securely in PAKB but **never** passed directly into an LLM context window (e.g., raw credentials, private PII, API tokens).

---

## 2. Core Domain Entities

### 2.1 Person (Owner Identity)
* **Purpose**: Represents the owner of the PAKB—their identity, core values, primary language, and fundamental baseline context.
* **Lifetime**: Permanent.
* **Volatility**: Invariant / Very Low.
* **Activation Class**: **Always-On (Tier 0)**.
* **Required Fields**:
  * `Owner Identifier`: Unique identity anchor.
  * `Display Name`: Preferred name for communication.
  * `Primary Language`: Natural language for interactions.
  * `Timezone & Locale`: Geographical/temporal alignment anchor.
* **Optional Fields**:
  * `Bio / Background Summary`: High-level summary of background and expertise.
  * `Core Values`: Long-term principles guiding decisions.
* **Relations**:
  * Has many `Constraint` instances (global safety/operational rules).
  * Has many `Preference` instances (stylistic/tool preferences).
  * Has many `Project` instances (owned initiatives).
  * Connected to `Contact` instances via `Relationship`.

### 2.2 Constraint (Hard Guardrail)
* **Purpose**: Encapsulates non-negotiable rules, safety guardrails, operational boundaries, and security policies that every AI agent must strictly follow.
* **Lifetime**: Permanent or Epoch-bound.
* **Volatility**: Low.
* **Activation Class**: **Always-On (Tier 0)**.
* **Required Fields**:
  * `Constraint ID`: Unique identifier.
  * `Category`: Classification (e.g., Security, Privacy, Code Style, Communication).
  * `Directive Statement`: Clear, unambiguous rule (e.g., "Never commit raw secrets").
  * `Severity`: Enforcement level (Critical, Warning).
* **Optional Fields**:
  * `Exemption Scope`: Specific contexts where the constraint does not apply.
  * `Rationale`: Reason behind the rule.
* **Relations**:
  * Bound to `Person` (global) or `Project` (scoped).

### 2.3 Preference (Soft Directive)
* **Purpose**: Captures subjective tendencies, formatting choices, tool choices, and interaction styles. Guided by "best effort" rather than strict enforcement.
* **Lifetime**: Epoch-bound or Permanent.
* **Volatility**: Low to Medium.
* **Activation Class**: **Always-On (Tier 0 for Core Style)** / **On-Demand (Tier 1 for Domain Specifics)**.
* **Required Fields**:
  * `Preference ID`: Unique identifier.
  * `Domain`: Topic area (e.g., Tone, TypeScript, Documentation, Email).
  * `Guideline`: Natural language statement of preference.
* **Optional Fields**:
  * `Counter-Example`: Anti-patterns to avoid.
  * `Evidence Type`: How the preference was derived (`Observed`, `Stated`, `Inferred`).
* **Relations**:
  * Associated with `Person`, `Project`, or `Knowledge Item`.

### 2.4 Project (Workstream / Initiative)
* **Purpose**: Represents an active or historical endeavor, code repository, or structured effort with defined boundaries and goals.
* **Lifetime**: Project-bound (Active → Completed / Archived).
* **Volatility**: Medium.
* **Activation Class**: **On-Demand (Tier 1)** (Active project summary may enter preamble during project-scoped sessions).
* **Required Fields**:
  * `Project ID`: Unique identifier.
  * `Name`: Title of the project.
  * `Status`: Operational state (`Idea`, `Active`, `Paused`, `Completed`, `Archived`).
  * `Objective`: Primary goal of the project.
* **Optional Fields**:
  * `Repository URL`: Link to codebase or artifact.
  * `Tech Stack`: Core tools and frameworks used.
  * `Archival Date`: Timestamp of completion/archival.
* **Relations**:
  * Contains many `Decision` records.
  * Triggers/linked to `Goal` instances.
  * References many `Knowledge Item` instances.

### 2.5 Decision (ADR / Architecture Decision Record)
* **Purpose**: Records significant strategic, technical, or structural choices, along with their context, rationale, and consequences.
* **Lifetime**: Permanent (historical record).
* **Volatility**: Invariant (Decisions are superseded, not rewritten).
* **Activation Class**: **On-Demand (Tier 1)**.
* **Required Fields**:
  * `Decision ID`: Unique identifier.
  * `Title`: Concise summary of choice made.
  * `Status`: State (`Proposed`, `Accepted`, `Superseded`, `Deprecated`).
  * `Context & Problem`: The underlying issue addressed.
  * `Decision Statement`: The chosen path.
* **Optional Fields**:
  * `Consequences`: Known trade-offs or impacts.
  * `Alternatives Considered`: Evaluated options that were rejected.
* **Relations**:
  * Belongs to a `Project`.
  * May `Supersede` or `be_superseded_by` another `Decision`.

### 2.6 Goal (Target / Milestone)
* **Purpose**: Models short-term, medium-term, or long-term objectives across personal, professional, or technical domains.
* **Lifetime**: Epoch-bound (expires upon deadline or completion).
* **Volatility**: Medium.
* **Activation Class**: **On-Demand (Tier 1)**.
* **Required Fields**:
  * `Goal ID`: Unique identifier.
  * `Title`: Natural language goal description.
  * `Horizon`: Timeframe (`Quarterly`, `Annual`, `Long-term`).
  * `Status`: Progress state (`Planned`, `In-Progress`, `Achieved`, `Abandoned`).
* **Optional Fields**:
  * `Target Date`: Expected completion timeframe.
  * `Success Criteria`: Measurable outcomes.
* **Relations**:
  * Linked to `Project` or `Habit`.
  * Owned by `Person`.

### 2.7 Habit & Routine (Recurring Pattern)
* **Purpose**: Captures recurring operational habits, daily routines, and review cadences.
* **Lifetime**: Epoch-bound.
* **Volatility**: Medium.
* **Activation Class**: **On-Demand (Tier 1)**.
* **Required Fields**:
  * `Habit ID`: Unique identifier.
  * `Name`: Title of routine.
  * `Cadence`: Frequency (`Daily`, `Weekly`, `Monthly`).
  * `Description`: Actionable steps or expectations.
* **Optional Fields**:
  * `Last Verified`: Timestamp of last review.
* **Relations**:
  * Supports a `Goal` or `Preference`.

### 2.8 Contact & Entity (External Actor)
* **Purpose**: Represents key people, organizations, teams, or vendors in the owner's network.
* **Lifetime**: Permanent or Epoch-bound.
* **Volatility**: Low.
* **Activation Class**: **On-Demand (Tier 1)**.
* **Required Fields**:
  * `Contact ID`: Unique identifier.
  * `Name`: Person or organization name.
  * `Entity Type`: Classification (`Person`, `Company`, `Team`, `Vendor`).
* **Optional Fields**:
  * `Role / Title`: Position or relationship.
  * `Organization`: Associated company/group.
  * `Communication Notes`: Interaction guidance.
* **Relations**:
  * Connected via `Relationship` to `Person` or `Project`.

### 2.9 Relationship (Typed Semantic Link)
* **Purpose**: Defines a directional, typed relationship between two entities in the knowledge graph.
* **Lifetime**: Dynamic (Valid during the life of the relation).
* **Volatility**: Low to Medium.
* **Activation Class**: **On-Demand (Tier 1)**.
* **Required Fields**:
  * `Relationship ID`: Unique identifier.
  * `Source Entity`: Reference to origin entity.
  * `Target Entity`: Reference to target entity.
  * `Relation Type`: Semantic predicate (e.g., `works_with`, `manages`, `depends_on`, `supersedes`, `authored_by`).
* **Optional Fields**:
  * `Start Date` / `End Date`: Temporal validity window.
* **Relations**:
  * Joins any two domain entities.

### 2.10 Knowledge Item (Atomic Fact / Concept)
* **Purpose**: Captures an atomically scoped domain insight, technical mental model, or synthesized reference note.
* **Lifetime**: Permanent / Semi-Permanent.
* **Volatility**: Low.
* **Activation Class**: **On-Demand (Tier 1)**.
* **Required Fields**:
  * `Knowledge ID`: Unique identifier.
  * `Topic / Subject`: Domain classification.
  * `Assertion`: The core knowledge statement or explanation.
  * `Evidence Type`: Provenance marker (`Observed`, `Stated`, `Inferred`).
* **Optional Fields**:
  * `Source`: Provenance origin URL or document reference.
  * `Last Verified`: Timestamp of accuracy verification.
* **Relations**:
  * Linked to `Project`, `Decision`, or other `Knowledge Item` instances.

### 2.11 Timeline Event (Historical / Episodic Log)
* **Purpose**: Records chronological occurrences, milestone achievements, session reflections, or significant events.
* **Lifetime**: Permanent (Append-only history).
* **Volatility**: Invariant.
* **Activation Class**: **On-Demand (Tier 1)**.
* **Required Fields**:
  * `Event ID`: Unique identifier.
  * `Timestamp`: Date and time of occurrence.
  * `Summary`: Description of the event.
* **Optional Fields**:
  * `Impact`: Significance rating or outcome summary.
  * `Tags`: Subject keywords.
* **Relations**:
  * Associated with `Project`, `Person`, or `Contact`.

### 2.12 Location & Environment
* **Purpose**: Encapsulates physical or virtual operational context (e.g., home office, cloud environment, dev machine setup).
* **Lifetime**: Epoch-bound.
* **Volatility**: Low to Medium.
* **Activation Class**: **On-Demand (Tier 1)**.
* **Required Fields**:
  * `Environment ID`: Unique identifier.
  * `Name`: Context label (e.g., "Primary Workstation", "Home Office").
  * `Type`: Environment class (`Physical Location`, `Digital Workspace`).
* **Optional Fields**:
  * `Timezone`: Local time parameters.
  * `Configurations`: Hardware or workspace details.
* **Relations**:
  * Linked to `Person` or `Project`.

### 2.13 Restricted Credential & Private PII (Redacted Boundary)
* **Purpose**: Models sensitive security assets, private financial records, passwords, or confidential identity documents.
* **Lifetime**: Permanent / Epoch-bound.
* **Volatility**: Low.
* **Activation Class**: **Restricted (Tier 2 - NEVER ENTER CONTEXT DIRECTLY)**.
* **Required Fields**:
  * `Asset ID`: Unique identifier.
  * `Category`: Sensitivity type (`API Secret`, `Financial Record`, `Private PII`).
  * `Storage Reference`: Pointer to local encrypted vault or secure key store.
* **Optional Fields**:
  * `Expiration Date`: Validity window.
* **Relations**:
  * Bound to `Person` or `Environment`. (Access strictly gated behind local deterministic security scripts).

---

## 3. Domain Entity Matrix & Context Activation Routing

| Domain Entity | Lifetime | Volatility | Activation Class | Primary Access Channel |
|---|---|---|---|---|
| **Person (Owner)** | Permanent | Invariant | **Always-On (Tier 0)** | Static Preamble (`CLAUDE.md`, `AGENTS.md`) |
| **Constraint** | Permanent / Epoch | Low | **Always-On (Tier 0)** | Static Preamble (`CLAUDE.md`, `.cursorrules`) |
| **Preference (Core)** | Epoch / Permanent | Low | **Always-On (Tier 0)** | Static Preamble |
| **Preference (Domain)**| Epoch / Permanent | Medium | **On-Demand (Tier 1)** | MCP Tool / Resource Server |
| **Project** | Project-bound | Medium | **On-Demand (Tier 1)** | MCP Tool / Resource Server |
| **Decision (ADR)** | Permanent | Invariant | **On-Demand (Tier 1)** | MCP Tool / Resource Server |
| **Goal** | Epoch-bound | Medium | **On-Demand (Tier 1)** | MCP Tool |
| **Habit & Routine** | Epoch-bound | Medium | **On-Demand (Tier 1)** | MCP Tool |
| **Contact & Entity** | Permanent / Epoch | Low | **On-Demand (Tier 1)** | MCP Tool |
| **Relationship** | Dynamic | Low / Medium | **On-Demand (Tier 1)** | MCP Tool / Graph Query |
| **Knowledge Item** | Permanent | Low | **On-Demand (Tier 1)** | MCP Tool / Resource Server |
| **Timeline Event** | Permanent | Invariant | **On-Demand (Tier 1)** | MCP Tool |
| **Location & Env** | Epoch-bound | Medium | **On-Demand (Tier 1)** | MCP Tool |
| **Restricted Asset**| Permanent / Epoch | Low | **Restricted (Tier 2)** | Encrypted Vault (Redacted from Prompts) |

---

## 4. Context Activation Rules & Boundaries

### 4.1 Always-On Context (Tier 0 — Bounded ≤500 Tokens)
To prevent distractor interference and token bloat, Tier 0 contains **only**:
* `Person` identity basics (Name, Language, Timezone).
* Critical `Constraint` directives (Non-negotiable safety, privacy, and output guardrails).
* Core `Preference` guidelines (Global tone and communication directives).

### 4.2 On-Demand Context (Tier 1 — Dynamic MCP Layer)
All relational, structural, and historical knowledge (`Project`, `Decision`, `Goal`, `Knowledge Item`, `Contact`, `Relationship`, `Timeline Event`) is served strictly via dynamic MCP tool and resource calls (`resources/read`, `tools/call`). AI models query these entities on-demand when relevant to the task at hand.

### 4.3 Restricted Boundary (Tier 2 — Redacted)
`Restricted Credential & Private PII` entities are permanently barred from entering prompt context. Local pre-commit hooks and security scanners sanitize and redact these payloads before any data is indexed or transmitted.
