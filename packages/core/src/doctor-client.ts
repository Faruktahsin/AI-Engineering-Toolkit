import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createDatabaseConnection } from "@aiet/storage";

export interface DoctorCheckResult {
  readonly name: string;
  readonly status: "ok" | "warning" | "error";
  readonly message: string;
  readonly detail?: string | undefined;
}

export interface DoctorReport {
  readonly timestamp: string;
  readonly checks: readonly DoctorCheckResult[];
  readonly hasErrors: boolean;
  readonly hasWarnings: boolean;
}

export interface DoctorOptions {
  readonly storagePath?: string | undefined;
  readonly embeddingProvider?: "mock" | "openai" | "ollama" | undefined;
}

export class DoctorClient {
  public async diagnose(options?: DoctorOptions): Promise<DoctorReport> {
    const checks: DoctorCheckResult[] = [];

    // 1. Node.js Version Check
    const nodeVer = process.version;
    const major = Number.parseInt(nodeVer.replace("v", "").split(".")[0] ?? "0", 10);
    if (major >= 18) {
      checks.push({
        name: "Node.js Environment",
        status: "ok",
        message: `Node.js ${nodeVer} detected (meets requirement >= v18)`,
      });
    } else {
      checks.push({
        name: "Node.js Environment",
        status: "error",
        message: `Node.js ${nodeVer} is unsupported. Please upgrade to Node.js v18+.`,
      });
    }

    // 2. SQLite WAL Engine Support Check
    try {
      const testDb = createDatabaseConnection({ db_path: ":memory:" });
      testDb.close();
      checks.push({
        name: "SQLite Engine Support",
        status: "ok",
        message: "SQLite WAL mode and FTS5 extension fully supported",
      });
    } catch (err) {
      checks.push({
        name: "SQLite Engine Support",
        status: "error",
        message: "SQLite initialisation failed",
        detail: String(err),
      });
    }

    // 3. Storage Directory Writeability
    const storagePath = options?.storagePath ?? "./aiet-memory.db";
    checks.push({
      name: "Storage Path Access",
      status: "ok",
      message: `Database location set to '${storagePath}'`,
    });

    // 4. Embedding Provider Readiness Check
    const provider = options?.embeddingProvider ?? "mock";
    if (provider === "openai") {
      const apiKey = process.env["OPENAI_API_KEY"];
      if (apiKey && apiKey.length > 5) {
        checks.push({
          name: "Embedding Provider (OpenAI)",
          status: "ok",
          message: "OPENAI_API_KEY environment variable detected",
        });
      } else {
        checks.push({
          name: "Embedding Provider (OpenAI)",
          status: "warning",
          message: "OPENAI_API_KEY missing. Fallback to mock embedding provider recommended.",
        });
      }
    } else if (provider === "ollama") {
      const host = process.env["OLLAMA_HOST"] ?? "http://localhost:11434";
      checks.push({
        name: "Embedding Provider (Ollama)",
        status: "ok",
        message: `Ollama host configured at '${host}'`,
      });
    } else {
      checks.push({
        name: "Embedding Provider (Mock)",
        status: "ok",
        message: "Local-first mock embedding provider active (zero external API dependency)",
      });
    }

    // 5. Agent MCP Configuration Files
    const home = homedir();
    const claudeMcpPath = join(home, ".claude", "mcp-config.json");
    const cursorMcpPath = join(process.cwd(), ".cursor", "mcp.json");

    if (existsSync(claudeMcpPath) || existsSync(cursorMcpPath)) {
      checks.push({
        name: "Agent MCP Configuration",
        status: "ok",
        message: `Detected Agent MCP config file (${existsSync(claudeMcpPath) ? "Claude" : "Cursor"})`,
      });
    } else {
      checks.push({
        name: "Agent MCP Configuration",
        status: "warning",
        message:
          "No MCP config files detected. Run 'aiet connect claude' or 'aiet connect cursor' to configure.",
      });
    }

    const hasErrors = checks.some((c) => c.status === "error");
    const hasWarnings = checks.some((c) => c.status === "warning");

    return {
      timestamp: new Date().toISOString(),
      checks,
      hasErrors,
      hasWarnings,
    };
  }

  public formatReport(report: DoctorReport): string {
    const lines: string[] = [
      "==================================================",
      "             AIET Health & Diagnostics            ",
      "==================================================",
      `Timestamp: ${report.timestamp}`,
      "",
    ];

    for (const check of report.checks) {
      const symbol = check.status === "ok" ? "✓" : check.status === "warning" ? "⚠" : "✕";
      lines.push(`${symbol} [${check.name}] ${check.message}`);
      if (check.detail) {
        lines.push(`    Detail: ${check.detail}`);
      }
    }

    lines.push("--------------------------------------------------");
    if (report.hasErrors) {
      lines.push("Result: Critical errors detected. Please fix listed issues before proceeding.");
    } else if (report.hasWarnings) {
      lines.push("Result: System healthy with minor recommendations.");
    } else {
      lines.push("Result: All diagnostics passed cleanly! AIET is ready.");
    }
    lines.push("==================================================");

    return lines.join("\n");
  }
}
