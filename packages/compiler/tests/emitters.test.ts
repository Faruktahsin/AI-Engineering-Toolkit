import { describe, expect, it } from "vitest";
import type { BudgetFitResult } from "../src/budget";
import { AgentsEmitter, ClaudeEmitter, CursorEmitter, ManifestEmitter } from "../src/emitters";
import type { RankedPrimitive } from "../src/ranking";

describe("Emitters", () => {
  const mockRankedPrimitive: RankedPrimitive = {
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

  const mockFitResult: BudgetFitResult = {
    tier0: [mockRankedPrimitive],
    tier1: [],
    overflow: [],
    tier0_tokens: 15,
    tier1_tokens: 0,
    overflow_tokens: 0,
    remaining_tokens: 485,
    budget: 500,
  };

  describe("AgentsEmitter", () => {
    it("should render tier0 correctly and group by primitive type", () => {
      const emitter = new AgentsEmitter();
      const result = emitter.emit(mockFitResult);
      expect(result.target).toBe("AGENTS.md");
      expect(result.content).toContain("# Agents Artifact");
      expect(result.content).toContain("## Core Directives & Context (Tier 0)");
      expect(result.content).toContain("### DIR");
      expect(result.content).toContain(
        "- **[DIR]** (dir_test1): Always escape backticks `like this` and tags <script>.",
      );
      expect(result.content).toContain("<!-- Token Budget: Tier 0: 15/500 | Tier 1: 0 -->");
    });
  });

  describe("ClaudeEmitter", () => {
    it("should render tier0 correctly without escaping for internal markdown", () => {
      const emitter = new ClaudeEmitter();
      const result = emitter.emit(mockFitResult);
      expect(result.target).toBe("CLAUDE.md");
      expect(result.content).toContain("# Claude Configuration");
      expect(result.content).toContain(
        "- **[DIR]** (dir_test1): Always escape backticks `like this` and tags <script>.",
      );
      expect(result.content).toContain("<!-- AIET Budget: 15/500 -->");
    });
  });

  describe("CursorEmitter", () => {
    it("should render tier0 correctly and properly escape markdown for Cursor parsing", () => {
      const emitter = new CursorEmitter();
      const result = emitter.emit(mockFitResult);
      expect(result.target).toBe(".cursorrules");
      expect(result.content).toContain("# Cursor Rules");
      expect(result.content).toContain(
        "- **[DIR]** (dir_test1): Always escape backticks \\`like this\\` and tags &lt;script&gt;.",
      );
      expect(result.content).toContain("<!-- AIET Budget: 15/500 -->");
    });
  });

  describe("ManifestEmitter", () => {
    it("should render valid JSON manifest containing exact token usages and deterministic hashes", () => {
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
      const result = emitter.emit(mockFitResult, "1.0.0", existingArtifacts);
      expect(result.target).toBe("manifest.json");

      const parsed = JSON.parse(result.content);
      expect(parsed.total_token_usage).toBe(15);
      expect(parsed.tier0_budget).toBe(500);
      expect(parsed.tier0_primitive_ids).toContain("dir_test1");
      expect(parsed.emitted_artifacts.length).toBe(1);
      expect(parsed.emitted_artifacts[0].filename).toBe("AGENTS.md");
      expect(parsed.emitted_artifacts[0].sha256).toBe("abc");
      expect(parsed.manifest_hash).toBeDefined();
    });
  });
});
