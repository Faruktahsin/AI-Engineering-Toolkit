export type BenchmarkCategory =
  | "coding_preferences"
  | "architecture_constraints"
  | "tooling_preferences"
  | "testing_preferences"
  | "documentation_preferences"
  | "project_constraints"
  | "user_preferences"
  | "temporal_preference_changes"
  | "contradictory_memories"
  | "irrelevant_distractors";

export interface GroundTruthMemoryFixture {
  id: string;
  category: BenchmarkCategory;
  content: string;
  tags: string[];
  scope: string;
  entityType: "Directive" | "Assertion" | "Entity" | "Event";
  relevanceScore?: number; // 0.0 to 1.0 graded relevance
}

export interface GroundTruthTestCase {
  id: string;
  category: BenchmarkCategory;
  query: string;
  relevantMemoryIds: string[];
  expectedDirectiveContent?: string;
  supersededMemoryId?: string;
  notes?: string;
}

export interface GroundTruthDatasetSchema {
  version: string;
  description: string;
  memories: GroundTruthMemoryFixture[];
  testCases: GroundTruthTestCase[];
}
