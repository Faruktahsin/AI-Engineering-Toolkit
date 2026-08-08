import fs from "node:fs";
import path from "node:path";
import { PAKBStorageRepository, createDatabaseConnection } from "@aiet/core";
import type { Assertion, Directive, Entity } from "@aiet/schema";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  aietSystemMiddleware,
  buildAIETSystemPrompt,
  createAIETMemoryProvider,
  getRelevantMemoryContext,
} from "../src";

const TEST_DB_PATH = path.resolve("./scratch/test-vercel-adapter.db");

const mockEntity: Entity = {
  schema_version: "1.0.0",
  id: "ent_01J4X89K9Z1A2B3C4D5E6F7G81",
  created_at: "2026-08-08T00:00:00Z",
  updated_at: "2026-08-08T00:00:00Z",
  last_verified: "2026-08-08T00:00:00Z",
  sensitivity: "public",
  volatility: "low",
  activation: "always_on",
  name: "Vercel AI Platform",
  type: "organization",
  status: "active",
  description: "Cloud platform hosting serverless AI streams.",
};

const mockDirective: Directive = {
  schema_version: "1.0.0",
  id: "dir_01J4X89K9Z1A2B3C4D5E6F7G82",
  created_at: "2026-08-08T00:00:00Z",
  updated_at: "2026-08-08T00:00:00Z",
  last_verified: "2026-08-08T00:00:00Z",
  sensitivity: "public",
  volatility: "low",
  activation: "always_on",
  statement: "Never output unsanitized user credentials in streaming outputs.",
  enforcement: "hard",
  domain: "safety",
};

const mockAssertion: Assertion = {
  schema_version: "1.0.0",
  id: "ast_01J4X89K9Z1A2B3C4D5E6F7G83",
  created_at: "2026-08-08T00:00:00Z",
  updated_at: "2026-08-08T00:00:00Z",
  last_verified: "2026-08-08T00:00:00Z",
  sensitivity: "public",
  volatility: "low",
  activation: "always_on",
  claim: "Vercel AI SDK supports streamText with custom system prompt preambles.",
  evidence_type: "stated",
  type: "fact",
  status: "accepted",
};

describe("Vercel AI SDK Adapter (@aiet/adapter-vercel)", () => {
  let storage: PAKBStorageRepository;

  beforeEach(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    const db = createDatabaseConnection({ filename: TEST_DB_PATH });
    storage = new PAKBStorageRepository(db);

    await storage.insertPrimitive(mockEntity);
    await storage.insertPrimitive(mockDirective);
    await storage.insertPrimitive(mockAssertion);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe("Context Middleware & System Prompt Builder", () => {
    it("should build system prompt preamble from primitives under budget", () => {
      const prompt = buildAIETSystemPrompt({
        primitives: [mockEntity, mockDirective, mockAssertion],
        budget: 500,
        systemPrompt: "You are a helpful customer support agent.",
      });

      expect(prompt).toContain("Agents");
      expect(prompt).toContain("helpful customer support agent");
      expect(prompt).toBeTypeOf("string");
    });

    it("should generate system middleware function", () => {
      const middleware = aietSystemMiddleware({
        primitives: [mockEntity, mockDirective],
        budget: 300,
      });

      const result = middleware("Base prompt text");
      expect(result).toContain("Base prompt text");
    });
  });

  describe("Memory Provider & Storage Retrieval", () => {
    it("should retrieve relevant memory context using FTS5 BM25 search", async () => {
      const memoryContext = await getRelevantMemoryContext(storage, "Vercel", {
        limit: 3,
        headerTitle: "Relevant Vercel Memory",
      });

      expect(memoryContext).toContain("Relevant Vercel Memory");
      expect(memoryContext).toContain("Vercel AI Platform");
    });

    it("should return empty string when no search matches found", async () => {
      const memoryContext = await getRelevantMemoryContext(storage, "nonexistentquery123");
      expect(memoryContext).toBe("");
    });

    it("should initialize memory provider wrapper", async () => {
      const memoryProvider = createAIETMemoryProvider(storage);
      const context = await memoryProvider.getMemoryContext("streamText");

      expect(context).toContain("streamText");
      const fetchedPrimitive = await memoryProvider.getPrimitive(mockEntity.id);
      expect(fetchedPrimitive?.id).toBe(mockEntity.id);
    });
  });
});
