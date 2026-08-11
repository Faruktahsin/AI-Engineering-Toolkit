import { describe, expect, it } from "vitest";
import type { BudgetFitResult } from "../src/budget";
import { AgentsEmitter, ClaudeEmitter, CursorEmitter, ManifestEmitter } from "../src/emitters";
import { escapeMarkdown } from "../src/emitters/utils";
import type { RankedPrimitive } from "../src/ranking";

describe("Emitters", () => {
  describe("escapeMarkdown", () => {
    it("escapes a backslash before a backtick so it cannot bypass backtick escaping", () => {
      expect([...escapeMarkdown("\\`")]).toEqual(["\\", "\\", "\\", "`"]);
    });
  });

  const mockRankedPrimitive1: RankedPrimitive = {
    primitive: {
      id: "dir_test1",
      schema_version: "1.0.0",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      last_verified: "2024-01-01T00:00:00Z",
      sensitivity: "public",
      volatility: "low",
      activation: "always_on",
      statement: "Always escape backticks `like this` and tags <script>.",
      enforcement: "hard",
      domain: "engineering",
    },
    priority_score: 1,
    ranking_reason: "user_priority",
    tier: "tier0",
    estimated_tokens: 15,
  };

  const mockRankedPrimitive2: RankedPrimitive = {
    primitive: {
      id: "ent_test2",
      schema_version: "1.0.0",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      last_verified: "2024-01-02T00:00:00Z", // newer
      sensitivity: "public",
      volatility: "low",
      activation: "always_on",
      name: "User",
      description: "A system user",
    },
    priority_score: 1, // Same priority score
    ranking_reason: "user_priority",
    tier: "tier0",
    estimated_tokens: 10,
  };

  const mockFitResult: BudgetFitResult = {
    tier0: [mockRankedPrimitive1, mockRankedPrimitive2],
    tier1: [],
    overflow: [],
    tier0_tokens: 25,
    tier1_tokens: 0,
    overflow_tokens: 0,
    remaining_tokens: 475,
    budget: 500,
  };

  describe("AgentsEmitter", () => {
    it("should render tier0 correctly and group by primitive type in stable order", () => {
      const emitter = new AgentsEmitter();
      const result = emitter.emit(mockFitResult);
      expect(result.target).toBe("AGENTS.md");

      const entIndex = result.content.indexOf("### ENT");
      const dirIndex = result.content.indexOf("### DIR");
      const entPrimitiveIndex = result.content.indexOf(
        "- **[ENT]** (ent_test2): User: A system user",
      );
      const dirPrimitiveIndex = result.content.indexOf(
        "- **[DIR]** (dir_test1): Always escape backticks `like this` and tags <script>.",
      );
      const footerIndex = result.content.indexOf("<!-- Primitive Selection Budget:");

      expect(entIndex).toBeGreaterThan(-1);
      expect(dirIndex).toBeGreaterThan(entIndex); // ENT comes before DIR
      expect(entPrimitiveIndex).toBeGreaterThan(entIndex);
      expect(entPrimitiveIndex).toBeLessThan(dirIndex);
      expect(dirPrimitiveIndex).toBeGreaterThan(dirIndex);
      expect(footerIndex).toBeGreaterThan(dirPrimitiveIndex);
    });
  });

  describe("ClaudeEmitter", () => {
    it("should render tier0 correctly without escaping for internal markdown", () => {
      const emitter = new ClaudeEmitter();
      const result = emitter.emit(mockFitResult);
      expect(result.target).toBe("CLAUDE.md");

      const entIndex = result.content.indexOf("- **[ENT]** (ent_test2): User: A system user");
      const dirIndex = result.content.indexOf(
        "- **[DIR]** (dir_test1): Always escape backticks `like this` and tags <script>.",
      );
      const footerIndex = result.content.indexOf("<!-- Primitive Selection Budget: 25/500 -->");

      expect(entIndex).toBeGreaterThan(-1);
      expect(dirIndex).toBeGreaterThan(entIndex); // ENT before DIR
      expect(footerIndex).toBeGreaterThan(dirIndex);
    });
  });

  describe("CursorEmitter", () => {
    it("should render tier0 correctly and properly escape markdown for Cursor parsing", () => {
      const emitter = new CursorEmitter();
      const result = emitter.emit(mockFitResult);
      expect(result.target).toBe(".cursorrules");

      const entIndex = result.content.indexOf("- **[ENT]** (ent_test2): User: A system user");
      const dirIndex = result.content.indexOf(
        "- **[DIR]** (dir_test1): Always escape backticks \\`like this\\` and tags &lt;script&gt;.",
      );
      const footerIndex = result.content.indexOf("<!-- Primitive Selection Budget: 25/500 -->");

      expect(entIndex).toBeGreaterThan(-1);
      expect(dirIndex).toBeGreaterThan(entIndex); // ENT before DIR (escaped output)
      expect(footerIndex).toBeGreaterThan(dirIndex);
    });
  });

  describe("ManifestEmitter", () => {
    it("should render valid JSON manifest containing primitive selection budget metadata and deterministic hashes", () => {
      const emitter = new ManifestEmitter();
      const existingArtifacts = {
        "AGENTS.md": {
          target: "AGENTS.md",
          content: "...",
          bytes: 3,
          sha256: "abc",
          line_count: 1,
        },
      };
      const result = emitter.emit(mockFitResult, "1.0.0", existingArtifacts, "sourcehash123");
      expect(result.target).toBe("manifest.json");

      const parsed = JSON.parse(result.content);
      expect(parsed.selection_tokens_tier0).toBe(25);
      expect(parsed.selection_budget).toBe(500);
      expect(parsed._design_note).toBeDefined();
      expect(parsed.tier0_primitive_ids).toContain("dir_test1");
      expect(parsed.tier0_primitive_ids).toContain("ent_test2");
      expect(parsed.emitted_artifacts.length).toBe(1);
      expect(parsed.emitted_artifacts[0].filename).toBe("AGENTS.md");
      expect(parsed.emitted_artifacts[0].sha256).toBe("abc");
      expect(parsed.manifest_hash).toBeDefined();
      expect(parsed.source_aggregate_hash).toBe("sourcehash123");
    });
  });
});
