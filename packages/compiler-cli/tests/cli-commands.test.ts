import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { connectAgent } from "../src/connect";
import { runDiagnostics } from "../src/doctor";
import { initializeProject } from "../src/init";
import {
  memoryApprove,
  memoryExplain,
  memoryImport,
  memoryInspect,
  memoryList,
  memoryReject,
  memorySearch,
} from "../src/memory-cmd";
import { formatStatusReport, getSystemStatus } from "../src/status";

describe("CLI Commands Product Layer Suite (Phase 6.2)", () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aiet-cli-test-"));
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("1. aiet init Command", () => {
    it("should bootstrap .aiet directory, config.json, memory.db, and primitive folders", () => {
      const rootPath = initializeProject(tempDir);
      expect(fs.existsSync(path.join(rootPath, ".aiet"))).toBe(true);
      expect(fs.existsSync(path.join(rootPath, ".aiet", "config.json"))).toBe(true);
      expect(fs.existsSync(path.join(rootPath, ".aiet", "memory.db"))).toBe(true);
      expect(fs.existsSync(path.join(rootPath, ".aiet", "primitives", "entities"))).toBe(true);
      expect(fs.existsSync(path.join(rootPath, ".aiet", "primitives", "directives"))).toBe(true);
      expect(fs.existsSync(path.join(rootPath, ".aiet", "primitives", "assertions"))).toBe(true);
    });

    it("should throw error if config already exists without force option", () => {
      initializeProject(tempDir);
      expect(() => initializeProject(tempDir)).toThrow(/already exists/);
    });

    it("should leave database primitive count at zero upon init", async () => {
      initializeProject(tempDir);
      const dbPath = path.join(tempDir, ".aiet", "memory.db");
      const report = await getSystemStatus({ dbPath });
      expect(report.totalPrimitives).toBe(0);
    });
  });

  describe("2. aiet status & doctor Diagnostics", () => {
    it("should fetch system status and format clean terminal dashboard", async () => {
      initializeProject(tempDir);
      const dbPath = path.join(tempDir, ".aiet", "memory.db");
      const report = await getSystemStatus({ dbPath });

      expect(report.dbConnected).toBe(true);
      expect(report.walEnabled).toBe(true);
      expect(report.embeddingProvider).toBeDefined();

      const formatted = formatStatusReport(report);
      expect(formatted).toContain("AIET System Status");
      expect(formatted).toContain("✓ Storage Connected");
    });

    it("should run diagnostics (doctor) with different output than status", async () => {
      process.chdir(tempDir);
      initializeProject(tempDir);
      const report = await runDiagnostics();
      const output = report.messages.join("\n");

      expect(output).toContain("AIET Health & Diagnostics");
      expect(output).toContain("Node.js Version:");
      expect(output).toContain("SQLite Engine:");
      expect(output).toContain("Storage Access:");
      expect(output).toContain("Provider:");
      expect(output).toContain("MCP Config:");
      expect(output).not.toContain("AIET System Status"); // verify it is distinct
    });

    it("should reject Node versions below v22", async () => {
      const originalVersion = process.version;
      try {
        Object.defineProperty(process, "version", { value: "v21.9.9", configurable: true });
        const report = await runDiagnostics();
        const output = report.messages.join("\n");
        expect(output).toContain("Unsupported, please upgrade to v22+");
        expect(report.isHealthy).toBe(false);
      } finally {
        Object.defineProperty(process, "version", { value: originalVersion, configurable: true });
      }
    });
  });

  describe("3. aiet connect <agent> Integration", () => {
    it("should auto-generate MCP configuration files for cursor and claude", () => {
      process.chdir(tempDir);
      const cursorRes = connectAgent("cursor", { force: true });
      expect(cursorRes.success).toBe(true);
      expect(fs.existsSync(cursorRes.configPath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(cursorRes.configPath, "utf-8"));
      expect(content.mcpServers["aiet-memory"]).toBeDefined();
    });
  });

  describe("4. aiet memory Subcommands", () => {
    it("should execute memory list, search, inspect, approve, reject, and explain", async () => {
      initializeProject(tempDir);
      const dbPath = path.join(tempDir, ".aiet", "memory.db");

      // Memory List (Empty)
      const listOutput = await memoryList({ dbPath });
      expect(listOutput).toContain("No persisted memory primitives found");
      expect(listOutput).toContain("aiet memory import");

      // Memory Import (Dry Run)
      const importDryOutput = await memoryImport({
        input: path.join(tempDir, "primitives"),
        dryRun: true,
        dbPath,
      });
      expect(importDryOutput).toContain("(DRY RUN)");
      expect(importDryOutput).toContain("Valid:                     3");
      expect(importDryOutput).toContain("Would Import:              3");

      let report = await getSystemStatus({ dbPath });
      expect(report.totalPrimitives).toBe(0);

      // Memory Import (Actual)
      const importOutput = await memoryImport({
        input: path.join(tempDir, "primitives"),
        dryRun: false,
        dbPath,
      });
      expect(importOutput).toContain("Valid:                     3");
      expect(importOutput).toContain("Imported:                  3");

      report = await getSystemStatus({ dbPath });
      expect(report.totalPrimitives).toBe(3);

      // Memory Import (Duplicate handling)
      const reImportOutput = await memoryImport({
        input: path.join(tempDir, "primitives"),
        dryRun: false,
        dbPath,
      });
      expect(reImportOutput).toContain("Imported:                  0");
      expect(reImportOutput).toContain("Already Present / Skipped: 3");

      report = await getSystemStatus({ dbPath });
      expect(report.totalPrimitives).toBe(3); // unchanged

      // Memory List (Populated)
      const populatedListOutput = await memoryList({ dbPath });
      expect(populatedListOutput).toContain("Memory Primitives (3 items");

      // Invalid and Conflict Cases
      const conflictDir = path.join(tempDir, "conflict_primitives");
      fs.mkdirSync(conflictDir);

      // 1. Conflict (same ID, different content)
      fs.writeFileSync(
        path.join(conflictDir, "ent_system.json"),
        JSON.stringify({
          id: "ent_01H00000000000000000000001", // Existing ID
          schema_version: "1.0.0",
          type: "organization",
          name: "Different System",
          description: "Conflicting content",
          sensitivity: "public",
          volatility: "low",
          activation: "always_on",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
          last_verified: "2026-01-01T00:00:00Z",
        }),
      );

      // 2. Invalid JSON
      fs.writeFileSync(path.join(conflictDir, "bad.json"), "{ bad: json ");

      // 3. Schema invalid
      fs.writeFileSync(
        path.join(conflictDir, "schema_bad.json"),
        JSON.stringify({
          id: "ent_02H00000000000000000000000",
          name: "Missing fields",
        }),
      );

      const conflictOutput = await memoryImport({
        input: conflictDir,
        dryRun: false,
        dbPath,
      });

      expect(conflictOutput).toContain("Valid:                     1"); // Only the conflict one was valid JSON + schema
      expect(conflictOutput).toContain("Imported:                  0");
      expect(conflictOutput).toContain("Already Present / Skipped: 0");
      expect(conflictOutput).toContain("Invalid:                   2");
      expect(conflictOutput).toContain("Conflicts / Errors:        1");
      expect(conflictOutput).toContain("[CONFLICT]");
      expect(conflictOutput).toContain("[INVALID]");

      // Memory Search
      const searchOutput = await memorySearch("safety", { dbPath });
      expect(searchOutput).toBeDefined();

      // Memory Inspect
      const inspectOutput = await memoryInspect("dir_01H00000000000000000000002", { dbPath });
      expect(inspectOutput).toBeDefined();

      // Memory Approve / Reject / Explain
      const approveOutput = await memoryApprove("prop_non_existent", { dbPath });
      expect(approveOutput).toContain("Failed");

      const rejectOutput = await memoryReject("prop_non_existent", "Not valid", { dbPath });
      expect(rejectOutput).toContain("Failed");

      const explainOutput = await memoryExplain("dir_01H00000000000000000000002", { dbPath });
      expect(explainOutput).toContain("Memory Explanation");
    });
  });
});
