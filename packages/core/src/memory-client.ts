import { ContradictionDetector, DuplicateDetector } from "@aiet/consolidation";
import { RuleBasedDecisionEvaluator, evaluateMemoryCandidate } from "@aiet/decision-engine";
import type { AIETEmbeddingProvider } from "@aiet/embeddings";
import {
  type ConversationInput,
  DeterministicExtractorProvider,
  type MemoryCandidate,
} from "@aiet/extractor";
import type { GovernanceManager, MemoryProposalRecord } from "@aiet/governance";
import type { AnyPrimitive } from "@aiet/schema";
import type { PAKBStorageRepository, SearchOptions } from "@aiet/storage";

export class MemoryClient {
  private readonly storage: PAKBStorageRepository;
  private readonly governance: GovernanceManager;
  private readonly embeddingProvider: AIETEmbeddingProvider;

  constructor(
    storage: PAKBStorageRepository,
    governance: GovernanceManager,
    embeddingProvider: AIETEmbeddingProvider,
  ) {
    this.storage = storage;
    this.governance = governance;
    this.embeddingProvider = embeddingProvider;
  }

  public async search(
    query: string,
    options?: SearchOptions,
  ): Promise<import("@aiet/storage").HybridSearchResult> {
    const queryEmbed = await this.embeddingProvider.embed(query);
    return this.storage.searchHybrid(query, new Float32Array(queryEmbed), options);
  }

  public async add(input: ConversationInput | MemoryCandidate | AnyPrimitive): Promise<{
    status: "inserted" | "proposed";
    primitive_id?: string;
    proposal?: MemoryProposalRecord;
  }> {
    let candidate: MemoryCandidate;

    if ("messages" in input) {
      // 1. Process conversation input
      const extractor = new DeterministicExtractorProvider();
      const extracted = await extractor.extract(input);
      if (!extracted.candidates[0]) {
        throw new Error("No memory candidates extracted from conversation input.");
      }
      candidate = extracted.candidates[0];
    } else if ("candidate" in input) {
      candidate = input;
    } else {
      let primType: "entity" | "directive" | "assertion" | "event" | "relation" = "assertion";
      if (input.id.startsWith("ent_")) primType = "entity";
      else if (input.id.startsWith("dir_")) primType = "directive";
      else if (input.id.startsWith("evt_")) primType = "event";
      else if (input.id.startsWith("rel_")) primType = "relation";

      candidate = {
        primitive_type: primType,
        candidate: input,
        confidence_score: 0.95,
        rationale: "Direct Memory Add",
      };
    }

    // 2. Evaluate Candidate Decision
    const evaluator = new RuleBasedDecisionEvaluator();
    const decision = await evaluateMemoryCandidate({ candidate }, evaluator);

    if (decision.decision === "IGNORE") {
      throw new Error(`Memory candidate rejected by decision engine: ${decision.rationale}`);
    }

    // 3. Pass through Governance Control Gate
    const proposal = await this.governance.createMemoryProposal(
      candidate,
      decision,
      "sdk_memory_client",
    );

    if (proposal.status === "auto_applied") {
      return { status: "inserted", primitive_id: candidate.candidate.id, proposal };
    }

    return { status: "proposed", proposal };
  }

  public async get(id: string): Promise<AnyPrimitive | null> {
    return this.storage.getPrimitive(id);
  }

  public async list(options?: { limit?: number; offset?: number }): Promise<
    readonly AnyPrimitive[]
  > {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    return this.storage.getPrimitives(limit, offset);
  }

  public async consolidate(): Promise<{
    duplicates: ReturnType<DuplicateDetector["findDuplicates"]>;
    contradictions: ReturnType<ContradictionDetector["findContradictions"]>;
  }> {
    const primitives = await this.storage.getPrimitives();
    const active = primitives.filter((p) => p.sensitivity !== "restricted");

    const dupDetector = new DuplicateDetector();
    const cntDetector = new ContradictionDetector();

    const duplicates = dupDetector.findDuplicates(active);
    const contradictions = cntDetector.findContradictions(active);

    return { duplicates, contradictions };
  }
}
