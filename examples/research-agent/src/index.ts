import { ResearchAgent } from "./agent.js";

export async function runResearchAgentDemo() {
  console.log("=== AIET Official Demo: Long-Running Research Agent ===");

  const agent = new ResearchAgent();

  console.log("\n1. Session 1: Research Agent records Initial Finding:");
  console.log('   Fact: "AIET memory system latency benchmark is 45ms"');
  console.log('   Source: "paper_2025_v1.pdf"');
  const fact1Id = await agent.recordFinding(
    "AIET memory system latency benchmark is 45ms",
    "paper_2025_v1.pdf",
  );

  console.log(`   -> Created Fact ID: ${fact1Id}`);

  console.log("\n2. Session 1: Saving LangGraph Thread Checkpoint...");
  await agent.saveCheckpoint("research_thread_42", 1, {
    query: "latency benchmark",
    completedSteps: ["literature_review"],
  });
  console.log("   -> Checkpoint saved to AIET Event primitive store.");

  console.log("\n3. Session 2: Research Agent discovers updated/conflicting metric:");
  console.log('   New Fact: "AIET memory system latency benchmark is 12ms under SQLite WAL mode"');

  const result = await agent.consolidateFindings(
    "AIET memory system latency benchmark is 12ms under SQLite WAL mode",
    fact1Id,
  );

  console.log(`   -> Consolidation Decision: ${result.action.toUpperCase()}`);

  const pending = await agent.aiet.governance.getPendingProposals();
  console.log(`\n4. Governance Control Layer: Pending Proposals (${pending.length}):`);
  for (const p of pending) {
    console.log(`   - Proposal ID: ${p.proposal_id}`);
    console.log(`     Reasoning: ${p.reasoning}`);
  }
}

if (process.env.NODE_ENV !== "test") {
  runResearchAgentDemo().catch(console.error);
}
