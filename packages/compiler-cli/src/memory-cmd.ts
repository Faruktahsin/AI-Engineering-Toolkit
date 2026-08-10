import fs from "node:fs";
import path from "node:path";
import { validateOrThrow } from "@aiet/domain";
import { GovernanceManager } from "@aiet/governance";
import { PAKBStorageRepository } from "@aiet/storage";

function resolveDbPath(optionsPath?: string): string {
  const cwd = process.cwd();
  const defaultPath = path.join(cwd, ".aiet", "memory.db");
  const fallbackPath = path.join(cwd, "aiet-memory.db");

  if (optionsPath) return optionsPath;
  if (fs.existsSync(defaultPath)) return defaultPath;
  if (fs.existsSync(fallbackPath)) return fallbackPath;
  return ":memory:";
}

export async function memoryList(options?: {
  limit?: number;
  type?: string;
  dbPath?: string;
}): Promise<string> {
  const dbPath = resolveDbPath(options?.dbPath);
  const repo = new PAKBStorageRepository({ db_path: dbPath });

  try {
    const primitives = await repo.getPrimitives(options?.limit ?? 50);
    const filtered = options?.type
      ? primitives.filter((p) => p.id.startsWith(`${options.type}_`))
      : primitives;

    if (filtered.length === 0) {
      return "No persisted memory primitives found.\nSample source primitives may exist in ./primitives.\nRun 'aiet memory import --dry-run' to preview them, then 'aiet memory import' to store validated primitives.";
    }

    const lines: string[] = [
      `Memory Primitives (${filtered.length} items, DB: '${dbPath}')`,
      "--------------------------------------------------",
    ];

    for (const p of filtered) {
      const typeStr = p.id.split("_")[0]?.toUpperCase() ?? "PRIM";
      let summary = p.id;
      if ("statement" in p) summary = p.statement;
      else if ("claim" in p) summary = p.claim;
      else if ("name" in p) summary = p.name;
      else if ("summary" in p) summary = p.summary;

      lines.push(`[${typeStr}] ${p.id} - ${summary.substring(0, 60)} (${p.sensitivity})`);
    }

    return lines.join("\n");
  } finally {
    await repo.close();
  }
}

export async function memoryImport(options?: {
  input?: string;
  dryRun?: boolean;
  dbPath?: string;
}): Promise<string> {
  const cwd = process.cwd();
  const inputDir = options?.input ? path.resolve(cwd, options.input) : path.join(cwd, "primitives");

  if (!fs.existsSync(inputDir)) {
    return `[ERROR] Input directory '${inputDir}' does not exist.`;
  }

  const dbPath = resolveDbPath(options?.dbPath);
  const repo = new PAKBStorageRepository({ db_path: dbPath });

  const files: string[] = [];
  function walkDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    const list = fs.readdirSync(dir).sort();
    for (const file of list) {
      const fileA = path.join(dir, file);
      const stat = fs.statSync(fileA);
      if (stat?.isDirectory()) walkDir(fileA);
      else if (fileA.endsWith(".json")) files.push(fileA);
    }
  }

  try {
    walkDir(inputDir);
    let valid = 0;
    let imported = 0;
    let skipped = 0;
    let invalid = 0;
    let conflicts = 0;
    const errors: string[] = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, "utf8");
        const json = JSON.parse(content);
        const validated = validateOrThrow(json);
        valid++;

        const existing = await repo.getPrimitive(validated.id);
        if (existing) {
          const existingHash = repo.calculateJCSHash(existing);
          const incomingHash = repo.calculateJCSHash(validated);
          if (existingHash === incomingHash) {
            skipped++;
            continue;
          }
          conflicts++;
          errors.push(
            `[CONFLICT] ${path.basename(file)}: primitive ID '${validated.id}' already exists with different content`,
          );
          continue;
        }

        if (!options?.dryRun) {
          try {
            await repo.insertPrimitive(validated);
            imported++;
          } catch (e) {
            // Collision or DB error
            conflicts++;
            errors.push(
              `[ERROR] ${path.basename(file)}: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        } else {
          imported++;
        }
      } catch (err) {
        invalid++;
        errors.push(
          `[INVALID] ${path.basename(file)}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const lines = [
      "==================================================",
      options?.dryRun
        ? "            Memory Import (DRY RUN)               "
        : "               Memory Import Result               ",
      "==================================================",
      `Scanned Directory:         ${inputDir}`,
      `Files Found:               ${files.length}`,
      `Valid:                     ${valid}`,
      options?.dryRun
        ? `Would Import:              ${imported}`
        : `Imported:                  ${imported}`,
      `Already Present / Skipped: ${skipped}`,
      `Invalid:                   ${invalid}`,
      `Conflicts / Errors:        ${conflicts}`,
      "--------------------------------------------------",
    ];

    if (errors.length > 0) {
      lines.push(...errors);
    }

    return lines.join("\n");
  } finally {
    await repo.close();
  }
}

export async function memorySearch(
  query: string,
  options?: { limit?: number; dbPath?: string },
): Promise<string> {
  const dbPath = resolveDbPath(options?.dbPath);
  const repo = new PAKBStorageRepository({ db_path: dbPath });

  try {
    const searchRes = await repo.searchFTS5(query, { limit: options?.limit ?? 10 });
    if (searchRes.results.length === 0) {
      return `No memory matches found for query '${query}'.`;
    }

    const lines: string[] = [
      `Hybrid Search Results for '${query}' (${searchRes.results.length} matches)`,
      "--------------------------------------------------",
    ];

    for (const match of searchRes.results) {
      lines.push(`[Score: ${match.score.toFixed(3)}] ${match.id} - ${match.snippet}`);
    }

    return lines.join("\n");
  } finally {
    await repo.close();
  }
}

export async function memoryInspect(id: string, options?: { dbPath?: string }): Promise<string> {
  const dbPath = resolveDbPath(options?.dbPath);
  const repo = new PAKBStorageRepository({ db_path: dbPath });

  try {
    const primitive = await repo.getPrimitive(id);
    if (!primitive) {
      return `Primitive '${id}' not found in storage.`;
    }

    return JSON.stringify(primitive, null, 2);
  } finally {
    await repo.close();
  }
}

export async function memoryApprove(id: string, options?: { dbPath?: string }): Promise<string> {
  const dbPath = resolveDbPath(options?.dbPath);
  const repo = new PAKBStorageRepository({ db_path: dbPath });
  const gov = new GovernanceManager(repo);

  try {
    const approved = await gov.approveMemoryProposal(id, "cli_user");
    return `[SUCCESS] Memory proposal '${id}' approved and applied to database. Status: ${approved.status}.`;
  } catch (err) {
    return `[ERROR] Failed to approve memory proposal '${id}': ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    await repo.close();
  }
}

export async function memoryReject(
  id: string,
  reason?: string,
  options?: { dbPath?: string },
): Promise<string> {
  const dbPath = resolveDbPath(options?.dbPath);
  const repo = new PAKBStorageRepository({ db_path: dbPath });
  const gov = new GovernanceManager(repo);

  try {
    const rejected = await gov.rejectMemoryProposal(id, reason, "cli_user");
    return `[SUCCESS] Memory proposal '${id}' rejected. Status: ${rejected.status}.`;
  } catch (err) {
    return `[ERROR] Failed to reject memory proposal '${id}': ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    await repo.close();
  }
}

export async function memoryExplain(id: string, options?: { dbPath?: string }): Promise<string> {
  const dbPath = resolveDbPath(options?.dbPath);
  const repo = new PAKBStorageRepository({ db_path: dbPath });
  const gov = new GovernanceManager(repo);

  try {
    const primitive = await repo.getPrimitive(id);
    const auditLogs = await gov.getAuditHistory();

    const relatedAudits = auditLogs.filter((log) => log.primitive_id === id);

    const lines: string[] = [
      "==================================================",
      `             Memory Explanation: ${id}            `,
      "==================================================",
    ];

    if (primitive) {
      lines.push(`Primitive Class: ${primitive.id.split("_")[0]?.toUpperCase()}`);
      lines.push(`Sensitivity:     ${primitive.sensitivity}`);
      lines.push(`Volatility:      ${primitive.volatility}`);
      lines.push(`Created At:      ${primitive.created_at}`);
    } else {
      lines.push("Primitive Status: Staged or Non-Existent");
    }

    lines.push("");
    lines.push("Audit Lineage & Decision Trail:");
    if (relatedAudits.length === 0) {
      lines.push("  - Direct memory creation or automatic initialization.");
    } else {
      for (const log of relatedAudits) {
        lines.push(
          `  - [${log.timestamp}] Operation '${log.operation_type}' by '${log.initiator}' (Hash: ${log.new_jcs_hash.substring(0, 16)}...)`,
        );
      }
    }

    lines.push("==================================================");
    return lines.join("\n");
  } finally {
    await repo.close();
  }
}
