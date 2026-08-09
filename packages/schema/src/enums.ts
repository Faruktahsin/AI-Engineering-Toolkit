export { AIETErrorCode, PAKBErrorCode } from "@aiet/errors";

export enum SensitivityTier {
  PUBLIC = "public",
  INTERNAL = "internal",
  RESTRICTED = "restricted",
}

export enum VolatilityRating {
  INVARIANT = "invariant",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export enum ActivationClass {
  ALWAYS_ON = "always_on",
  ON_DEMAND = "on_demand",
  RESTRICTED = "restricted",
}

export enum EvidenceType {
  OBSERVED = "observed",
  STATED = "stated",
  INFERRED = "inferred",
}

export enum EnforcementSeverity {
  HARD = "hard",
  SOFT = "soft",
}

export enum EntityType {
  OWNER = "owner",
  CONTACT = "contact",
  ORGANIZATION = "organization",
  WORKSTREAM = "workstream",
  OBJECTIVE = "objective",
  ENVIRONMENT = "environment",
}

export enum EntityStatus {
  IDEA = "idea",
  ACTIVE = "active",
  PAUSED = "paused",
  COMPLETED = "completed",
  ARCHIVED = "archived",
}

export enum AssertionType {
  FACT = "fact",
  DECISION_ADR = "decision_adr",
  INSIGHT = "insight",
  CREDENTIAL_REFERENCE = "credential_reference",
}

export enum AssertionStatus {
  PROPOSED = "proposed",
  ACCEPTED = "accepted",
  SUPERSEDED = "superseded",
}

export enum EventType {
  MILESTONE = "milestone",
  SESSION_LOG = "session_log",
  INTERACTION = "interaction",
  STATE_CHANGE = "state_change",
}

export enum CadencePattern {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  ON_EVENT = "on_event",
}

export type CorePredicate =
  | "governs"
  | "owns"
  | "depends_on"
  | "supersedes"
  | "supports"
  | "located_at"
  | "member_of";

export type ExtensionPredicate = `ext_${string}`;

export type RelationPredicate = CorePredicate | ExtensionPredicate;
