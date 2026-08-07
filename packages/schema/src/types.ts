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
  PAKBErrorCode,
  RelationPredicate,
  SensitivityTier,
  VolatilityRating,
} from "./enums";

export class PAKBError extends Error {
  public readonly code: PAKBErrorCode;
  public readonly target_id?: string | null;
  public readonly details?: Record<string, unknown> | null;

  constructor(
    message: string,
    code: PAKBErrorCode,
    target_id?: string | null,
    details?: Record<string, unknown> | null,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.target_id = target_id ?? null;
    this.details = details ?? null;
    Object.setPrototypeOf(this, new.target.prototype);
  }
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
export class DatabaseAccessError extends PAKBError {}
export class EmitterFormattingError extends PAKBError {}
export class ArtifactEmissionError extends PAKBError {}

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
