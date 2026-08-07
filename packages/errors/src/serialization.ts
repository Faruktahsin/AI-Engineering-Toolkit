import { AIETError } from "./base";
import { AIETErrorCode } from "./codes";

export interface SerializedAIETError {
  readonly name: string;
  readonly message: string;
  readonly code: AIETErrorCode;
  readonly target_id: string | null;
  readonly details: Record<string, unknown> | null;
  readonly stack?: string | null;
  readonly cause?: SerializedAIETError | null;
}

/**
 * Serializes any Error or AIETError object into a plain JSON-serializable structure.
 */
export function serializeError(err: unknown): SerializedAIETError {
  if (err instanceof AIETError) {
    return {
      name: err.name,
      message: err.message,
      code: err.code,
      target_id: err.target_id,
      details: err.details,
      stack: err.stack ?? null,
      cause: err.cause ? serializeError(err.cause) : null,
    };
  }

  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      code: AIETErrorCode.INTERNAL_ERROR,
      target_id: null,
      details: null,
      stack: err.stack ?? null,
      cause: err.cause ? serializeError(err.cause) : null,
    };
  }

  return {
    name: "UnknownError",
    message: String(err),
    code: AIETErrorCode.UNKNOWN_ERROR,
    target_id: null,
    details: null,
    stack: null,
    cause: null,
  };
}

/**
 * Deserializes a SerializedAIETError structure back into a typed AIETError instance.
 */
export function deserializeError(data: SerializedAIETError): AIETError {
  const cause = data.cause ? deserializeError(data.cause) : null;
  const err = new AIETError(data.message, {
    code: data.code,
    targetId: data.target_id,
    details: data.details,
    cause,
  });
  err.name = data.name;
  return err;
}
