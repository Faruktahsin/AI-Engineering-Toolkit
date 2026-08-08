import { generateULID, validateOrThrow } from "@aiet/domain";
import {
  ActivationClass,
  AssertionType,
  EnforcementSeverity,
  EntityType,
  EvidenceType,
  VolatilityRating,
} from "@aiet/schema";
import { classifySensitivity, isConversationalFiller } from "./classifier";
import type {
  ConversationInput,
  ExtractionResult,
  ExtractorProvider,
  MemoryCandidate,
} from "./types";

export class DeterministicExtractorProvider implements ExtractorProvider {
  public readonly name = "deterministic-rule-based-extractor";

  public async extract(input: ConversationInput): Promise<ExtractionResult> {
    const candidates: MemoryCandidate[] = [];
    let skippedTurns = 0;

    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

    for (const msg of input.messages) {
      if (isConversationalFiller(msg.content)) {
        skippedTurns++;
        continue;
      }

      const content = msg.content;
      const sensitivity = classifySensitivity(content);

      // 1. Rule / Preference Extraction -> Directive Primitive
      if (/always|never|must|do not|prefer|require/i.test(content) && msg.role === "user") {
        const candidateDirective = {
          schema_version: "1.0.0",
          id: generateULID("directive"),
          created_at: now,
          updated_at: now,
          last_verified: now,
          sensitivity,
          volatility: VolatilityRating.LOW,
          activation: ActivationClass.ALWAYS_ON,
          statement: content.trim(),
          enforcement: /never|must|do not/i.test(content)
            ? EnforcementSeverity.HARD
            : EnforcementSeverity.SOFT,
          domain: "user_preference",
        };

        validateOrThrow(candidateDirective);

        candidates.push({
          primitive_type: "directive",
          candidate: candidateDirective,
          confidence_score: 0.95,
          rationale: "Extracted explicit user behavioral preference / safety directive.",
        });
      }

      // 2. Project / Workstream Context Extraction -> Entity Primitive
      else if (/working on|building|project|workstream/i.test(content)) {
        const candidateEntity = {
          schema_version: "1.0.0",
          id: generateULID("entity"),
          created_at: now,
          updated_at: now,
          last_verified: now,
          sensitivity,
          volatility: VolatilityRating.LOW,
          activation: ActivationClass.ALWAYS_ON,
          name: content.substring(0, 100).trim(),
          type: EntityType.WORKSTREAM,
          description: content.trim(),
        };

        validateOrThrow(candidateEntity);

        candidates.push({
          primitive_type: "entity",
          candidate: candidateEntity,
          confidence_score: 0.9,
          rationale: "Extracted project / workstream context entity.",
        });
      }

      // 3. Fact / Claim Extraction -> Assertion Primitive
      else if (content.length > 15) {
        const candidateAssertion = {
          schema_version: "1.0.0",
          id: generateULID("assertion"),
          created_at: now,
          updated_at: now,
          last_verified: now,
          sensitivity,
          volatility: VolatilityRating.LOW,
          activation: ActivationClass.ALWAYS_ON,
          claim: content.trim(),
          evidence_type: EvidenceType.STATED,
          type: AssertionType.FACT,
        };

        validateOrThrow(candidateAssertion);

        candidates.push({
          primitive_type: "assertion",
          candidate: candidateAssertion,
          confidence_score: 0.85,
          rationale: "Extracted factual claim assertion.",
        });
      }
    }

    return {
      total_candidates: candidates.length,
      candidates,
      skipped_turns: skippedTurns,
    };
  }
}
