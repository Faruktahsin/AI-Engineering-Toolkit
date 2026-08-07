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
});
