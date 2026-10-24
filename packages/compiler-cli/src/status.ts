import fs from "node:fs";
import homedir from "node:os";
import path from "node:path";
import { GovernanceManager } from "@aiet/governance";
import { PAKBStorageRepository } from "@aiet/storage";

export interface StatusReport {
  readonly dbPath: string;
  readonly dbConnected: boolean;
  readonly walEnabled: boolean;
  readonly totalPrimitives: number;
  readonly primitiveCounts: {
    readonly entity: number;
    readonly directive: number;
    readonly assertion: number;
    readonly event: number;
    readonly relation: number;
  };
  readonly embeddingProvider: string;
  readonly mcpConnected: boolean;
  readonly pendingProposals: number;
  readonly storageError?: string | undefined;
}

export async function getSystemStatus(options?: { dbPath?: string }): Promise<StatusReport> {
  const cwd = process.cwd();
  const defaultPath = path.join(cwd, ".aiet", "memory.db");
  const fallbackPath = path.join(cwd, "aiet-memory.db");

  let dbPath = options?.dbPath ?? defaultPath;
  if (!options?.dbPath && !fs.existsSync(dbPath) && fs.existsSync(fallbackPath)) {
    dbPath = fallbackPath;
  }

  let repo: PAKBStorageRepository | null = null;
  let dbConnected = false;
  let walEnabled = false;
  let totalPrimitives = 0;
  let storageError: string | undefined;
  const primitiveCounts = { entity: 0, directive: 0, assertion: 0, event: 0, relation: 0 };
  let pendingProposalsCount = 0;

  if (!fs.existsSync(dbPath)) {
    storageError = `Database does not exist at '${dbPath}'. Run 'aiet init' to create it.`;
  } else {
    try {
      repo = new PAKBStorageRepository({ db_path: dbPath });
      dbConnected = true;
      walEnabled = true;

      const primitives = await repo.getPrimitives(1000);
      totalPrimitives = primitives.length;

      for (const p of primitives) {
        if (p.id.startsWith("ent_")) primitiveCounts.entity++;
        else if (p.id.startsWith("dir_")) primitiveCounts.directive++;
        else if (p.id.startsWith("ast_")) primitiveCounts.assertion++;
        else if (p.id.startsWith("evt_")) primitiveCounts.event++;
        else if (p.id.startsWith("rel_")) primitiveCounts.relation++;
      }

      const gov = new GovernanceManager(repo);
      const pending = await gov.getPendingProposals();
      pendingProposalsCount = pending.length;
    } catch (err) {
      dbConnected = false;
      walEnabled = false;
      storageError = err instanceof Error ? err.message : String(err);
    } finally {
      if (repo) {
        await repo.close();
      }
    }
  }

  const home = homedir.homedir();
  const claudePath = path.join(home, ".claude", "mcp-config.json");
  const cursorPath = path.join(cwd, ".cursor", "mcp.json");
  const windsurfPath = path.join(home, ".codeium", "windsurf", "mcp_config.json");
  const mcpConnected =
    fs.existsSync(claudePath) || fs.existsSync(cursorPath) || fs.existsSync(windsurfPath);

  const provider = process.env["OPENAI_API_KEY"]
    ? "OpenAI"
    : process.env["OLLAMA_HOST"]
      ? "Ollama"
      : "Mock (Local-first)";

  return {
    dbPath,
    dbConnected,
    walEnabled,
    totalPrimitives,
    primitiveCounts,
    embeddingProvider: provider,
    mcpConnected,
    pendingProposals: pendingProposalsCount,
    ...(storageError ? { storageError } : {}),
  };
}

export function formatStatusReport(report: StatusReport): string {
  const lines: string[] = [
    "==================================================",
    "                AIET System Status                ",
    "==================================================",
    `${report.dbConnected ? "✓" : "✗"} Storage ${report.dbConnected ? "Connected" : "Not Connected"}:   ${report.dbPath}`,
    `✓ SQLite WAL Mode:     ${report.walEnabled ? "Enabled" : "Disabled"}`,
    `✓ Active Primitives:   ${report.totalPrimitives} (${report.primitiveCounts.entity} entities, ${report.primitiveCounts.directive} directives, ${report.primitiveCounts.assertion} assertions)`,
    `✓ Embedding Provider:  ${report.embeddingProvider}`,
    `✓ Agent MCP Status:    ${report.mcpConnected ? "Configuration detected" : "Not Connected"}`,
  ];

  if (report.storageError) {
    lines.push(`    Storage Error:      ${report.storageError}`);
  }

  if (report.pendingProposals > 0) {
    lines.push(
      `⚠ Pending Proposals:   ${report.pendingProposals} proposal(s) requiring governance approval`,
    );
  } else {
    lines.push("✓ Pending Proposals:   0 pending proposals");
  }

  lines.push("==================================================");
  return lines.join("\n");
}
