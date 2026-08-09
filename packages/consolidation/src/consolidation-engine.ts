import type { DecisionResult } from "@aiet/decision-engine";
import type { GovernanceManager, MemoryProposalRecord } from "@aiet/governance";
import type { AnyPrimitive } from "@aiet/schema";
import type { PAKBStorageRepository } from "@aiet/storage";
import { ulid } from "ulid";
import type { ConsolidationProposalInput } from "./types";

export interface ConsolidationProposalResult {
  readonly proposal: MemoryProposalRecord;
  readonly lineage_id: string;
}

export class ConsolidationEngine {
  private readonly storage: PAKBStorageRepository;
  private readonly governance: GovernanceManager;

  constructor(storage: PAKBStorageRepository, governance: GovernanceManager) {
    this.storage = storage;
    this.governance = governance;
  }

  public async proposeConsolidation(
    input: ConsolidationProposalInput,
  ): Promise<ConsolidationProposalResult> {
    const lineageId = `lin_${ulid().toUpperCase()}`;
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

    // 1. Record Lineage Snapshot for Rollback Safety
    await this.storage.recordLineage({
      lineage_id: lineageId,
      action_type: input.action === "COEXIST" ? "MERGE" : input.action,
      source_primitive_id: input.sourcePrimitive.id,
      target_primitive_id: input.targetPrimitiveId,
      snapshot_primitive_json: JSON.stringify(input.sourcePrimitive),
      reasoning: input.reasoning,
      created_at: now,
    });

    // 2. Build DecisionResult for Governance Gate
    const decisionResult: DecisionResult = {
      // The decision engine has no ARCHIVE operation. An archive without a target
      // is therefore staged as a creation proposal for the lineage snapshot;
      // target-bound consolidation actions retain their mutation semantics.
      decision:
        input.action === "COEXIST" || !input.targetPrimitiveId
          ? "CREATE"
          : input.action === "SUPERSEDE" || input.action === "ARCHIVE"
            ? "UPDATE"
            : "MERGE",
      target_primitive_id: input.targetPrimitiveId,
      importance_score: 0.8,
      confidence_score: input.confidence,
      novelty_score: 0.5,
      usefulness_score: 0.8,
      rationale: input.reasoning,
    };

    // 3. Create Candidate Wrapper
    const candidateWrapper = {
      primitive_type: this.getPrimitiveType(input.sourcePrimitive),
      candidate: input.sourcePrimitive,
      confidence_score: input.confidence,
      rationale: input.reasoning,
    };

    // 4. Pass mandatory Governance control gate
    const proposal = await this.governance.createMemoryProposal(
      candidateWrapper,
      decisionResult,
      "consolidation_engine",
    );

    return { proposal, lineage_id: lineageId };
  }

  public async rollbackConsolidation(lineageId: string): Promise<boolean> {
    return this.storage.rollbackLineage(lineageId);
  }

  private getPrimitiveType(
    primitive: AnyPrimitive,
  ): "entity" | "directive" | "assertion" | "event" | "relation" {
    if ("name" in primitive) return "entity";
    if ("statement" in primitive) return "directive";
    if ("claim" in primitive) return "assertion";
    if ("summary" in primitive) return "event";
    return "relation";
  }
}
