import { containsSecrets, generateULID, sanitizeText, validateOrThrow } from "@aiet/domain";
import { PAKBErrorCode, SecretDetectedError } from "@aiet/schema";

export enum ProposalType {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  SUPERSEDE = "SUPERSEDE",
}

export enum StagedProposalStatus {
  PENDING_HUMAN_REVIEW = "pending_human_review",
  APPROVED = "approved",
  REJECTED = "rejected",
}
export type ProposalStatus = StagedProposalStatus;
export const ProposalStatus = StagedProposalStatus;

export interface MemoryProposalInput {
  readonly proposal_type: ProposalType;
  readonly target_primitive_type: "entity" | "directive" | "assertion" | "event" | "relation";
  readonly payload: Record<string, unknown>;
  readonly rationale: string;
  readonly target_primitive_id?: string | null;
}

export interface StagedProposalRecord {
  readonly proposal_id: string;
  readonly proposal_type: ProposalType;
  readonly target_primitive_type: string;
  readonly payload: Record<string, unknown>;
  readonly rationale: string;
  readonly status: StagedProposalStatus;
  readonly sanitization_status: "clean" | "sanitized";
  readonly summary_diff: string;
  readonly created_at: string;
}

export class ProposalStagingQueue {
  private readonly proposals = new Map<string, StagedProposalRecord>();

  public proposeMemory(input: MemoryProposalInput): StagedProposalRecord {
    // 1. Secret Scanning
    const serializedPayload = JSON.stringify(input.payload);
    const secretScan = containsSecrets(serializedPayload);
    if (secretScan.detected) {
      throw new SecretDetectedError(
        `Memory proposal rejected: secret detected (${secretScan.findings[0]?.type}).`,
        PAKBErrorCode.SECRET_DETECTED_ERROR,
        null,
        { findings: secretScan.findings },
      );
    }

    // 2. Schema Validation
    const validatedPayload = validateOrThrow(input.payload);

    // 3. Zero-width character sanitization
    const sanitizedRationale = sanitizeText(input.rationale).sanitized;

    const proposalId = `prop_${generateULID("entity").replace("ent_", "")}`;
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

    const payloadObj = validatedPayload as unknown as Record<string, unknown>;
    const summaryText = String(
      payloadObj["name"] ??
        payloadObj["statement"] ??
        payloadObj["claim"] ??
        payloadObj["summary"] ??
        "Primitive",
    );

    const diffSummary = `+ [${input.target_primitive_type.toUpperCase()}] ${summaryText}`;

    const record: StagedProposalRecord = {
      proposal_id: proposalId,
      proposal_type: input.proposal_type,
      target_primitive_type: input.target_primitive_type,
      payload: payloadObj,
      rationale: sanitizedRationale,
      status: StagedProposalStatus.PENDING_HUMAN_REVIEW,
      sanitization_status: "clean",
      summary_diff: diffSummary,
      created_at: now,
    };

    this.proposals.set(proposalId, record);
    return record;
  }

  public getProposal(proposalId: string): StagedProposalRecord | null {
    return this.proposals.get(proposalId) ?? null;
  }

  public listProposals(status?: StagedProposalStatus): StagedProposalRecord[] {
    const list = Array.from(this.proposals.values());
    if (status) {
      return list.filter((p) => p.status === status);
    }
    return list;
  }
}
