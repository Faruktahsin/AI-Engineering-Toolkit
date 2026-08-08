import { CustomerSupportAgent } from "./agent.js";

export async function runCustomerSupportAgentDemo() {
  console.log("=== AIET Official Demo: AI Customer Support Agent ===");

  const agent = new CustomerSupportAgent();

  console.log("\n1. Registering Customer Entity:");
  console.log('   Customer: "Acme Corp", Email: "support@acme.com", Tier: "Enterprise"');
  const customerId = await agent.registerCustomer("Acme Corp", "support@acme.com", "Enterprise");
  console.log(`   -> Registered Entity ID: ${customerId}`);

  console.log("\n2. Recording Support Interaction Event:");
  console.log('   "Customer reported 500 error on API billing endpoint during peak load."');
  const interactionId = await agent.recordInteraction(
    customerId,
    "Customer reported 500 error on API billing endpoint during peak load.",
  );
  console.log(`   -> Recorded Event ID: ${interactionId}`);

  console.log("\n3. Proposing High-Sensitivity Special Policy Exemption:");
  console.log('   "Grant 15% SLA refund credit due to billing API downtime"');
  const proposalId = await agent.proposeSpecialExemption(
    customerId,
    "Grant 15% SLA refund credit due to billing API downtime",
  );
  console.log(`   -> Governance Proposal Created (Pending Approval): ${proposalId}`);

  console.log("\n4. Retrieving Vercel AI SDK Memory Context for Agent:");
  const contextPreamble = await agent.getCustomerContext("Acme Corp billing issue");
  console.log("---------------- Injected Context Preamble ----------------");
  console.log(contextPreamble);
  console.log("----------------------------------------------------------");
}

if (process.env.NODE_ENV !== "test") {
  runCustomerSupportAgentDemo().catch(console.error);
}
