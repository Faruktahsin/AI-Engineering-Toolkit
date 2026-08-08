import type { GovernanceManager } from "@aiet/governance";
import type { AuditLogRecord, MemoryProposalRecord } from "@aiet/governance";

export class GovernanceClient {
  private readonly governanceManager: GovernanceManager;

  constructor(governanceManager: GovernanceManager) {
    this.governanceManager = governanceManager;
  }

  public async getPendingProposals(): Promise<readonly MemoryProposalRecord[]> {
    return this.governanceManager.getPendingProposals();
  }

  public async approveProposal(
    proposalId: string,
    initiator = "user",
  ): Promise<MemoryProposalRecord> {
    return this.governanceManager.approveMemoryProposal(proposalId, initiator);
  }

  public async rejectProposal(
    proposalId: string,
    reason?: string,
    initiator = "user",
  ): Promise<MemoryProposalRecord> {
    return this.governanceManager.rejectMemoryProposal(proposalId, reason, initiator);
  }

  public async createProposal(
    candidate: Parameters<GovernanceManager["createMemoryProposal"]>[0],
    decision: Parameters<GovernanceManager["createMemoryProposal"]>[1],
    initiator = "user",
  ): Promise<MemoryProposalRecord> {
    return this.governanceManager.createMemoryProposal(candidate, decision, initiator);
  }

  public async getAuditHistory(): Promise<readonly AuditLogRecord[]> {
    return this.governanceManager.getAuditHistory();
  }
}
