import { type AIETClient, createAIET } from "@aiet/core";
import { generateULID } from "@aiet/domain";
import {
  ActivationClass,
  AssertionType,
  EnforcementSeverity,
  EvidenceType,
  SensitivityTier,
  VolatilityRating,
} from "@aiet/schema";

export class CodingAgent {
  public aiet: AIETClient;

  constructor(aiet?: AIETClient) {
    this.aiet = aiet ?? createAIET();
  }

  public async rememberPreference(preference: string): Promise<string> {
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const directiveId = generateULID("directive");

    await this.aiet.memory.add({
      schema_version: "1.0.0",
      id: directiveId,
      created_at: now,
      updated_at: now,
      last_verified: now,
      sensitivity: SensitivityTier.PUBLIC,
      volatility: VolatilityRating.LOW,
      activation: ActivationClass.ALWAYS_ON,
      statement: preference,
      domain: "coding_style",
      enforcement: EnforcementSeverity.HARD,
    });

    return directiveId;
  }

  public async rememberArchitectureDecision(decision: string): Promise<string> {
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const assertionId = generateULID("assertion");

    await this.aiet.memory.add({
      schema_version: "1.0.0",
      id: assertionId,
      created_at: now,
      updated_at: now,
      last_verified: now,
      sensitivity: SensitivityTier.PUBLIC,
      volatility: VolatilityRating.LOW,
      activation: ActivationClass.ALWAYS_ON,
      claim: decision,
      evidence_type: EvidenceType.STATED,
      type: AssertionType.FACT,
    });

    return assertionId;
  }

  public async getCompiledContext(
    targetFormat: "AGENTS.md" | "CLAUDE.md" = "AGENTS.md",
  ): Promise<string> {
    const result = await this.aiet.compiler.compile({
      targetFormat,
      tokenBudget: 1000,
    });
    return result.content;
  }

  public async processPrompt(prompt: string): Promise<{
    prompt: string;
    retrievedMemories: string[];
    compiledContext: string;
  }> {
    const searchRes = await this.aiet.memory.search(prompt, { limit: 5 });

    const retrievedMemories = searchRes.results.map((m) => {
      const prim = m.primitive;
      if (prim) {
        if ("statement" in prim) return `[Directive] ${prim.statement}`;
        if ("claim" in prim) return `[Fact] ${prim.claim}`;
      }
      return m.primitive_id;
    });

    const compiledContext = await this.getCompiledContext("AGENTS.md");

    return {
      prompt,
      retrievedMemories,
      compiledContext,
    };
  }
}
