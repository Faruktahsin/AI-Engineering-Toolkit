import { createAIETCheckpointer } from "@aiet/adapter-langgraph";
import { ContradictionDetector } from "@aiet/consolidation";
import { type AIETClient, createAIET } from "@aiet/core";
import { generateULID } from "@aiet/domain";
import {
  ActivationClass,
  AssertionType,
  EvidenceType,
  SensitivityTier,
  VolatilityRating,
} from "@aiet/schema";

export class ResearchAgent {
  public aiet: AIETClient;
  public contradictionDetector: ContradictionDetector;
  public checkpointer: ReturnType<typeof createAIETCheckpointer>;

  constructor(aiet?: AIETClient) {
    this.aiet = aiet ?? createAIET();
    this.contradictionDetector = new ContradictionDetector();
    this.checkpointer = createAIETCheckpointer(this.aiet);
  }

  public async recordFinding(claim: string, source: string): Promise<string> {
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const id = generateULID("assertion");

    await this.aiet.memory.add({
      schema_version: "1.0.0",
      id,
      created_at: now,
      updated_at: now,
      last_verified: now,
      sensitivity: SensitivityTier.PUBLIC,
      volatility: VolatilityRating.LOW,
      activation: ActivationClass.ALWAYS_ON,
      claim,
      evidence_type: EvidenceType.STATED,
      type: AssertionType.FACT,
      source,
    });

    return id;
  }

  public async consolidateFindings(
    newClaim: string,
    _existingId: string,
  ): Promise<{ action: "merge" | "supersede" | "coexist" }> {
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const newId = generateULID("assertion");

    const newPrimitive = {
      schema_version: "1.0.0" as const,
      id: newId,
      created_at: now,
      updated_at: now,
      last_verified: now,
      sensitivity: SensitivityTier.PUBLIC,
      volatility: VolatilityRating.LOW,
      activation: ActivationClass.ALWAYS_ON,
      claim: newClaim,
      evidence_type: EvidenceType.STATED,
      type: AssertionType.FACT,
    };

    const searchRes = await this.aiet.memory.search(newClaim, { limit: 5 });
    const existingMatches = searchRes.results
      .map((r) => r.primitive)
      .filter((p): p is NonNullable<typeof p> => p !== undefined);

    const contradictions = this.contradictionDetector.findContradictions([
      ...existingMatches,
      newPrimitive,
    ]);

    if (contradictions.length > 0) {
      await this.aiet.memory.add(newPrimitive);
      return { action: "supersede" };
    }

    await this.aiet.memory.add(newPrimitive);
    return { action: "coexist" };
  }

  public async saveCheckpoint(
    threadId: string,
    step: number,
    state: Record<string, unknown>,
  ): Promise<void> {
    await this.checkpointer.put(threadId, step, state);
  }
}
