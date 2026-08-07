# Personal AI Knowledge Base (PAKB) — Refactored Canonical Domain Model

**Document Type:** Architecture Domain Model (Refactored)  
**Author:** Senior Software Architect  
**Date:** 5 August 2026  
**Status:** Approved Minimalist Domain Architecture  
**Design Horizon:** 10-Year Durability Standard  
**Parent Specification:** `PAKB-Canonical-Domain-Model.md`

---

## 1. Architectural Strategy & Design Principles

To ensure this domain model remains robust, extensible, and maintainable over a **10-year evolution horizon**, the architecture transitions from specialized domain taxonomies to a **composition-first primitive model**.

Specialized entities (such as *Person*, *Project*, *Constraint*, *Preference*, *ADR*, *Habit*) reflect ephemeral organizational categories that change over time. In contrast, fundamental primitives represent the underlying information physics of personal knowledge systems.

### Core Architectural Rules:
1. **Composition Over Specialization**: Domain concepts are composed using attributes and relations on fundamental primitives rather than creating distinct entity classes.
2. **Orthogonality**: The fundamental primitives are mutually exclusive and jointly cover all possible personal context requirements.
3. **Operational Attributes as First-Class Properties**: Activation class, volatility, lifetime, and sensitivity are universal operational attributes present on all primitives.

---

## 2. Entity Consolidation & Merge Rationales

The original 13 specialized entities have been consolidated into **5 Fundamental Primitives**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       THE 5 FUNDAMENTAL PRIMITIVES                      │
│                                                                         │
│   1. ENTITY       (Subjects, Actors, Workstreams, & Environments)      │
│   2. DIRECTIVE    (Rules, Guardrails, Preferences, & Routines)          │
│   3. ASSERTION    (Facts, Insights, Decisions, & Credentials)           │
│   4. EVENT        (Temporal Occurrences, Logs, & Milestones)            │
│   5. RELATION     (Typed Directed Semantic Edges)                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Detailed Merge Explanations:

* **Merge 1: `Person`, `Contact`, `Project`, `Goal`, `Location/Environment` ➔ `ENTITY`**
  * **Rationale**: Whether an object represents the owner, an external colleague, a software codebase, an annual goal, or a physical office, it is structurally a *subject node* possessing an identity, metadata, status, and relationships. Specializing distinct entity types for "Project" vs "Contact" creates rigid schemas. Representing them as an `ENTITY` with a `type` discriminant (`owner`, `contact`, `workstream`, `objective`, `environment`) preserves total expressiveness while allowing new subject types to emerge without schema changes.

* **Merge 2: `Constraint`, `Preference`, `Habit/Routine` ➔ `DIRECTIVE`**
  * **Rationale**: A hard constraint ("Never commit raw API keys"), a soft preference ("Prefer concise Markdown"), and a recurring routine ("Perform weekly review on Mondays") are all *instructions that govern behavior*. The difference lies solely in two attributes: `enforcement` (`hard` vs `soft`) and `recurrence` (one-off vs scheduled cadence). Unifying them into `DIRECTIVE` eliminates redundant rule abstractions and allows uniform context-budget slicing.

* **Merge 3: `Knowledge Item`, `Decision (ADR)`, `Restricted Credential/PII` ➔ `ASSERTION`**
  * **Rationale**: A domain insight, an architectural decision record, and a private credential reference are all *claims of truth or state records*. A Decision (ADR) is simply an Assertion with `type: decision` and `status: accepted`. A credential reference is an Assertion with `sensitivity: restricted`. Unifying them into `ASSERTION` enforces consistent provenance tracking (`observed`, `stated`, `inferred`), evidence logging, and validity windows across all knowledge assets.

* **Merge 4: `Timeline Event` ➔ `EVENT`**
  * **Rationale**: Retained as a fundamental primitive to represent time-bound occurrences, session logs, historical state transitions, and milestone completions.

* **Merge 5: `Relationship` ➔ `RELATION`**
  * **Rationale**: Retained as the foundational primitive for typed, directional semantic links connecting any two nodes in the knowledge graph.

---

## 3. The 5 Fundamental Core Primitives

### 3.1 ENTITY (Subjects, Actors, Workstreams, & Environments)
* **Purpose**: Represents any identifiable subject, actor, place, objective, or organizational boundary in the owner's world.
* **Lifetime**: Permanent or Epoch-bound.
* **Volatility**: Low to Medium.
* **Activation Class**: **Always-On (Tier 0)** if `type == owner`; **On-Demand (Tier 1)** for all other types.
* **Required Fields**:
  * `entity_id`: Unique identifier anchor.
  * `name`: Display name or title.
  * `type`: Discriminant (`owner`, `contact`, `organization`, `workstream`, `objective`, `environment`).
  * `activation`: Context routing class (`always_on`, `on_demand`, `restricted`).
  * `volatility`: Rate of state change (`invariant`, `low`, `medium`, `high`).
* **Optional Fields**:
  * `status`: Operational state (`idea`, `active`, `paused`, `completed`, `archived`).
  * `locale_info`: Timezone, geographic location, or primary language.
  * `description`: High-level summary or bio.
  * `metadata`: Key-value pairs for type-specific extensions.
* **Relations**:
  * Joined to any primitive via `RELATION`.

### 3.2 DIRECTIVE (Rules, Guardrails, Preferences, & Routines)
* **Purpose**: Encapsulates any instruction, policy, style guideline, or operational routine that governs AI or human behavior.
* **Lifetime**: Permanent or Epoch-bound.
* **Volatility**: Low to Medium.
* **Activation Class**: **Always-On (Tier 0)** if `enforcement == hard` or `is_global_style == true`; otherwise **On-Demand (Tier 1)**.
* **Required Fields**:
  * `directive_id`: Unique identifier.
  * `statement`: Clear, actionable instruction or rule.
  * `enforcement`: Enforcement severity (`hard` [Constraint], `soft` [Preference]).
  * `domain`: Topic area (e.g., `security`, `code_style`, `communication`, `workflow`).
  * `activation`: Context routing class.
* **Optional Fields**:
  * `cadence`: Recurrence pattern (`daily`, `weekly`, `monthly`, `on_event`) for habits/routines.
  * `exemption_scope`: Conditions where directive does not apply.
  * `rationale`: Reason behind the directive.
* **Relations**:
  * Scoped to an `ENTITY` (e.g., a rule specific to a `workstream` or `owner`).

### 3.3 ASSERTION (Facts, Insights, Decisions, & Credentials)
* **Purpose**: Represents atomic claims of truth, domain mental models, decision records, or state records.
* **Lifetime**: Permanent / Semi-Permanent.
* **Volatility**: Invariant to Low.
* **Activation Class**: **On-Demand (Tier 1)** if `sensitivity != restricted`; **Restricted (Tier 2)** if `sensitivity == restricted`.
* **Required Fields**:
  * `assertion_id`: Unique identifier.
  * `claim`: Core statement, decision summary, or value assertion.
  * `evidence_type`: Provenance class (`observed`, `stated`, `inferred`).
  * `sensitivity`: Privacy tier (`public`, `internal`, `restricted`).
  * `activation`: Context routing class.
* **Optional Fields**:
  * `type`: Sub-type (`fact`, `decision_adr`, `insight`, `credential_reference`).
  * `status`: State for decisions (`proposed`, `accepted`, `superseded`).
  * `source`: Provenance link or document reference.
  * `last_verified`: Timestamp of last verification.
  * `valid_from` / `valid_to`: Temporal validity window.
* **Relations**:
  * Linked to an `ENTITY` (e.g., a decision belonging to a project).
  * May `supersede` or `be_superseded_by` another `ASSERTION`.

### 3.4 EVENT (Temporal Occurrences, Logs, & Milestones)
* **Purpose**: Captures a point-in-time or interval-bounded historical occurrence, session log, or milestone completion.
* **Lifetime**: Permanent (Append-only history).
* **Volatility**: Invariant.
* **Activation Class**: **On-Demand (Tier 1)**.
* **Required Fields**:
  * `event_id`: Unique identifier.
  * `timestamp`: ISO-8601 timestamp of occurrence.
  * `summary`: Description of the event.
  * `activation`: Context routing class.
* **Optional Fields**:
  * `type`: Event classification (`milestone`, `session_log`, `interaction`, `state_change`).
  * `impact_summary`: Outcome or significance assessment.
  * `tags`: Array of subject markers.
* **Relations**:
  * Associated with `ENTITY` or `ASSERTION`.

### 3.5 RELATION (Typed Directed Semantic Edges)
* **Purpose**: Defines a directional, typed semantic edge connecting any two fundamental primitives in the knowledge graph.
* **Lifetime**: Dynamic (Valid while relation holds).
* **Volatility**: Low to Medium.
* **Activation Class**: **On-Demand (Tier 1)**.
* **Required Fields**:
  * `relation_id`: Unique identifier.
  * `source_id`: Origin node ID (Entity, Directive, Assertion, or Event).
  * `target_id`: Target node ID.
  * `predicate`: Semantic relationship (`works_with`, `owns`, `depends_on`, `supersedes`, `governs`, `supports`).
* **Optional Fields**:
  * `valid_from` / `valid_to`: Temporal validity bounds.
  * `weight`: Strength or confidence weighting.
* **Relations**:
  * Connects any pair of fundamental primitives.

---

## 4. Entity Consolidation Mapping Matrix

| Original Domain Entity (13 Class Model) | Consolidated Refactored Primitive | Discriminant / Composition Attributes |
|---|---|---|
| **Person (Owner)** | `ENTITY` | `type: owner`, `activation: always_on` |
| **Contact & Entity** | `ENTITY` | `type: contact` or `type: organization` |
| **Project** | `ENTITY` | `type: workstream`, `status: active` |
| **Goal** | `ENTITY` | `type: objective`, `horizon: annual` |
| **Location & Environment** | `ENTITY` | `type: environment` |
| **Constraint** | `DIRECTIVE` | `enforcement: hard`, `activation: always_on` |
| **Preference (Core)** | `DIRECTIVE` | `enforcement: soft`, `activation: always_on` |
| **Preference (Domain)** | `DIRECTIVE` | `enforcement: soft`, `activation: on_demand` |
| **Habit & Routine** | `DIRECTIVE` | `enforcement: soft`, `cadence: daily/weekly` |
| **Knowledge Item** | `ASSERTION` | `type: fact`, `sensitivity: public/internal` |
| **Decision (ADR)** | `ASSERTION` | `type: decision_adr`, `status: accepted` |
| **Restricted Credential / PII** | `ASSERTION` | `type: credential_reference`, `sensitivity: restricted` |
| **Timeline Event** | `EVENT` | `type: milestone` or `type: session_log` |
| **Relationship** | `RELATION` | `predicate: <semantic_type>` |

---

## 5. Context Activation Routing Across Fundamental Primitives

```
                           PAKB PRIMITIVE GRAPH
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
     TIER 0: ALWAYS-ON       TIER 1: ON-DEMAND        TIER 2: RESTRICTED
  (Preamble ≤500 Tokens)   (Dynamic MCP Queries)     (Redacted / Vault)
           │                        │                        │
   • ENTITY (owner)         • ENTITY (workstream,    • ASSERTION
   • DIRECTIVE (hard rules    contact, environment)    (sensitivity == restricted)
     & core style)          • DIRECTIVE (domain)     • Raw Secrets / PII
                            • ASSERTION (facts/ADRs)
                            • EVENT (history)
                            • RELATION (edges)
```
