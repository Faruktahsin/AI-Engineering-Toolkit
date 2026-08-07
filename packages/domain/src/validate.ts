import {
  type AnyPrimitive,
  PAKBErrorCode,
  PAKB_JSON_SCHEMA,
  SchemaValidationError,
} from "@aiet/schema";
import addFormats from "ajv-formats";
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020";

export interface IValidationErrorDetail {
  readonly field_path: string;
  readonly message: string;
  readonly constraint_type: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly IValidationErrorDetail[];
}

let cachedValidator: ValidateFunction | null = null;

/**
 * Creates or retrieves the compiled singleton Ajv Draft 2020-12 validator instance.
 */
export function createValidator(): ValidateFunction {
  if (cachedValidator) {
    return cachedValidator;
  }

  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    formats: {
      "date-time": true,
      "uri-reference": true,
    },
  });

  addFormats(ajv);

  cachedValidator = ajv.compile(PAKB_JSON_SCHEMA);
  return cachedValidator;
}

/**
 * Validates any payload against PAKB JSON Schema v1.0.
 * Returns a ValidationResult with boolean status and detailed error list.
 */
export function validatePrimitive(payload: unknown): ValidationResult {
  const validator = createValidator();
  const valid = validator(payload) as boolean;

  if (valid || !validator.errors) {
    return {
      valid: true,
      errors: [],
    };
  }

  const errors: IValidationErrorDetail[] = validator.errors.map((err) => ({
    field_path: err.instancePath || "/",
    message: err.message || "Schema validation error",
    constraint_type: err.keyword || "schema",
  }));

  return {
    valid: false,
    errors,
  };
}

/**
 * Validates payload against PAKB JSON Schema v1.0.
 * Returns typed AnyPrimitive if valid, or throws SchemaValidationError if invalid.
 */
export function validateOrThrow(payload: unknown): AnyPrimitive {
  const result = validatePrimitive(payload);

  if (!result.valid) {
    const primaryError = result.errors[0];
    const targetId =
      typeof payload === "object" &&
      payload !== null &&
      "id" in payload &&
      typeof (payload as { id: unknown }).id === "string"
        ? (payload as { id: string }).id
        : null;

    const errorMessage = primaryError
      ? `Schema validation failed at ${primaryError.field_path}: ${primaryError.message}`
      : "Schema validation failed";

    throw new SchemaValidationError(errorMessage, PAKBErrorCode.SCHEMA_VALIDATION_ERROR, targetId, {
      errors: result.errors,
    });
  }

  return payload as AnyPrimitive;
}
