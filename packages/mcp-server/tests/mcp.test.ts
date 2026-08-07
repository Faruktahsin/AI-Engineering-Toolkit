import { generateULID } from "@aiet/domain";
import {
  ActivationClass,
  EnforcementSeverity,
  EntityType,
  SecurityRedactionError,
  SensitivityTier,
  VolatilityRating,
} from "@aiet/schema";
import { PAKBStorageRepository } from "@aiet/storage";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PAKBMCPServer, ProposalStatus } from "../src/index";
import type { MemoryProposalInput } from "../src/staging";

describe("PAKB MCP Server Package (@aiet/mcp-server Integration Tests)", () => {
  let storage: PAKBStorageRepository;
  let server: PAKBMCPServer;

  beforeEach(async () => {
    storage = new PAKBStorageRepository({ db_path: ":memory:" });
    server = new PAKBMCPServer(storage);
  });

  afterEach(async () => {
    await server.stop();
    await storage.close();
  });

  describe("1. Resource Provider & Security Redaction", () => {
    it("should read Tier 0 preamble resource 'pakb://preamble/tier0'", async () => {
      const resource = await server.resourceProvider.readResource("pakb://preamble/tier0");
      expect(resource.uri).toBe("pakb://preamble/tier0");
      expect(resource.mimeType).toBe("text/plain");
      expect(resource.text).toContain("PAKB Tier 0 System Preamble");
    });

    it("should deny access to restricted primitives via URI read", async () => {
      const restrictedEntity = {
        schema_version: "1.0.0",
        id: generateULID("entity"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.RESTRICTED,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.RESTRICTED,
        name: "Private API Vault",
        type: EntityType.ENVIRONMENT,
      };

      await storage.insertPrimitive(restrictedEntity);

      await expect(
        server.resourceProvider.readResource(`pakb://entities/${restrictedEntity.id}`),
      ).rejects.toThrow(SecurityRedactionError);
    });
  });

  describe("2. Canonical MCP Tool Execution", () => {
    it("should execute pakb_get_primitive and return primitive payload", async () => {
      const entity = {
        schema_version: "1.0.0",
        id: generateULID("entity"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.INTERNAL,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ON_DEMAND,
        name: "AI Engineering Toolkit",
        type: EntityType.WORKSTREAM,
      };

      await storage.insertPrimitive(entity);

      const result = (await server.toolExecutor.getPrimitive({ id: entity.id })) as {
        primitive: typeof entity;
      };

      expect(result.primitive.id).toBe(entity.id);
      expect(result.primitive.name).toBe("AI Engineering Toolkit");
    });

    it("should execute pakb_propose_memory and stage memory proposal without mutating storage", async () => {
      const proposalInput: MemoryProposalInput = {
        proposal_type: "CREATE" as const,
        target_primitive_type: "directive" as const,
        payload: {
          schema_version: "1.0.0",
          id: generateULID("directive"),
          created_at: "2026-08-05T12:00:00Z",
          updated_at: "2026-08-05T12:00:00Z",
          last_verified: "2026-08-05T12:00:00Z",
          sensitivity: SensitivityTier.PUBLIC,
          volatility: VolatilityRating.LOW,
          activation: ActivationClass.ALWAYS_ON,
          statement: "Always enforce strict type checking.",
          enforcement: EnforcementSeverity.HARD,
          domain: "security",
        },
        rationale: "Proposed security rule.",
      };

      const result = (await server.toolExecutor.proposeMemory(
        proposalInput as unknown as Record<string, unknown>,
      )) as Record<string, unknown>;

      expect(result.proposal_id).toMatch(/^prop_/);
      expect(result.status).toBe(ProposalStatus.PENDING_HUMAN_REVIEW);

      // Verify that the proposed directive was NOT added to database storage
      const stored = await storage.getPrimitive(proposalInput.payload.id as string);
      expect(stored).toBeNull();
    });

    it("should compile preamble and profile token budget under <= 500 tokens cl100k_base", async () => {
      const result = (await server.toolExecutor.compilePreamble({
        target_format: "AGENTS.md",
      })) as {
        token_count: number;
        max_budget: number;
        tokenizer: string;
        content: string;
      };

      expect(result.tokenizer).toBe("cl100k_base");
      expect(result.max_budget).toBe(500);
      expect(result.token_count).toBeLessThanOrEqual(500);
      expect(result.content).toContain("# PAKB Tier 0 System Preamble");
    });
  });
});
