import fs from "node:fs";
import homedir from "node:os";
import path from "node:path";

export type AgentTarget = "claude" | "cursor" | "windsurf";

export interface ConnectResult {
  readonly success: boolean;
  readonly target: AgentTarget;
  readonly configPath: string;
  readonly backupCreated?: string | undefined;
  readonly message: string;
}

export function connectAgent(agent: AgentTarget, options?: { force?: boolean }): ConnectResult {
  const home = homedir.homedir();
  let targetPath = "";

  if (agent === "claude") {
    targetPath = path.join(home, ".claude", "mcp-config.json");
  } else if (agent === "cursor") {
    targetPath = path.join(process.cwd(), ".cursor", "mcp.json");
  } else if (agent === "windsurf") {
    targetPath = path.join(home, ".codeium", "windsurf", "mcp_config.json");
  } else {
    throw new Error(
      `Unsupported agent target '${String(agent)}'. Allowed targets: claude, cursor, windsurf.`,
    );
  }

  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  let existingConfig: Record<string, unknown> = { mcpServers: {} };
  let backupCreated: string | undefined;

  if (fs.existsSync(targetPath)) {
    try {
      const raw = fs.readFileSync(targetPath, "utf-8");
      existingConfig = JSON.parse(raw) as Record<string, unknown>;

      // Create backup file
      backupCreated = `${targetPath}.bak`;
      fs.writeFileSync(backupCreated, raw, "utf-8");
    } catch {
      existingConfig = { mcpServers: {} };
    }
  }

  const mcpServers = (existingConfig["mcpServers"] ?? {}) as Record<string, unknown>;

  if (mcpServers["aiet-memory"] && !options?.force) {
    return {
      success: true,
      target: agent,
      configPath: targetPath,
      message: `AIET MCP server is already connected in '${targetPath}'. Use --force to re-configure.`,
    };
  }

  mcpServers["aiet-memory"] = {
    command: "npx",
    args: ["-y", "@aiet/mcp-server"],
  };

  existingConfig["mcpServers"] = mcpServers;

  fs.writeFileSync(targetPath, JSON.stringify(existingConfig, null, 2), "utf-8");

  return {
    success: true,
    target: agent,
    configPath: targetPath,
    backupCreated,
    message: `Successfully connected AIET MCP server to ${agent} ('${targetPath}').`,
  };
}
