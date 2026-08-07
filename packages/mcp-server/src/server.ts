import { PAKBError } from "@aiet/schema";
import type { PAKBStorageRepository } from "@aiet/storage";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { PAKBResourceProvider } from "./resources";
import { ProposalStagingQueue } from "./staging";
import { PAKBToolExecutor } from "./tools";

export class PAKBMCPServer {
  private readonly server: Server;
  private readonly resourceProvider: PAKBResourceProvider;
  private readonly toolExecutor: PAKBToolExecutor;
  private readonly stagingQueue: ProposalStagingQueue;

  constructor(storage: PAKBStorageRepository) {
    this.stagingQueue = new ProposalStagingQueue();
    this.resourceProvider = new PAKBResourceProvider(storage);
    this.toolExecutor = new PAKBToolExecutor(storage, this.stagingQueue);

    this.server = new Server(
      {
        name: "pakb-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      },
    );

    this.registerHandlers();
  }

  private registerHandlers(): void {
    // 1. List Resources Handler
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: "pakb://preamble/tier0",
            name: "Tier 0 System Preamble",
            description: "Compiled static system instructions and core constraints (<=500 tokens).",
            mimeType: "text/plain",
          },
          {
            uri: "pakb://timeline/recent",
            name: "Recent Events Timeline",
            description: "Chronological list of recent events and milestones.",
            mimeType: "application/json",
          },
        ],
      };
    });

    // 2. Read Resource Handler
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      try {
        const content = await this.resourceProvider.readResource(request.params.uri);
        return { contents: [content] };
      } catch (err) {
        if (err instanceof PAKBError) {
          throw new Error(`[${err.code}] ${err.message}`);
        }
        throw err;
      }
    });

    // 3. List Tools Handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "pakb_get_primitive",
            description: "Fetches a single non-restricted PAKB primitive by Base32 ULID.",
            inputSchema: {
              type: "object",
              properties: {
                id: { type: "string", description: "Prefixed Base32 ULID (e.g. ent_01J4...)" },
              },
              required: ["id"],
            },
          },
          {
            name: "pakb_search",
            description:
              "Executes full-text search over non-restricted PAKB primitives using SQLite FTS5 BM25.",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string" },
                primitive_type: {
                  type: "string",
                  enum: ["entity", "directive", "assertion", "event"],
                },
                limit: { type: "integer", default: 10 },
                offset: { type: "integer", default: 0 },
              },
              required: ["query"],
            },
          },
          {
            name: "pakb_traverse_graph",
            description: "Executes multi-hop recursive graph traversal up to depth 3.",
            inputSchema: {
              type: "object",
              properties: {
                seed_id: { type: "string" },
                max_depth: { type: "integer", maximum: 3, default: 3 },
                predicates: { type: "array", items: { type: "string" } },
              },
              required: ["seed_id"],
            },
          },
          {
            name: "pakb_get_timeline",
            description: "Retrieves chronological event and milestone records.",
            inputSchema: {
              type: "object",
              properties: {
                start_time: { type: "string" },
                end_time: { type: "string" },
                type: { type: "string" },
                limit: { type: "integer", default: 20 },
                offset: { type: "integer", default: 0 },
              },
            },
          },
          {
            name: "pakb_propose_memory",
            description:
              "Stages an agent memory update proposal for human approval ('Agent Proposes, Human Commits').",
            inputSchema: {
              type: "object",
              properties: {
                proposal_type: { type: "string", enum: ["CREATE", "UPDATE", "SUPERSEDE"] },
                target_primitive_type: {
                  type: "string",
                  enum: ["entity", "directive", "assertion", "event", "relation"],
                },
                payload: { type: "object" },
                rationale: { type: "string" },
              },
              required: ["proposal_type", "target_primitive_type", "payload", "rationale"],
            },
          },
          {
            name: "pakb_compile_preamble",
            description: "Compiles and token-profiles Tier 0 preamble (<=500 tokens).",
            inputSchema: {
              type: "object",
              properties: {
                target_format: {
                  type: "string",
                  enum: ["AGENTS.md", "CLAUDE.md", ".cursorrules"],
                  default: "AGENTS.md",
                },
              },
            },
          },
        ],
      };
    });

    // 4. Call Tool Handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const safeArgs = args ?? {};

      try {
        let result: unknown;
        if (name === "pakb_get_primitive") {
          result = await this.toolExecutor.getPrimitive(safeArgs);
        } else if (name === "pakb_search") {
          result = await this.toolExecutor.search(safeArgs);
        } else if (name === "pakb_traverse_graph") {
          result = await this.toolExecutor.traverseGraph(safeArgs);
        } else if (name === "pakb_get_timeline") {
          result = await this.toolExecutor.getTimeline(safeArgs);
        } else if (name === "pakb_propose_memory") {
          result = await this.toolExecutor.proposeMemory(safeArgs);
        } else if (name === "pakb_compile_preamble") {
          result = await this.toolExecutor.compilePreamble(safeArgs);
        } else {
          throw new Error(`Unknown MCP tool name: '${name}'.`);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `[MCP_TOOL_ERROR] ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  public async startStdio(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  public async stop(): Promise<void> {
    await this.server.close();
  }

  public getStagingQueue(): ProposalStagingQueue {
    return this.stagingQueue;
  }
}
