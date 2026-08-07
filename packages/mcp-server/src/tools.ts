import {
  ActivationClass,
  PAKBErrorCode,
  SecurityRedactionError,
  SensitivityTier,
} from "@aiet/schema";
import type { PAKBStorageRepository, SearchOptions, TimelineOptions } from "@aiet/storage";
import { get_encoding } from "tiktoken";
import type { MemoryProposalInput, ProposalStagingQueue } from "./staging";

export class PAKBToolExecutor {
  constructor(
    private readonly storage: PAKBStorageRepository,
    private readonly stagingQueue: ProposalStagingQueue,
  ) {}

  public async getPrimitive(args: unknown) {
    const id =
      typeof args === "object" && args && "id" in args
        ? (args as Record<string, unknown>)["id"]
        : undefined;
    if (typeof id !== "string") {
      throw new Error("Invalid primitive id.");
    }

    const primitive = await this.storage.getPrimitive(id);
    if (!primitive) {
      throw new Error(`Primitive '${id}' not found.`);
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

    return { primitive };
  }

  public async search(args: unknown) {
    const query =
      typeof args === "object" && args && "query" in args
        ? (args as Record<string, unknown>)["query"]
        : undefined;
    if (typeof query !== "string") {
      throw new Error("Search query must be a string.");
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

    return await this.storage.searchFTS5(query, searchOpts);
  }

  public async traverseGraph(args: unknown) {
    if (typeof args !== "object" || args === null || !("seed_id" in args)) {
      throw new Error("Invalid traverseGraph arguments.");
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
      throw new Error("seed_id is required for graph traversal.");
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
}
