import { createAIETAgentTools } from "@aiet/adapter-openai-agents";
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

export class PersonalAssistantAgent {
  public aiet: AIETClient;
  public agentTools: ReturnType<typeof createAIETAgentTools>;

  constructor(aiet?: AIETClient) {
    this.aiet = aiet ?? createAIET();
    this.agentTools = createAIETAgentTools(this.aiet);
  }

  public async savePreference(preference: string): Promise<string> {
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const id = generateULID("directive");

    await this.aiet.memory.add({
      schema_version: "1.0.0",
      id,
      created_at: now,
      updated_at: now,
      last_verified: now,
      sensitivity: SensitivityTier.PUBLIC,
      volatility: VolatilityRating.LOW,
      activation: ActivationClass.ALWAYS_ON,
      statement: preference,
      domain: "general",
      enforcement: EnforcementSeverity.SOFT,
    });

    return id;
  }

  public async saveTask(task: string): Promise<string> {
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const id = generateULID("assertion");

    await this.aiet.memory.add({
      schema_version: "1.0.0",
      id,
      created_at: now,
      updated_at: now,
      last_verified: now,
      sensitivity: SensitivityTier.PUBLIC,
      volatility: VolatilityRating.HIGH,
      activation: ActivationClass.ALWAYS_ON,
      claim: `Task: ${task}`,
      evidence_type: EvidenceType.STATED,
      type: AssertionType.FACT,
    });

    return id;
  }

  public async explainMemory(query: string): Promise<
    Array<{
      primitive_id: string;
      statementOrClaim: string;
      score: number;
      explanation: string;
    }>
  > {
    const searchRes = await this.aiet.memory.search(query, { limit: 5 });

    return searchRes.results.map((r) => {
      const prim = r.primitive;
      let text = r.primitive_id;
      if (prim) {
        if ("statement" in prim) text = prim.statement;
        else if ("claim" in prim) text = prim.claim;
      }
      return {
        primitive_id: r.primitive_id,
        statementOrClaim: text,
        score: r.combined_score,
        explanation: `Retrieved via AIET Hybrid RRF Search for '${query}'. Combined BM25 + Vector Score: ${r.combined_score.toFixed(3)}.`,
      };
    });
  }
}
