# Personal AI Knowledge Base (PAKB) — API Contracts v1.0

**Specification Title:** PAKB API Contracts v1.0  
**Status:** Frozen Normative Interface Specification  
**Publication Date:** 5 August 2026  
**Author:** Senior Software Architect  
**Language Standard:** TypeScript 5.5+ / Node.js 22+  
**Parent Specifications:** 
* `PAKB-Refactored-Domain-Model.md` (Domain Model v1.0)
* `PAKB-ADRs-v1.0.md` (Architecture Decision Records v1.0)
* `pakb-schema-v1.json` (JSON Schema v1.0)
* `PAKB-Storage-Semantics-v1.0.md` (Storage Semantics v1.0)
* `PAKB-SQLite-Storage-Architecture-v1.0.md` (SQLite Storage Architecture v1.0)
* `PAKB-MCP-Server-Architecture-v1.0.md` (MCP Server Architecture v1.0)
* `PAKB-Compiler-Architecture-v1.0.md` (Compiler Architecture v1.0)
* `PAKB-Implementation-Roadmap-v1.0.md` (Implementation Roadmap v1.0)
* `PAKB-Repository-Architecture-v1.0.md` (Repository Architecture v1.0)

---

## 1. Document Scope & Governance

This document establishes the frozen, normative TypeScript API Contracts for every public package in the PAKB monorepo. It defines types, interfaces, enums, error classes, parameters, return types, and immutability constraints.

Conforming implementations MUST implement these exact type signatures without modification.

---

## 2. Naming Conventions & Backward Compatibility Rules

1. **Naming Conventions:**
   * Interfaces MUST use `PascalCase` starting with `I` or descriptive names (`Entity`, `PAKBStorageRepository`).
   * Types MUST use `PascalCase` (`AnyPrimitive`, `PrimitiveType`).
   * Enums MUST use `PascalCase` with `UPPERCASE_SNAKE_CASE` member values.
   * Properties MUST use `lowercase_snake_case` matching JSON schema properties.
   * Methods MUST use `camelCase`.
2. **Immutability Contract:** Properties marked `readonly` MUST NOT be mutated once instantiated.
3. **Backward Compatibility:** All v1.x public interfaces MUST maintain backward compatibility. Optional fields MAY be added in minor versions, but existing fields MUST NOT be removed or renamed.

---

## 3. Core Error Classes & Custom Error Codes (`@pakb/schema`)

### 3.1 Custom Error Code Enum
```ts
export enum PAKBErrorCode {
  ID_COLLISION_ERROR = "ID_COLLISION_ERROR",
  IMMUTABLE_FIELD_VIOLATION_ERROR = "IMMUTABLE_FIELD_VIOLATION_ERROR",
  DANGLING_REFERENCE_ERROR = "DANGLING_REFERENCE_ERROR",
  CONCURRENT_MODIFICATION_ERROR = "CONCURRENT_MODIFICATION_ERROR",
  PREAMBLE_BUDGET_EXCEEDED_ERROR = "PREAMBLE_BUDGET_EXCEEDED_ERROR",
  SECURITY_REDACTION_ERROR = "SECURITY_REDACTION_ERROR",
  SCHEMA_VALIDATION_ERROR = "SCHEMA_VALIDATION_ERROR",
  SECRET_DETECTED_ERROR = "SECRET_DETECTED_ERROR",
  INVALID_ID_FORMAT_ERROR = "INVALID_ID_FORMAT_ERROR",
  PRIMITIVE_NOT_FOUND_ERROR = "PRIMITIVE_NOT_FOUND_ERROR",
  DATABASE_ACCESS_ERROR = "DATABASE_ACCESS_ERROR",
  EMITTER_FORMATTING_ERROR = "EMITTER_FORMATTING_ERROR",
  ARTIFACT_EMISSION_ERROR = "ARTIFACT_EMISSION_ERROR"
}
```

### 3.2 Base & Derived Error Classes
```ts
export class PAKBError extends Error {
  public readonly code: PAKBErrorCode;
  public readonly target_id?: string | null;
  public readonly details?: Record<string, unknown> | null;

  constructor(message: string, code: PAKBErrorCode, target_id?: string | null, details?: Record<string, unknown> | null);
}

export class IDCollisionError extends PAKBError {}
export class ImmutableFieldViolationError extends PAKBError {}
export class DanglingReferenceError extends PAKBError {}
export class ConcurrentModificationError extends PAKBError {}
export class PreambleBudgetExceededError extends PAKBError {}
export class SecurityRedactionError extends PAKBError {}
export class SchemaValidationError extends PAKBError {}
export class SecretDetectedError extends PAKBError {}
export class InvalidIDFormatError extends PAKBError {}
export class PrimitiveNotFoundError extends PAKBError {}
```

---

## 4. Primitive Types & Enums (`@pakb/schema`)

### 4.1 Primitive Enums
```ts
export enum SensitivityTier {
  PUBLIC = "public",
  INTERNAL = "internal",
  RESTRICTED = "restricted"
}

export enum VolatilityRating {
  INVARIANT = "invariant",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high"
}

export enum ActivationClass {
  ALWAYS_ON = "always_on",
  ON_DEMAND = "on_demand",
  RESTRICTED = "restricted"
}

export enum EvidenceType {
  OBSERVED = "observed",
  STATED = "stated",
  INFERRED = "inferred"
}

export enum EnforcementSeverity {
  HARD = "hard",
  SOFT = "soft"
}

export enum EntityType {
  OWNER = "owner",
  CONTACT = "contact",
  ORGANIZATION = "organization",
  WORKSTREAM = "workstream",
  OBJECTIVE = "objective",
  ENVIRONMENT = "environment"
}

export enum EntityStatus {
  IDEA = "idea",
  ACTIVE = "active",
  PAUSED = "paused",
  COMPLETED = "completed",
  ARCHIVED = "archived"
}

export enum AssertionType {
  FACT = "fact",
  DECISION_ADR = "decision_adr",
  INSIGHT = "insight",
  CREDENTIAL_REFERENCE = "credential_reference"
}

export enum AssertionStatus {
  PROPOSED = "proposed",
  ACCEPTED = "accepted",
  SUPERSEDED = "superseded"
}

export enum EventType {
  MILESTONE = "milestone",
  SESSION_LOG = "session_log",
  INTERACTION = "interaction",
  STATE_CHANGE = "state_change"
}

export enum CadencePattern {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  ON_EVENT = "on_event"
}

export type CorePredicate = "governs" | "owns" | "depends_on" | "supersedes" | "supports" | "located_at" | "member_of";
export type ExtensionPredicate = `ext_${string}`;
export type RelationPredicate = CorePredicate | ExtensionPredicate;
```

### 4.2 Common Base Primitive Interface
```ts
export interface BasePrimitive {
  readonly schema_version: string; // e.g. "1.0.0"
  readonly id: string; // Prefixed Base32 ULID
  readonly created_at: string; // ISO 8601 UTC
  readonly updated_at: string; // ISO 8601 UTC
  last_verified: string; // ISO 8601 UTC
  sensitivity: SensitivityTier;
  volatility: VolatilityRating;
  activation: ActivationClass;
  metadata?: Record<string, string | number | boolean | null> | null;
}
```

### 4.3 Primitive Interfaces
```ts
export interface Entity extends BasePrimitive {
  name: string;
  type: EntityType;
  status?: EntityStatus | null;
  locale_info?: {
    timezone?: string | null;
    language?: string | null;
    location?: string | null;
  } | null;
  description?: string | null;
}

export interface Directive extends BasePrimitive {
  statement: string;
  enforcement: EnforcementSeverity;
  domain: string;
  cadence?: CadencePattern | null;
  exemption_scope?: string | null;
  rationale?: string | null;
}

export interface Assertion extends BasePrimitive {
  claim: string;
  evidence_type: EvidenceType;
  type: AssertionType;
  status?: AssertionStatus | null;
  source?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
}

export interface Event extends BasePrimitive {
  timestamp: string; // ISO 8601 UTC
  summary: string;
  type?: EventType | null;
  impact_summary?: string | null;
  tags?: string[] | null;
}

export interface Relation extends BasePrimitive {
  readonly source_id: string; // Foreign ULID
  readonly target_id: string; // Foreign ULID
  predicate: RelationPredicate;
  valid_from?: string | null;
  valid_to?: string | null;
  weight?: number | null; // 0.0 to 1.0
}

export type AnyPrimitive = Entity | Directive | Assertion | Event | Relation;
```

---

## 5. Domain Library Contracts (`@pakb/domain`)

```ts
export interface ISanitizationResult {
  readonly sanitized: string;
  readonly secretDetected: boolean;
  readonly detectedSecretTypes: string[];
}

export interface IValidationResult {
  readonly valid: boolean;
  readonly errors: IValidationErrorDetail[];
}

export interface IValidationErrorDetail {
  readonly field_path: string;
  readonly message: string;
  readonly constraint_type: string;
}

export function generateULID(prefix: "ent" | "dir" | "ast" | "evt" | "rel"): string;
export function sanitizeText(text: string): ISanitizationResult;
export function validatePrimitive(payload: unknown): IValidationResult;
```

---

## 6. Storage Repository Contracts (`@pakb/storage`)

### 6.1 Storage Options & Query Parameters
```ts
export interface PAKBStorageOptions {
  readonly db_path: string;
  readonly read_only?: boolean;
  readonly busy_timeout_ms?: number; // Default 5000
}

export interface SearchOptions {
  readonly primitive_type?: "entity" | "directive" | "assertion" | "event" | null;
  readonly sensitivity_limit?: SensitivityTier; // Default INTERNAL
  readonly limit?: number; // Default 10, max 50
  readonly offset?: number; // Default 0
}

export interface SearchResult {
  readonly id: string;
  readonly primitive_type: string;
  readonly score: number; // BM25 rank
  readonly snippet: string;
  readonly headline_claim: string;
}

export interface SearchResponse {
  readonly total_matches: number;
  readonly limit: number;
  readonly offset: number;
  readonly results: SearchResult[];
}

export interface GraphNode {
  readonly id: string;
  readonly depth: number;
  readonly primitive: AnyPrimitive;
}

export interface GraphEdge {
  readonly id: string;
  readonly source_id: string;
  readonly target_id: string;
  readonly predicate: RelationPredicate;
}

export interface GraphResult {
  readonly seed_id: string;
  readonly max_depth: number;
  readonly nodes: GraphNode[];
  readonly edges: GraphEdge[];
}

export interface TimelineOptions {
  readonly start_time?: string | null;
  readonly end_time?: string | null;
  readonly type?: EventType | null;
  readonly limit?: number; // Default 20
  readonly offset?: number; // Default 0
}

export interface TimelineResponse {
  readonly total_count: number;
  readonly limit: number;
  readonly offset: number;
  readonly events: Event[];
}

export interface TransactionResult<T> {
  readonly success: boolean;
  readonly result?: T | null;
  readonly error?: PAKBError | null;
}
```

### 6.2 Storage Repository Interface
```ts
export interface IPAKBStorageRepository {
  calculateJCSHash(primitive: AnyPrimitive): string;
  getPrimitive(id: string): Promise<AnyPrimitive | null>;
  insertPrimitive(primitive: AnyPrimitive, options?: { autorename?: boolean }): Promise<void>;
  updatePrimitive(primitive: AnyPrimitive, expectedUpdatedAt: string): Promise<void>;
  archivePrimitive(id: string): Promise<void>;
  deletePrimitive(id: string, options?: { hard_delete?: boolean }): Promise<void>;
  searchFTS5(query: string, options?: SearchOptions): Promise<SearchResponse>;
  traverseGraph(seedId: string, maxDepth?: number, predicates?: RelationPredicate[]): Promise<GraphResult>;
  getTimeline(options?: TimelineOptions): Promise<TimelineResponse>;
  executeTransaction<T>(work: () => Promise<T>): Promise<TransactionResult<T>>;
  close(): Promise<void>;
}
```

---

## 7. MCP Server Contracts (`@pakb/mcp-server`)

### 7.1 Memory Proposal Interfaces
```ts
export enum ProposalType {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  SUPERSEDE = "SUPERSEDE"
}

export enum ProposalStatus {
  PENDING_HUMAN_REVIEW = "pending_human_review",
  APPROVED = "approved",
  REJECTED = "rejected"
}

export interface MemoryProposalInput {
  readonly proposal_type: ProposalType;
  readonly target_primitive_type: "entity" | "directive" | "assertion" | "event" | "relation";
  readonly payload: Record<string, unknown>;
  readonly rationale: string;
  readonly target_primitive_id?: string | null;
}

export interface MemoryProposalResponse {
  readonly proposal_id: string; // Prefixed prop_
  readonly status: ProposalStatus;
  readonly sanitization_status: "clean" | "sanitized";
  readonly summary_diff: string;
  readonly created_at: string;
}
```

### 7.2 MCP Server Class Interface
```ts
export interface IPAKBMCPServer {
  startStdio(): Promise<void>;
  startSSE(port: number): Promise<void>;
  stop(): Promise<void>;
}
```

---

## 8. Compiler Contracts (`@pakb/compiler`)

### 8.1 Compiler Options & Result Interfaces
```ts
export interface CompilerOptions {
  readonly target_profiles?: string[]; // e.g. ["AGENTS.md", "CLAUDE.md", ".cursorrules"]
  readonly output_dir?: string; // Default "dist"
  readonly dry_run?: boolean;
}

export interface ArtifactMetadata {
  readonly filename: string;
  readonly sha256: string;
  readonly byte_size: number;
}

export interface BuildManifest {
  readonly build_id: string; // Prefixed bld_
  readonly schema_version: string;
  readonly compiled_at: string; // ISO 8601 UTC
  readonly source_jcs_hash: string;
  readonly tokenizer: "cl100k_base";
  readonly tier0_token_count: number;
  readonly artifacts: ArtifactMetadata[];
  readonly demoted_primitives: string[];
}

export interface CompilationResult {
  readonly success: boolean;
  readonly cache_hit: boolean;
  readonly manifest: BuildManifest;
  readonly diagnostics: IDiagnosticMessage[];
}

export interface IDiagnosticMessage {
  readonly level: "info" | "warning" | "error";
  readonly message: string;
  readonly primitive_id?: string | null;
}
```

### 8.2 Compiler Class Interface
```ts
export interface IPAKBCompiler {
  compile(options?: CompilerOptions): Promise<CompilationResult>;
  profileTokens(text: string): number;
}
```

---

## 9. CLI Contracts (`@pakb/cli`)

```ts
export interface CLIInitOptions {
  readonly db_path?: string;
  readonly force?: boolean;
}

export interface CLICompileOptions {
  readonly output_dir?: string;
  readonly profile?: string;
  readonly verbose?: boolean;
}

export interface CLIProposalOptions {
  readonly status?: ProposalStatus;
}

export interface CLICommandResult {
  readonly exit_code: number; // 0 success, >0 error
  readonly message: string;
  readonly payload?: unknown;
}
```

---

## 10. Freeze Statement

**PAKB API Contracts v1.0 is the normative interface specification for all TypeScript packages in the Personal AI Knowledge Base.** The API signatures, error codes, interfaces, and immutability constraints defined in this document are frozen. All package implementations MUST conform strictly to these contracts. Any future interface modifications require a new versioned specification (e.g., API Contracts v1.1 or v2.0).
