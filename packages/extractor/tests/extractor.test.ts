import { SensitivityTier } from "@aiet/schema";
import { describe, expect, it, vi } from "vitest";
import {
  DeterministicExtractorProvider,
  LLMExtractorProvider,
  classifySensitivity,
  isConversationalFiller,
} from "../src/index";

describe("@aiet/extractor Integration Suite", () => {
  describe("1. Conversational Filler Detection", () => {
    it("should identify conversational filler messages", () => {
      expect(isConversationalFiller("thanks")).toBe(true);
      expect(isConversationalFiller("Thank you!")).toBe(true);
      expect(isConversationalFiller("ok")).toBe(true);
      expect(isConversationalFiller("cool")).toBe(true);
      expect(isConversationalFiller("can you hear me?")).toBe(true);
    });

    it("should not mark substantive messages as filler", () => {
      expect(isConversationalFiller("Always use TypeScript for new packages.")).toBe(false);
      expect(isConversationalFiller("Working on AI Engineering Toolkit.")).toBe(false);
    });
  });

  describe("2. Sensitivity Classification", () => {
    it("should classify API keys and credentials as RESTRICTED sensitivity", () => {
      expect(classifySensitivity("Use sk-abcdef12345678901234567890 for API calls")).toBe(
        SensitivityTier.RESTRICTED,
      );
      expect(classifySensitivity("password: MySuperSecretPassword123")).toBe(
        SensitivityTier.RESTRICTED,
      );
    });

    it("should classify standard text as PUBLIC sensitivity", () => {
      expect(classifySensitivity("Always use clean architecture.")).toBe(SensitivityTier.PUBLIC);
    });
  });

  describe("3. Deterministic Extraction Provider", () => {
    it("should extract user behavioral preference as a Directive primitive", async () => {
      const extractor = new DeterministicExtractorProvider();
      const result = await extractor.extract({
        messages: [{ role: "user", content: "Always use TypeScript and never use Tailwind CSS." }],
      });

      expect(result.total_candidates).toBe(1);
      expect(result.candidates[0]?.primitive_type).toBe("directive");
      expect(result.candidates[0]?.candidate.sensitivity).toBe(SensitivityTier.PUBLIC);
    });

    it("should extract project workstream context as an Entity primitive", async () => {
      const extractor = new DeterministicExtractorProvider();
      const result = await extractor.extract({
        messages: [
          { role: "user", content: "We are currently working on AI Engineering Toolkit." },
        ],
      });

      expect(result.total_candidates).toBe(1);
      expect(result.candidates[0]?.primitive_type).toBe("entity");
    });

    it("should reject conversational filler turns", async () => {
      const extractor = new DeterministicExtractorProvider();
      const result = await extractor.extract({
        messages: [
          { role: "user", content: "thanks" },
          { role: "user", content: "okay cool" },
        ],
      });

      expect(result.total_candidates).toBe(0);
      expect(result.skipped_turns).toBe(2);
    });

    it("should auto-classify sensitive keys as RESTRICTED in extracted primitives", async () => {
      const extractor = new DeterministicExtractorProvider();
      const result = await extractor.extract({
        messages: [{ role: "user", content: "Always set sk-1234567890123456789012345 in .env" }],
      });

      expect(result.total_candidates).toBe(1);
      expect(result.candidates[0]?.candidate.sensitivity).toBe(SensitivityTier.RESTRICTED);
    });
  });

  describe("4. Provider-Agnostic LLM Extractor Wrapper", () => {
    it("should call custom LLM completion function and validate returned JSON primitives", async () => {
      const mockLLMFn = vi.fn().mockResolvedValue(`
        [
          {
            "primitive_type": "assertion",
            "candidate": {
              "schema_version": "1.0.0",
              "sensitivity": "public",
              "volatility": "low",
              "activation": "always_on",
              "claim": "Vercel AI SDK supports streaming preambles.",
              "evidence_type": "stated",
              "type": "fact"
            },
            "confidence_score": 0.95,
            "rationale": "Extracted factual assertion from user statement."
          }
        ]
      `);

      const extractor = new LLMExtractorProvider({ llmCompletionFn: mockLLMFn });
      const result = await extractor.extract({
        messages: [{ role: "user", content: "Vercel AI SDK supports streaming preambles." }],
      });

      expect(mockLLMFn).toHaveBeenCalled();
      expect(result.total_candidates).toBe(1);
      expect(result.candidates[0]?.primitive_type).toBe("assertion");
    });
  });
});
