import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { connectAgent } from "../src/connect";
import { initializeProject } from "../src/init";
import {
  memoryApprove,
  memoryExplain,
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

      // Memory List
      const listOutput = await memoryList({ dbPath });
      expect(listOutput).toBeDefined();

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
