import fs from "node:fs";
import homedir from "node:os";
import path from "node:path";
import { createDatabaseConnection } from "@aiet/storage";

export interface DoctorReport {
  readonly isHealthy: boolean;
  readonly messages: string[];
}

export async function runDiagnostics(): Promise<DoctorReport> {
  const messages: string[] = [];
  let isHealthy = true;
  let hasWarnings = false;

  messages.push("==================================================");
  messages.push("            AIET Health & Diagnostics             ");
  messages.push("==================================================");
  messages.push("");

  // 1. Node.js Environment
  messages.push("1. Environment Checks");
  const nodeVersion = process.version;
  const major = Number.parseInt(nodeVersion.replace("v", "").split(".")[0] || "0", 10);
  if (major >= 22) {
    messages.push(`   ✓ Node.js Version: ${nodeVersion} (Supported)`);
  } else {
    messages.push(`   ✗ Node.js Version: ${nodeVersion} (Unsupported, please upgrade to v22+)`);
    isHealthy = false;
  }

  // 2. Storage & SQLite
  messages.push("");
  messages.push("2. Storage & SQLite Engine");
  try {
    const testDb = createDatabaseConnection({ db_path: ":memory:" });
    testDb.exec("CREATE VIRTUAL TABLE fts_test USING fts5(content);");
    testDb.close();
    messages.push("   ✓ SQLite Engine:  Available (better-sqlite3)");
    messages.push("   ✓ FTS5 Extension: Enabled");
  } catch (err) {
    messages.push(
      `   ✗ SQLite Engine:  Failed (${err instanceof Error ? err.message : String(err)})`,
    );
    isHealthy = false;
  }

  const cwd = process.cwd();
  const defaultPath = path.join(cwd, ".aiet", "memory.db");
  const aietDir = path.dirname(defaultPath);

  if (fs.existsSync(aietDir)) {
    try {
      fs.accessSync(aietDir, fs.constants.R_OK | fs.constants.W_OK);
      messages.push(`   ✓ Storage Access: Read/Write permitted on '${aietDir}'`);
    } catch {
      messages.push(`   ✗ Storage Access: Permission denied on '${aietDir}'`);
      isHealthy = false;
    }
  } else {
    messages.push(`   ⚠ Storage Access: '${aietDir}' does not exist (Run 'aiet init')`);
    hasWarnings = true;
  }

  // 3. Embedding Providers
  messages.push("");
  messages.push("3. Embedding Providers");
  if (process.env["OPENAI_API_KEY"]) {
    messages.push("   ✓ Provider:       OpenAI (API Key detected)");
  } else if (process.env["OLLAMA_HOST"]) {
    messages.push("   ✓ Provider:       Ollama (Host detected)");
  } else {
    messages.push("   i Provider:       Mock Local-first (No external API keys detected)");
  }

  // 4. MCP Configuration
  messages.push("");
  messages.push("4. MCP Integration");
  const home = homedir.homedir();
  const claudePath = path.join(home, ".claude", "mcp-config.json");
  const cursorPath = path.join(cwd, ".cursor", "mcp.json");

  const mcpAvailable = fs.existsSync(claudePath) || fs.existsSync(cursorPath);
  if (mcpAvailable) {
    messages.push("   ✓ MCP Config:     Detected (Claude/Cursor integration active)");
  } else {
    messages.push(
      "   i MCP Config:     Not connected (Run 'aiet connect claude' or 'aiet connect cursor')",
    );
  }

  // Final Summary
  messages.push("");
  messages.push("==================================================");
  if (!isHealthy) {
    messages.push("Status: ERRORS DETECTED (See above)");
  } else if (hasWarnings) {
    messages.push("Status: READY WITH WARNINGS");
  } else {
    messages.push("Status: READY (All checks passed)");
  }
  messages.push("==================================================");

  return {
    isHealthy,
    messages,
  };
}
