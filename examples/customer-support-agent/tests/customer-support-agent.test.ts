import { describe, expect, it } from "vitest";
import { CustomerSupportAgent } from "../src/agent.js";

describe("Customer Support Agent Demo Suite", () => {
  it("should register customer entities, record interactions, and trap exemption proposals", async () => {
    const agent = new CustomerSupportAgent();

    const customerId = await agent.registerCustomer("Test Customer", "test@example.com", "Pro");
    expect(customerId).toMatch(/^ent_/);

    const eventId = await agent.recordInteraction(customerId, "API rate limit issue resolved");
    expect(eventId).toMatch(/^evt_/);

    const proposalId = await agent.proposeSpecialExemption(
      customerId,
      "Waive rate limit overage fee",
    );
    expect(proposalId).toBeDefined();

    const pending = await agent.aiet.governance.getPendingProposals();
    expect(pending.some((p) => p.proposal_id === proposalId)).toBe(true);
  });
});
