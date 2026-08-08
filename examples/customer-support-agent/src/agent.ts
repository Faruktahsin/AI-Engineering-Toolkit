import { createAIETMemoryProvider } from "@aiet/adapter-vercel";
import { type AIETClient, createAIET } from "@aiet/core";
import { generateULID } from "@aiet/domain";
import {
  ActivationClass,
  AssertionType,
  EntityType,
  EventType,
  EvidenceType,
  SensitivityTier,
  VolatilityRating,
} from "@aiet/schema";

export class CustomerSupportAgent {
  public aiet: AIETClient;
  public memoryProvider: ReturnType<typeof createAIETMemoryProvider>;

  constructor(aiet?: AIETClient) {
    this.aiet = aiet ?? createAIET();
    this.memoryProvider = createAIETMemoryProvider(this.aiet.storage);
  }

  public async registerCustomer(name: string, email: string, tier: string): Promise<string> {
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const id = generateULID("entity");

    await this.aiet.memory.add({
      schema_version: "1.0.0",
      id,
      created_at: now,
      updated_at: now,
      last_verified: now,
      sensitivity: SensitivityTier.RESTRICTED,
      volatility: VolatilityRating.LOW,
      activation: ActivationClass.ALWAYS_ON,
      name: `Customer: ${name}`,
      type: EntityType.ORGANIZATION,
      description: `Email: ${email}, Tier: ${tier}`,
    });

    return id;
  }

  public async recordInteraction(customerId: string, summary: string): Promise<string> {
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const id = generateULID("event");

    await this.aiet.memory.add({
      schema_version: "1.0.0",
      id,
      created_at: now,
      updated_at: now,
      last_verified: now,
      timestamp: now,
      sensitivity: SensitivityTier.RESTRICTED,
      volatility: VolatilityRating.LOW,
      activation: ActivationClass.ALWAYS_ON,
      summary: `Support ticket for ${customerId}: ${summary}`,
      type: EventType.INTERACTION,
      metadata: {
        customerId,
      },
    });

    return id;
  }

  public async proposeSpecialExemption(
    customerId: string,
    exemptionClaim: string,
  ): Promise<string> {
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const id = generateULID("assertion");

    const candidate = {
      schema_version: "1.0.0" as const,
      id,
      created_at: now,
      updated_at: now,
      last_verified: now,
      sensitivity: SensitivityTier.RESTRICTED,
      volatility: VolatilityRating.MEDIUM,
      activation: ActivationClass.ALWAYS_ON,
      claim: exemptionClaim,
      evidence_type: EvidenceType.STATED,
      type: AssertionType.FACT,
    };

    const proposal = await this.aiet.governance.createProposal(
      {
        primitive_type: "assertion",
        candidate,
        confidence_score: 0.9,
        rationale: `Customer ${customerId} requested special policy exemption: ${exemptionClaim}`,
      },
      {
        decision: "CREATE",
        importance_score: 0.9,
        confidence_score: 0.9,
        novelty_score: 0.5,
        usefulness_score: 0.9,
        rationale: `Customer ${customerId} requested special policy exemption: ${exemptionClaim}`,
      },
    );

    return proposal.proposal_id;
  }

  public async getCustomerContext(query: string): Promise<string> {
    return this.memoryProvider.getMemoryContext(query, { includeAttribution: true });
  }
}
