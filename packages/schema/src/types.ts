import type {
  ActivationClass,
  AssertionStatus,
  AssertionType,
  CadencePattern,
  EnforcementSeverity,
  EntityStatus,
  EntityType,
  EventType,
  EvidenceType,
  RelationPredicate,
  SensitivityTier,
  VolatilityRating,
} from "./enums";

export {
  ArtifactEmissionError,
  ConcurrentModificationError,
  DanglingReferenceError,
  DatabaseAccessError,
  EmitterFormattingError,
  IDCollisionError,
  ImmutableFieldViolationError,
  InvalidIDFormatError,
  PAKBError,
  PreambleBudgetExceededError,
  PrimitiveNotFoundError,
  SchemaValidationError,
  SecretDetectedError,
  SecurityRedactionError,
} from "@aiet/errors";

export interface BasePrimitive {
  readonly schema_version: string;
  readonly id: string;
  readonly created_at: string;
  readonly updated_at: string;
  last_verified: string;
  sensitivity: SensitivityTier;
  volatility: VolatilityRating;
  activation: ActivationClass;
  metadata?: Record<string, string | number | boolean | null> | null;
}

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
  timestamp: string;
  summary: string;
  type?: EventType | null;
  impact_summary?: string | null;
  tags?: string[] | null;
}

export interface Relation extends BasePrimitive {
  readonly source_id: string;
  readonly target_id: string;
  predicate: RelationPredicate;
  valid_from?: string | null;
  valid_to?: string | null;
  weight?: number | null;
}

export type AnyPrimitive = Entity | Directive | Assertion | Event | Relation;
