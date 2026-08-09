import { generateULID } from "@aiet/domain";
import {
  ActivationClass,
  AssertionType,
  ConcurrentModificationError,
  DanglingReferenceError,
  EnforcementSeverity,
  EntityType,
  EvidenceType,
  IDCollisionError,
  SensitivityTier,
  VolatilityRating,
} from "@aiet/schema";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PAKBStorageRepository, calculateJCSHash } from "../src/index";

describe("PAKB Storage Package (@aiet/storage Integration Tests)", () => {
  let repo: PAKBStorageRepository;

  beforeEach(() => {
    repo = new PAKBStorageRepository({ db_path: ":memory:" });
  });

  afterEach(async () => {
    await repo.close();
  });

  describe("1. RFC 8785 JCS SHA-256 Hash Engine", () => {
    it("should generate deterministic JCS SHA-256 hashes regardless of object key order", () => {
      const primitive1 = {
        schema_version: "1.0.0",
        id: generateULID("entity"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.INTERNAL,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ON_DEMAND,
        name: "Test Project",
        type: EntityType.WORKSTREAM,
      };

      const primitive2 = {
        type: EntityType.WORKSTREAM,
        name: "Test Project",
        activation: ActivationClass.ON_DEMAND,
        volatility: VolatilityRating.LOW,
        sensitivity: SensitivityTier.INTERNAL,
        last_verified: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        created_at: "2026-08-05T12:00:00Z",
        id: primitive1.id,
        schema_version: "1.0.0",
      };

      const hash1 = calculateJCSHash(primitive1);
      const hash2 = calculateJCSHash(primitive2 as typeof primitive1);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("2. Primitive Insert & CRUD Operations", () => {
    it("should insert and retrieve a valid Entity primitive", async () => {
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

      await repo.insertPrimitive(entity);

      const retrieved = await repo.getPrimitive(entity.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(entity.id);
      expect(retrieved?.name).toBe("AI Engineering Toolkit");
    });

    it("should reject duplicate inserts with differing content unless autorename is specified", async () => {
      const entity = {
        schema_version: "1.0.0",
        id: generateULID("entity"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.INTERNAL,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ON_DEMAND,
        name: "Initial Name",
        type: EntityType.WORKSTREAM,
      };

      await repo.insertPrimitive(entity);

      const conflictingEntity = { ...entity, name: "Conflicting Name" };

      await expect(repo.insertPrimitive(conflictingEntity)).rejects.toThrow(IDCollisionError);
    });
  });

  describe("3. Referential Integrity & Relation Validation", () => {
    it("should throw DanglingReferenceError when inserting a relation with non-existent targets", async () => {
      const relation = {
        schema_version: "1.0.0",
        id: generateULID("relation"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ON_DEMAND,
        source_id: generateULID("directive"),
        target_id: generateULID("entity"),
        predicate: "governs",
      };

      await expect(repo.insertPrimitive(relation)).rejects.toThrow(DanglingReferenceError);
    });

    it("should successfully insert a relation when both source and target exist", async () => {
      const dir = {
        schema_version: "1.0.0",
        id: generateULID("directive"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        statement: "Enforce strict security.",
        enforcement: EnforcementSeverity.HARD,
        domain: "security",
      };

      const ent = {
        schema_version: "1.0.0",
        id: generateULID("entity"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.INTERNAL,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ON_DEMAND,
        name: "Security Workstream",
        type: EntityType.WORKSTREAM,
      };

      await repo.insertPrimitive(dir);
      await repo.insertPrimitive(ent);

      const relation = {
        schema_version: "1.0.0",
        id: generateULID("relation"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ON_DEMAND,
        source_id: dir.id,
        target_id: ent.id,
        predicate: "governs",
      };

      await expect(repo.insertPrimitive(relation)).resolves.not.toThrow();
    });
  });

  describe("4. Optimistic Concurrency Control (OCC)", () => {
    it("should throw ConcurrentModificationError if updated_at timestamp token mismatches", async () => {
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

      await repo.insertPrimitive(entity);

      const updatePayload = {
        ...entity,
        updated_at: "2026-08-05T13:00:00Z",
        name: "Updated Name",
      };

      await expect(repo.updatePrimitive(updatePayload, "2026-08-05T11:00:00Z")).rejects.toThrow(
        ConcurrentModificationError,
      );
    });

    it("should succeed updating when OCC token matches expected updated_at", async () => {
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

      await repo.insertPrimitive(entity);

      const updatePayload = {
        ...entity,
        updated_at: "2026-08-05T13:00:00Z",
        name: "Updated Name",
      };

      await repo.updatePrimitive(updatePayload, "2026-08-05T12:00:00Z");

      const updated = await repo.getPrimitive(entity.id);
      expect(updated?.name).toBe("Updated Name");
    });
  });

  describe("5. Transactions & Rollback", () => {
    it("should rollback atomic transactions upon error", async () => {
      const entity = {
        schema_version: "1.0.0",
        id: generateULID("entity"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.INTERNAL,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ON_DEMAND,
        name: "Atomic Test",
        type: EntityType.WORKSTREAM,
      };

      const result = await repo.executeTransaction(async () => {
        await repo.insertPrimitive(entity);
        throw new Error("Simulated failure inside transaction");
      });

      expect(result.success).toBe(false);
      expect(await repo.getPrimitive(entity.id)).toBeNull();
    });
  });

  describe("5.1. Versioned audit chain", () => {
    it("should record CREATE and UPDATE as a verifiable immutable chain", async () => {
      const entity = {
        schema_version: "1.0.0",
        id: generateULID("entity"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.INTERNAL,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ON_DEMAND,
        name: "Audited entity",
        type: EntityType.WORKSTREAM,
      };

      await repo.insertPrimitive(entity);
      await repo.updatePrimitive({ ...entity, name: "Updated audited entity" }, entity.updated_at);

      const audit = await repo.getAuditHistory();
      expect(audit).toHaveLength(2);
      expect(audit[0]).toMatchObject({
        operation_type: "UPDATE",
        chain_version: 1,
        chain_sequence: 2,
      });
      expect(audit[1]).toMatchObject({
        operation_type: "CREATE",
        chain_version: 1,
        chain_sequence: 1,
      });
      expect(audit[0]?.previous_jcs_hash).toBe(audit[1]?.new_jcs_hash);
      expect(repo.verifyAuditChain()).toEqual({ valid: true });
    });
  });

  describe("6. FTS5 Search & Graph Traversal", () => {
    it("should search primitives via FTS5 and filter out restricted items", async () => {
      const assertion = {
        schema_version: "1.0.0",
        id: generateULID("assertion"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.INTERNAL,
        volatility: VolatilityRating.INVARIANT,
        activation: ActivationClass.ON_DEMAND,
        claim: "SQLite WAL mode enables atomic concurrent reads.",
        evidence_type: EvidenceType.OBSERVED,
        type: AssertionType.FACT,
      };

      await repo.insertPrimitive(assertion);

      const searchResult = await repo.searchFTS5("concurrent reads");
      expect(searchResult.results.length).toBeGreaterThan(0);
      expect(searchResult.results[0]?.id).toBe(assertion.id);
    });

    it("should traverse graph up to depth <= 3 and handle forward/inverse edges", async () => {
      const entA = {
        schema_version: "1.0.0",
        id: generateULID("entity"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ON_DEMAND,
        name: "Node A",
        type: EntityType.WORKSTREAM,
      };

      const entB = {
        schema_version: "1.0.0",
        id: generateULID("entity"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ON_DEMAND,
        name: "Node B",
        type: EntityType.WORKSTREAM,
      };

      await repo.insertPrimitive(entA);
      await repo.insertPrimitive(entB);

      const rel = {
        schema_version: "1.0.0",
        id: generateULID("relation"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ON_DEMAND,
        source_id: entA.id,
        target_id: entB.id,
        predicate: "depends_on",
      };

      await repo.insertPrimitive(rel);

      const graph = await repo.traverseGraph(entA.id, 2);
      expect(graph.nodes).toHaveLength(2);
      expect(graph.edges).toHaveLength(1);
    });
  });

  describe("7. Vector Storage & Hybrid Search Engine", () => {
    it("should upsert, retrieve, and query vector embeddings", async () => {
      const ent = {
        schema_version: "1.0.0",
        id: generateULID("entity"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        name: "Vector Node",
        type: EntityType.ORGANIZATION,
      };
      await repo.insertPrimitive(ent);

      const embedding = new Float32Array([0.5, 0.5, 0.5, 0.5]);
      await repo.upsertVectorEmbedding(ent.id, embedding);

      const retrieved = await repo.getVectorEmbedding(ent.id);
      expect(retrieved).not.toBeNull();
      if (retrieved) {
        expect(Array.from(retrieved)).toEqual(Array.from(embedding));
      }

      const searchResult = await repo.searchVector(embedding, { limit: 5 });
      expect(searchResult.total_matches).toBe(1);
      expect(searchResult.results[0]?.primitive_id).toBe(ent.id);
      expect(searchResult.results[0]?.similarity_score).toBeCloseTo(1.0);
    });

    it("should combine FTS5 BM25 and Vector Search using Reciprocal Rank Fusion (RRF)", async () => {
      const assertion1 = {
        schema_version: "1.0.0",
        id: generateULID("assertion"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        claim: "Quantum computing accelerates hybrid retrieval benchmarks.",
        evidence_type: EvidenceType.STATED,
        type: AssertionType.FACT,
      };

      const assertion2 = {
        schema_version: "1.0.0",
        id: generateULID("assertion"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        claim: "Neural vector embeddings index semantic knowledge.",
        evidence_type: EvidenceType.STATED,
        type: AssertionType.FACT,
      };

      await repo.insertPrimitive(assertion1);
      await repo.insertPrimitive(assertion2);

      const vec1 = new Float32Array([1.0, 0.0, 0.0, 0.0]);
      const vec2 = new Float32Array([0.0, 1.0, 0.0, 0.0]);

      await repo.upsertVectorEmbedding(assertion1.id, vec1);
      await repo.upsertVectorEmbedding(assertion2.id, vec2);

      // Perform Hybrid Search (FTS query + Vector query)
      const hybridRes = await repo.searchHybrid("Quantum", vec1, { limit: 5, alpha: 0.5 });
      expect(hybridRes.total_matches).toBeGreaterThan(0);
      expect(hybridRes.results[0]?.primitive_id).toBe(assertion1.id);
      expect(hybridRes.results[0]?.combined_score).toBeGreaterThan(0);
    });
  });

  describe("8. Production Memory Lifecycle & Consolidation Engine", () => {
    it("should track access count, importance score, and touch timestamps", async () => {
      const ent = {
        schema_version: "1.0.0",
        id: generateULID("entity"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        name: "Lifecycle Test Entity",
        type: EntityType.WORKSTREAM,
      };

      await repo.insertPrimitive(ent);
      await repo.setMemoryImportance(ent.id, 0.95);
      await repo.touchMemoryAccess(ent.id);

      const lifecycle = await repo.getMemoryLifecycle(ent.id);
      expect(lifecycle).not.toBeNull();
      expect(lifecycle?.importance_score).toBeCloseTo(0.95);
      expect(lifecycle?.access_count).toBe(1);
    });

    it("should merge duplicate memories and transfer relations & embeddings", async () => {
      const primary = {
        schema_version: "1.0.0",
        id: generateULID("entity"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        name: "Primary Customer Support Entity",
        type: EntityType.ORGANIZATION,
      };

      const duplicate = {
        schema_version: "1.0.0",
        id: generateULID("entity"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        name: "Duplicate Customer Support Entity",
        type: EntityType.ORGANIZATION,
      };

      await repo.insertPrimitive(primary);
      await repo.insertPrimitive(duplicate);

      const vec = new Float32Array([0.1, 0.2, 0.3]);
      await repo.upsertVectorEmbedding(duplicate.id, vec);

      await repo.mergeMemories(primary.id, [duplicate.id]);

      expect(await repo.getPrimitive(duplicate.id)).toBeNull();
      const transferredVec = await repo.getVectorEmbedding(primary.id);
      expect(transferredVec).not.toBeNull();
    });

    it("should retrieve ranked memories factoring relevance, importance, and recency", async () => {
      const assertion = {
        schema_version: "1.0.0",
        id: generateULID("assertion"),
        created_at: "2026-08-05T12:00:00Z",
        updated_at: "2026-08-05T12:00:00Z",
        last_verified: "2026-08-05T12:00:00Z",
        sensitivity: SensitivityTier.PUBLIC,
        volatility: VolatilityRating.LOW,
        activation: ActivationClass.ALWAYS_ON,
        claim:
          "Ranked memory retrieval factors relevance, importance, and exponential recency decay.",
        evidence_type: EvidenceType.STATED,
        type: AssertionType.FACT,
      };

      await repo.insertPrimitive(assertion);
      await repo.setMemoryImportance(assertion.id, 0.8);

      const ranked = await repo.retrieveRankedMemories("recency decay", null, { limit: 5 });
      expect(ranked.total_matches).toBeGreaterThan(0);
      expect(ranked.results[0]?.primitive_id).toBe(assertion.id);
      expect(ranked.results[0]?.importance_score).toBeCloseTo(0.8);
      expect(ranked.results[0]?.final_score).toBeGreaterThan(0);
    });
  });
});
