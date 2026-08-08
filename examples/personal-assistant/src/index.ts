import { PersonalAssistantAgent } from "./agent.js";

export async function runPersonalAssistantDemo() {
  console.log("=== AIET Official Demo: General AI Personal Assistant ===");

  const assistant = new PersonalAssistantAgent();

  console.log("\n1. OpenAI Agents SDK Function-Calling Tools Discovered:");
  const tools = Object.values(assistant.agentTools);
  for (const tool of tools) {
    console.log(`   - Tool: ${tool.function.name}: ${tool.function.description}`);
  }

  console.log("\n2. User saves preference:");
  console.log('   "I prefer morning meetings between 9 AM and 11 AM EST."');
  const prefId = await assistant.savePreference(
    "I prefer morning meetings between 9 AM and 11 AM EST.",
  );
  console.log(`   -> Created Directive ID: ${prefId}`);

  console.log("\n3. User adds task:");
  console.log('   "Prepare quarterly engineering roadmap presentation"');
  const taskId = await assistant.saveTask("Prepare quarterly engineering roadmap presentation");
  console.log(`   -> Created Task Assertion ID: ${taskId}`);

  console.log("\n4. Memory Explanation Query ('Why morning meetings?'):");
  const explanations = await assistant.explainMemory("morning meeting schedule");
  for (const exp of explanations) {
    console.log(`   - [${exp.primitive_id}] ${exp.statementOrClaim}`);
    console.log(`     Explanation: ${exp.explanation}`);
  }
}

if (process.env.NODE_ENV !== "test") {
  runPersonalAssistantDemo().catch(console.error);
}
