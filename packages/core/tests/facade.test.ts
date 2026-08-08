import {
  ActivationClass,
  AssertionType,
  EvidenceType,
  SensitivityTier,
  VolatilityRating,
} from "@aiet/schema";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type AIETClient, createAIET } from "../src/index";

describe("@aiet/core Facade SDK Integration Suite", () => {
  let aiet: AIETClient;

  beforeEach(() => {
    aiet = createAIET({
      storage: ":memory:",
      embeddings: "mock",
    });
  });

  afterEach(async () => {
    await aiet.close();
  });

  describe("1. Facade Initialization & Client Binding", () => {
    it("should instantiate AIETClient with memory, compiler, governance, and doctor clients", () => {
      expect(aiet.memory).toBeDefined();
      expect(aiet.compiler).toBeDefined();
      expect(aiet.governance).toBeDefined();
      expect(aiet.doctor).toBeDefined();
    });
  });

  describe("2. Memory Client Operations", () => {
    it("should add, search, and list memory primitives using unified facade", async () => {
      const addResult = await aiet.memory.add({
        schema_version: "1.0.0",
        id: "ast_01J4X89K9Z1A2B3C4D5E6F7G8H",
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        claim: "AIET memory facade supports hybrid RRF search",
        evidence_type: EvidenceType.STATED,
        type: AssertionType.FACT,
      });

      expect(addResult.status).toBe("inserted");
      expect(addResult.primitive_id).toBe("ast_01J4X89K9Z1A2B3C4D5E6F7G8H");

      // Search memory
      const searchRes = await aiet.memory.search("hybrid RRF search");
      expect(searchRes.results.length).toBeGreaterThan(0);

      // List memory
      const list = await aiet.memory.list();
      expect(list.length).toBeGreaterThan(0);
    });

    it("should process conversation input through extractor and decision engine", async () => {
      const result = await aiet.memory.add({
        messages: [{ role: "user", content: "Always set PostgreSQL connection string in env" }],
      });

      expect(result.status).toBeDefined();
    });
  });

  describe("3. Compiler Client Operations", () => {
    it("should compile system context preamble into target format", async () => {
      await aiet.memory.add({
        schema_version: "1.0.0",
        id: "dir_01J4X89K9Z1A2B3C4D5E6F7G8H",
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        statement: "Always format code with Biome before committing",
        enforcement: "hard" as const,
        domain: "code_style",
      });

      const compileRes = await aiet.compiler.compile({
        targetFormat: "CLAUDE.md",
        tokenBudget: 500,
      });

      expect(compileRes.content).toContain("Always format code with Biome");
      expect(compileRes.token_count).toBeGreaterThan(0);
      expect(compileRes.target_format).toBe("CLAUDE.md");
    });
  });

  describe("4. Governance Client Operations", () => {
    it("should retrieve pending proposals and audit log history", async () => {
      const pending = await aiet.governance.getPendingProposals();
      expect(Array.isArray(pending)).toBe(true);

      const auditLog = await aiet.governance.getAuditHistory();
      expect(Array.isArray(auditLog)).toBe(true);
    });
  });

  describe("5. Doctor Client Diagnostics", () => {
    it("should run diagnostics and format human-readable health report", async () => {
      const report = await aiet.doctor.diagnose({
        embeddingProvider: "mock",
        storagePath: ":memory:",
      });

      expect(report.timestamp).toBeDefined();
      expect(report.checks.length).toBeGreaterThan(0);

      const formatted = aiet.doctor.formatReport(report);
      expect(formatted).toContain("AIET Health & Diagnostics");
      expect(formatted).toContain("✓ [Node.js Environment]");
    });
  });
});
