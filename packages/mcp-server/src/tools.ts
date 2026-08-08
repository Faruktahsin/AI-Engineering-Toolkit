import {
  ActivationClass,
  InvalidIDFormatError,
  PAKBErrorCode,
  PrimitiveNotFoundError,
  SchemaValidationError,
  SecurityRedactionError,
  SensitivityTier,
} from "@aiet/schema";
import type { PAKBStorageRepository, SearchOptions, TimelineOptions } from "@aiet/storage";
import { get_encoding } from "tiktoken";
import type { MemoryProposalInput, ProposalStagingQueue } from "./staging";

import { GovernanceManager } from "@aiet/governance";

export class PAKBToolExecutor {
  private readonly governance: GovernanceManager;

  constructor(
    private readonly storage: PAKBStorageRepository,
    private readonly stagingQueue: ProposalStagingQueue,
  ) {
    this.governance = new GovernanceManager(storage);
  }

  public async getPrimitive(args: unknown) {
    const id =
      typeof args === "object" && args && "id" in args
        ? (args as Record<string, unknown>)["id"]
        : undefined;
    if (typeof id !== "string") {
      throw new InvalidIDFormatError(
        "Invalid primitive id.",
        PAKBErrorCode.INVALID_ID_FORMAT_ERROR,
      );
    }

    const primitive = await this.storage.getPrimitive(id);
    if (!primitive) {
      throw new PrimitiveNotFoundError(
        `Primitive '${id}' not found.`,
        PAKBErrorCode.PRIMITIVE_NOT_FOUND_ERROR,
        id,
      );
    }

    if (
      primitive.sensitivity === SensitivityTier.RESTRICTED ||
      primitive.activation === ActivationClass.RESTRICTED
    ) {
      throw new SecurityRedactionError(
        `Access to restricted primitive '${id}' is denied.`,
        PAKBErrorCode.SECURITY_REDACTION_ERROR,
        id,
      );
    }

    return {
      primitive,
      attribution: {
        confidence_score: 0.95,
        sensitivity: primitive.sensitivity,
        volatility: primitive.volatility,
        selection_rationale: `Direct ULID fetch for primitive '${id}'.`,
      },
    };
  }

  public async search(args: unknown) {
    const query =
      typeof args === "object" && args && "query" in args
        ? (args as Record<string, unknown>)["query"]
        : undefined;
    if (typeof query !== "string") {
      throw new SchemaValidationError(
        "Search query must be a string.",
        PAKBErrorCode.SCHEMA_VALIDATION_ERROR,
      );
    }

    const primitive_type =
      typeof args === "object" && args && "primitive_type" in args
        ? (args as Record<string, unknown>)["primitive_type"]
        : undefined;
    const limit =
      typeof args === "object" && args && "limit" in args
        ? Number((args as Record<string, unknown>)["limit"])
        : 10;
    const offset =
      typeof args === "object" && args && "offset" in args
        ? Number((args as Record<string, unknown>)["offset"])
        : 0;

    const validatedPrimitiveType =
      typeof primitive_type === "string" &&
      ["entity", "directive", "assertion", "event"].includes(primitive_type)
        ? (primitive_type as "entity" | "directive" | "assertion" | "event")
        : null;

    const searchOpts: SearchOptions = {
      primitive_type: validatedPrimitiveType,
      limit,
      offset,
    };

    const searchRes = await this.storage.searchFTS5(query, searchOpts);
    const enrichedResults = searchRes.results.map((item) => ({
      ...item,
      attribution: {
        confidence_score: Number((0.85 + Math.min(item.score / 10, 0.14)).toFixed(2)),
        sensitivity: "public",
        selection_rationale: `Matched query '${query}' via SQLite FTS5 BM25 hybrid ranking score ${item.score.toFixed(3)}.`,
      },
    }));

    return {
      results: enrichedResults,
      total_matches: searchRes.total_matches,
      limit: searchRes.limit,
      offset: searchRes.offset,
    };
  }

  public async traverseGraph(args: unknown) {
    if (typeof args !== "object" || args === null || !("seed_id" in args)) {
      throw new SchemaValidationError(
        "Invalid traverseGraph arguments.",
        PAKBErrorCode.SCHEMA_VALIDATION_ERROR,
      );
    }
    const params = args as Record<string, unknown>;
    const seed_id =
      typeof params["seed_id"] === "string" ? (params["seed_id"] as string) : undefined;
    const max_depth = typeof params["max_depth"] === "number" ? (params["max_depth"] as number) : 3;
    const predicates = Array.isArray(params["predicates"])
      ? (params["predicates"] as unknown[]).filter(
          (item): item is string => typeof item === "string",
        )
      : undefined;

    if (!seed_id) {
      throw new SchemaValidationError(
        "seed_id is required for graph traversal.",
        PAKBErrorCode.SCHEMA_VALIDATION_ERROR,
      );
    }

    return await this.storage.traverseGraph(seed_id, max_depth, predicates);
  }

  public async getTimeline(args: unknown) {
    const params = typeof args === "object" && args ? (args as Record<string, unknown>) : {};
    const timelineOpts: TimelineOptions = {
      start_time:
        typeof params["start_time"] === "string" ? (params["start_time"] as string) : null,
      end_time: typeof params["end_time"] === "string" ? (params["end_time"] as string) : null,
      type: typeof params["type"] === "string" ? (params["type"] as string) : null,
      ...(typeof params["limit"] === "number" ? { limit: params["limit"] as number } : {}),
      ...(typeof params["offset"] === "number" ? { offset: params["offset"] as number } : {}),
    };

    return await this.storage.getTimeline(timelineOpts);
  }

  public async proposeMemory(args: unknown) {
    return this.stagingQueue.proposeMemory(args as MemoryProposalInput);
  }

  public async compilePreamble(args: unknown) {
    const targetFormat =
      typeof args === "object" &&
      args &&
      "target_format" in args &&
      typeof (args as Record<string, unknown>)["target_format"] === "string"
        ? ((args as Record<string, unknown>)["target_format"] as string)
        : "AGENTS.md";

    const content = `# PAKB Tier 0 System Preamble\n\nThis document captures the core Tier 0 system preamble for PAKB.\n\nTarget Format: ${targetFormat}\n\n- Ensure all system-level invariants are described here.\n- Maintain a token budget of 500 or fewer tokens for cl100k_base.`;

    const encoder = get_encoding("cl100k_base");
    try {
      const token_count = encoder.encode(content).length;
      return {
        tokenizer: "cl100k_base",
        max_budget: 500,
        token_count,
        content,
      };
    } finally {
      encoder.free();
    }
  }

  public async listMemoryProposals() {
    const proposals = await this.governance.getPendingProposals();
    return { proposals };
  }

  public async approveMemory(args: unknown) {
    const proposal_id =
      typeof args === "object" && args && "proposal_id" in args
        ? (args as Record<string, unknown>)["proposal_id"]
        : undefined;
    if (typeof proposal_id !== "string") {
      throw new SchemaValidationError(
        "proposal_id is required.",
        PAKBErrorCode.SCHEMA_VALIDATION_ERROR,
      );
    }
    const approved = await this.governance.approveMemoryProposal(proposal_id);
    return { approved };
  }

  public async rejectMemory(args: unknown) {
    const params = typeof args === "object" && args ? (args as Record<string, unknown>) : {};
    const proposal_id =
      typeof params["proposal_id"] === "string" ? params["proposal_id"] : undefined;
    const reason = typeof params["reason"] === "string" ? params["reason"] : "Rejected via MCP";

    if (!proposal_id) {
      throw new SchemaValidationError(
        "proposal_id is required.",
        PAKBErrorCode.SCHEMA_VALIDATION_ERROR,
      );
    }
    const rejected = await this.governance.rejectMemoryProposal(proposal_id, reason);
    return { rejected };
  }

  public async memoryAudit() {
    const audit_history = await this.governance.getAuditHistory();
    return { audit_history };
  }

  public async findDuplicates() {
    const { DuplicateDetector } = await import("@aiet/consolidation");
    const detector = new DuplicateDetector();
    // Fetch recent non-restricted primitives
    const searchRes = await this.storage.searchFTS5("", { limit: 100 });
    const fetched = await Promise.all(
      searchRes.results.map((r) => this.storage.getPrimitive(r.id)),
    );
    const primitives = fetched.filter((p): p is import("@aiet/schema").AnyPrimitive => p !== null);
    const duplicates = detector.findDuplicates(primitives);
    return { duplicates };
  }

  public async listContradictions(args: unknown) {
    const params = typeof args === "object" && args ? (args as Record<string, unknown>) : {};
    const status = typeof params["status"] === "string" ? params["status"] : undefined;
    const contradictions = await this.storage.listContradictions(status);
    return { contradictions };
  }

  public async resolveContradiction(args: unknown) {
    const params = typeof args === "object" && args ? (args as Record<string, unknown>) : {};
    const contradiction_id =
      typeof params["contradiction_id"] === "string" ? params["contradiction_id"] : undefined;
    const action = typeof params["action"] === "string" ? params["action"] : "merge";
    const reasoning =
      typeof params["reasoning"] === "string" ? params["reasoning"] : "Resolved via MCP";

    if (!contradiction_id) {
      throw new SchemaValidationError(
        "contradiction_id is required.",
        PAKBErrorCode.SCHEMA_VALIDATION_ERROR,
      );
    }

    await this.storage.resolveContradiction(contradiction_id, action, reasoning);
    return { status: "resolved", contradiction_id, action };
  }
}
