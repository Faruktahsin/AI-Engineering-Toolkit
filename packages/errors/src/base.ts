import { AIETErrorCode } from "./codes";

export interface AIETErrorOptions {
  readonly code?: AIETErrorCode;
  readonly targetId?: string | null;
  readonly details?: Record<string, unknown> | null;
  readonly cause?: Error | null;
}

export class AIETError extends Error {
  public readonly code: AIETErrorCode;
  public readonly target_id: string | null;
  public readonly details: Record<string, unknown> | null;
  public override readonly cause: Error | null;

  constructor(message: string, options?: AIETErrorOptions) {
    super(message);
    this.name = this.constructor.name;
    this.code = options?.code ?? AIETErrorCode.INTERNAL_ERROR;
    this.target_id = options?.targetId ?? null;
    this.details = options?.details ?? null;
    this.cause = options?.cause ?? null;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Preserved PAKB Error class for backwards compatibility.
 */
export class PAKBError extends AIETError {
  constructor(
    message: string,
    code: AIETErrorCode = AIETErrorCode.INTERNAL_ERROR,
    targetId: string | null = null,
    details: Record<string, unknown> | null = null,
  ) {
    super(message, { code, targetId, details });
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
