import { type PrimitiveType, generateULID } from "@aiet/domain";
import type { AnyPrimitive } from "@aiet/schema";
import {
  ActivationClass,
  AssertionStatus,
  AssertionType,
  EnforcementSeverity,
  EntityStatus,
  EntityType,
  EvidenceType,
  SensitivityTier,
  VolatilityRating,
} from "@aiet/schema";

function makeBasePrimitive(type: PrimitiveType): AnyPrimitive {
  const timestamp = "2026-08-05T12:00:00Z";
  return {
    schema_version: "1.0.0",
    id: generateULID(type),
    created_at: timestamp,
    updated_at: timestamp,
    last_verified: timestamp,
    sensitivity: SensitivityTier.PUBLIC,
    volatility: VolatilityRating.LOW,
    activation: ActivationClass.ALWAYS_ON,
  } as AnyPrimitive;
}

export function getSmallProjectFixture(): AnyPrimitive[] {
  return [
    {
      ...makeBasePrimitive("entity"),
      name: "Owner",
      type: EntityType.OWNER,
      status: EntityStatus.IDEA,
    } as AnyPrimitive,
    {
      ...makeBasePrimitive("directive"),
      statement: "Always sanitize user input.",
      enforcement: EnforcementSeverity.HARD,
      domain: "security",
    } as AnyPrimitive,
    {
      ...makeBasePrimitive("assertion"),
      claim: "Data is encrypted at rest.",
      evidence_type: EvidenceType.OBSERVED,
      type: AssertionType.FACT,
      status: AssertionStatus.PROPOSED,
    } as AnyPrimitive,
  ];
}

export function getMediumProjectFixture(): AnyPrimitive[] {
  return [
    ...getSmallProjectFixture(),
    {
      ...makeBasePrimitive("directive"),
      statement: "Validate all external API inputs.",
      enforcement: EnforcementSeverity.SOFT,
      domain: "safety",
    } as AnyPrimitive,
  ];
}

export function getLargeProjectFixture(): AnyPrimitive[] {
  return [
    ...getMediumProjectFixture(),
    {
      ...makeBasePrimitive("entity"),
      name: "Project Alpha",
      type: EntityType.WORKSTREAM,
    } as AnyPrimitive,
    {
      ...makeBasePrimitive("assertion"),
      claim: "Deployment pipeline is configured.",
      evidence_type: EvidenceType.STATED,
      type: AssertionType.FACT,
    } as AnyPrimitive,
  ];
}

export function getEdgeCaseProjectFixture(): AnyPrimitive[] {
  const fixture = getLargeProjectFixture();
  return [
    ...fixture,
    {
      ...makeBasePrimitive("directive"),
      statement: "Use exact line endings for deterministic output.",
      enforcement: EnforcementSeverity.SOFT,
      domain: "global_style",
    } as AnyPrimitive,
  ];
}
