import { type AIETEmbeddingProvider, MockEmbeddingProvider } from "@aiet/embeddings";
import { OllamaEmbeddingProvider } from "@aiet/embeddings-ollama";
import { OpenAIEmbeddingProvider } from "@aiet/embeddings-openai";
import { GovernanceManager } from "@aiet/governance";
import { type PAKBStorageOptions, PAKBStorageRepository } from "@aiet/storage";
import { CompilerClient } from "./compiler-client";
import { DoctorClient } from "./doctor-client";
import { GovernanceClient } from "./governance-client";
import { MemoryClient } from "./memory-client";

export interface AIETOptions {
  /** SQLite database file path or storage configuration options. Defaults to ':memory:' or './aiet-memory.db' */
  readonly storage?: string | PAKBStorageOptions | undefined;
  /** Embedding provider type ('mock', 'openai', 'ollama') or custom AIETEmbeddingProvider instance */
  readonly embeddings?: "mock" | "openai" | "ollama" | AIETEmbeddingProvider | undefined;
  readonly openaiApiKey?: string | undefined;
  readonly ollamaHost?: string | undefined;
  readonly tokenBudget?: number | undefined;
}

export class AIETClient {
  public readonly memory: MemoryClient;
  public readonly compiler: CompilerClient;
  public readonly governance: GovernanceClient;
  public readonly doctor: DoctorClient;
  public readonly storage: PAKBStorageRepository;

  constructor(
    repository: PAKBStorageRepository,
    governanceManager: GovernanceManager,
    embeddingProvider: AIETEmbeddingProvider,
  ) {
    this.storage = repository;
    this.memory = new MemoryClient(repository, governanceManager, embeddingProvider);
    this.compiler = new CompilerClient(repository);
    this.governance = new GovernanceClient(governanceManager);
    this.doctor = new DoctorClient();
  }

  public async close(): Promise<void> {
    await this.storage.close();
  }
}

/**
 * Creates a unified AIETClient SDK facade instance.
 *
 * @example
 * ```typescript
 * const aiet = createAIET({ storage: "./memory.db", embeddings: "mock" });
 * await aiet.memory.search("user preferences");
 * await aiet.compile({ targetFormat: "AGENTS.md" });
 * ```
 */
export function createAIET(options?: AIETOptions): AIETClient {
  const storageOpt: PAKBStorageOptions =
    typeof options?.storage === "string"
      ? { db_path: options.storage }
      : options?.storage ?? { db_path: ":memory:" };

  const repository = new PAKBStorageRepository(storageOpt);
  const governanceManager = new GovernanceManager(repository);

  let embeddingProvider: AIETEmbeddingProvider;
  if (
    typeof options?.embeddings === "object" &&
    options.embeddings !== null &&
    "embed" in options.embeddings
  ) {
    embeddingProvider = options.embeddings;
  } else if (options?.embeddings === "openai") {
    embeddingProvider = new OpenAIEmbeddingProvider({ apiKey: options.openaiApiKey });
  } else if (options?.embeddings === "ollama") {
    embeddingProvider = new OllamaEmbeddingProvider({ baseUrl: options.ollamaHost });
  } else {
    embeddingProvider = new MockEmbeddingProvider();
  }

  return new AIETClient(repository, governanceManager, embeddingProvider);
}
