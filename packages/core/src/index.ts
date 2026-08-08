// Unified primary public SDK entry point for AI Engineering Toolkit (AIET)
export * from "@aiet/contracts";
export * from "@aiet/errors";
export * from "@aiet/schema";
export * from "@aiet/domain";
export {
  calculateJCSHash,
  createDatabaseConnection,
  PAKBStorageRepository,
  type FTS5SearchResult,
  type GraphEdge,
  type GraphNode,
  type GraphResult,
  type PAKBStorageOptions,
  type SearchOptions,
  type SearchResponse,
  type TimelineOptions,
} from "@aiet/storage";
export * from "@aiet/mcp-server";
export * from "@aiet/compiler";
export * from "@aiet/cli";
export {
  MockEmbeddingProvider,
  cosineSimilarity,
  deserializeVector,
  serializeVector,
  type AIETEmbeddingProvider,
} from "@aiet/embeddings";
export {
  DeterministicExtractorProvider,
  LLMExtractorProvider,
  classifySensitivity,
  isConversationalFiller,
  type ConversationInput,
  type ExtractionResult,
  type ExtractorChatMessage,
  type ExtractorProvider,
  type MemoryCandidate,
} from "@aiet/extractor";
export * from "@aiet/decision-engine";
export {
  GovernanceManager,
  evaluateGovernancePolicy,
  type AuditLogRecord,
  type GovernancePolicyEvaluation,
  type GovernancePolicyMode,
  type MemoryProposalRecord,
  type ProposalStatus as GovernanceProposalStatus,
} from "@aiet/governance";
export * from "@aiet/consolidation";

// Primary Facade API Exports
export { CompilerClient, type CompileOptions, type CompileResult } from "./compiler-client";
export {
  DoctorClient,
  type DoctorCheckResult,
  type DoctorOptions,
  type DoctorReport,
} from "./doctor-client";
export { AIETClient, createAIET, type AIETOptions } from "./facade";
export { GovernanceClient } from "./governance-client";
export { MemoryClient } from "./memory-client";
