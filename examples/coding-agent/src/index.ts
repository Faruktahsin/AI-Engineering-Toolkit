import { CodingAgent } from "./agent.js";

export async function runCodingAgentDemo() {
  console.log("=== AIET Official Demo: AI Coding Assistant ===");

  const agent = new CodingAgent();

  console.log("\n1. Developer sets preference:");
  console.log('   "Use functional programming style with strict TypeScript types."');
  await agent.rememberPreference("Use functional programming style with strict TypeScript types.");

  console.log("\n2. Developer records architecture decision:");
  console.log('   "AIET SQLite database is the primary local memory store."');
  await agent.rememberArchitectureDecision(
    "AIET SQLite database is the primary local memory store.",
  );

  console.log("\n3. Developer asks a coding prompt:");
  console.log('   "Implement user authentication service"');

  const result = await agent.processPrompt("Implement user authentication service");

  console.log("\n=== Retrieved Memories for Prompt ===");
  for (const mem of result.retrievedMemories) {
    console.log(` - ${mem}`);
  }

  console.log("\n=== Compiled AGENTS.md Context ===");
  console.log(result.compiledContext);
}

if (process.env.NODE_ENV !== "test") {
  runCodingAgentDemo().catch(console.error);
}
