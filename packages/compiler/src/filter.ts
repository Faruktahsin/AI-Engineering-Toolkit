import {
  ActivationClass,
  type AnyPrimitive,
  AssertionStatus,
  EntityStatus,
  SensitivityTier,
} from "@aiet/schema";
import type { PipelineOptions } from "./context";

/**
 * Filters a primitive based on status, sensitivity, activation class, and temporal bounds.
 * Returns true if primitive is ACTIVE and valid for compilation; false if filtered out.
 */
export function isPrimitiveEligible(primitive: AnyPrimitive, options?: PipelineOptions): boolean {
  // 1. Filter Restricted Content (ADR-002)
  if (
    primitive.sensitivity === SensitivityTier.RESTRICTED ||
    primitive.activation === ActivationClass.RESTRICTED
  ) {
    return false;
  }

  // 2. Filter Archived / Superseded Status
  if (!options?.include_archived) {
    if ("status" in primitive && primitive.status === EntityStatus.ARCHIVED) {
      return false;
    }
  }

  if (!options?.include_superseded) {
    if ("status" in primitive && primitive.status === AssertionStatus.SUPERSEDED) {
      return false;
    }
  }

  // 3. Temporal Expiration Filter (valid_to)
  if (
    options?.cutoff_timestamp &&
    "valid_to" in primitive &&
    typeof primitive.valid_to === "string" &&
    primitive.valid_to
  ) {
    if (primitive.valid_to < options.cutoff_timestamp) {
      return false;
    }
  }

  return true;
}

/**
 * Filters an array of primitives cleanly without mutating input.
 */
export function filterPrimitives(
  primitives: readonly AnyPrimitive[],
  options?: PipelineOptions,
): readonly AnyPrimitive[] {
  return primitives.filter((prim) => isPrimitiveEligible(prim, options));
}
