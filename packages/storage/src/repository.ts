import fs from "node:fs";
import path from "node:path";
import { generateULID, validateOrThrow } from "@aiet/domain";
import { cosineSimilarity, deserializeVector, serializeVector } from "@aiet/embeddings";
import {
  type AnyPrimitive,
  ConcurrentModificationError,
  DanglingReferenceError,
  IDCollisionError,
  ImmutableFieldViolationError,
  PAKBErrorCode,
  PrimitiveNotFoundError,
  SensitivityTier,
} from "@aiet/schema";
import type Database from "better-sqlite3";
import { ulid } from "ulid";
import { type AIETStorageOptions, createDatabaseConnection } from "./connection";
import type {
  AuditChainVerification,
  StorageAuditRecord,
  StorageMutationInput,
  StorageMutationResult,
  StorageProposalRecord,
} from "./governance-records";
import { calculateJCSHash } from "./jcs-hash";

export interface SearchOptions {
  readonly primitive_type?: "entity" | "directive" | "assertion" | "event" | null | undefined;
  readonly sensitivity_limit?: SensitivityTier | undefined;
  readonly limit?: number | undefined;
  readonly offset?: number | undefined;
}

export interface SearchResult {
  readonly id: string;
  readonly primitive_type: string;
  readonly score: number;
  readonly snippet: string;
  readonly headline_claim: string;
}

export type FTS5SearchResult = SearchResult;

export interface SearchResponse {
  readonly total_matches: number;
  readonly limit: number;
  readonly offset: number;
  readonly results: SearchResult[];
}

export interface VectorMatch {
  readonly primitive_id: string;
  readonly similarity_score: number;
  readonly primitive?: AnyPrimitive | null;
}

export interface VectorSearchResult {
  readonly total_matches: number;
  readonly results: readonly VectorMatch[];
}

export interface HybridSearchResultItem {
  readonly primitive_id: string;
  readonly combined_score: number;
  readonly fts_rank?: number | null;
  readonly vector_score?: number | null;
  readonly primitive?: AnyPrimitive | null;
}

export interface HybridSearchOptions {
  readonly limit?: number | undefined;
  readonly alpha?: number | undefined;
  readonly sensitivity_limit?: SensitivityTier | undefined;
}

export interface HybridSearchResult {
  readonly total_matches: number;
  readonly results: readonly HybridSearchResultItem[];
}

export interface MemoryLifecycleRecord {
  readonly primitive_id: string;
  readonly importance_score: number;
  readonly access_count: number;
  readonly created_at: string;
  readonly last_accessed_at: string;
  readonly metadata?: Record<string, unknown> | null | undefined;
}

export interface RankedMemoryOptions {
  readonly limit?: number | undefined;
  readonly alpha?: number | undefined;
  readonly importance_weight?: number | undefined;
  readonly recency_decay_half_life_days?: number | undefined;
  readonly sensitivity_limit?: SensitivityTier | undefined;
}

export interface RankedMemoryItem {
  readonly primitive_id: string;
  readonly final_score: number;
  readonly rrf_score: number;
  readonly importance_score: number;
  readonly recency_score: number;
  readonly access_count: number;
  readonly last_accessed_at: string;
  readonly primitive?: AnyPrimitive | null | undefined;
}

export interface RankedMemoryResponse {
  readonly total_matches: number;
  readonly results: readonly RankedMemoryItem[];
}

export interface GraphNode {
  readonly id: string;
  readonly depth: number;
  readonly primitive: AnyPrimitive;
}

export interface GraphEdge {
  readonly id: string;
  readonly source_id: string;
  readonly target_id: string;
  readonly predicate: string;
}

export interface GraphResult {
  readonly seed_id: string;
  readonly max_depth: number;
  readonly nodes: GraphNode[];
  readonly edges: GraphEdge[];
}

export interface TimelineOptions {
  readonly start_time?: string | null;
  readonly end_time?: string | null;
  readonly type?: string | null;
  readonly limit?: number;
  readonly offset?: number;
}

export interface TimelineResponse {
  readonly total_count: number;
  readonly limit: number;
  readonly offset: number;
  readonly events: AnyPrimitive[];
}

export interface TransactionResult<T> {
  readonly success: boolean;
  readonly result?: T | null;
  readonly error?: Error | null;
}

const EMBEDDED_DDL = `
  CREATE TABLE IF NOT EXISTS primitives_registry (
    id TEXT PRIMARY KEY CHECK (
      id GLOB 'ent_[0-9A-HJKMNP-TV-Z]*' OR id GLOB 'dir_[0-9A-HJKMNP-TV-Z]*' OR
      id GLOB 'ast_[0-9A-HJKMNP-TV-Z]*' OR id GLOB 'evt_[0-9A-HJKMNP-TV-Z]*' OR
      id GLOB 'rel_[0-9A-HJKMNP-TV-Z]*'
    ),
    primitive_type TEXT NOT NULL CHECK (primitive_type IN ('entity', 'directive', 'assertion', 'event', 'relation'))
  );
  CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY REFERENCES primitives_registry(id) ON DELETE CASCADE,
    schema_version TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_verified TEXT NOT NULL,
    sensitivity TEXT NOT NULL, volatility TEXT NOT NULL, activation TEXT NOT NULL,
    name TEXT NOT NULL, type TEXT NOT NULL, status TEXT, locale_info TEXT, description TEXT, metadata TEXT
  );
  CREATE TABLE IF NOT EXISTS directives (
    id TEXT PRIMARY KEY REFERENCES primitives_registry(id) ON DELETE CASCADE,
    schema_version TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_verified TEXT NOT NULL,
    sensitivity TEXT NOT NULL, volatility TEXT NOT NULL, activation TEXT NOT NULL,
    statement TEXT NOT NULL, enforcement TEXT NOT NULL, domain TEXT NOT NULL, cadence TEXT, exemption_scope TEXT, rationale TEXT, metadata TEXT
  );
  CREATE TABLE IF NOT EXISTS assertions (
    id TEXT PRIMARY KEY REFERENCES primitives_registry(id) ON DELETE CASCADE,
    schema_version TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_verified TEXT NOT NULL,
    sensitivity TEXT NOT NULL, volatility TEXT NOT NULL, activation TEXT NOT NULL,
    claim TEXT NOT NULL, evidence_type TEXT NOT NULL, type TEXT NOT NULL, status TEXT, source TEXT, valid_from TEXT, valid_to TEXT, metadata TEXT
  );
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY REFERENCES primitives_registry(id) ON DELETE CASCADE,
    schema_version TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_verified TEXT NOT NULL,
    sensitivity TEXT NOT NULL, volatility TEXT NOT NULL, activation TEXT NOT NULL,
    timestamp TEXT NOT NULL, summary TEXT NOT NULL, type TEXT, impact_summary TEXT, tags TEXT, metadata TEXT
  );
  CREATE TABLE IF NOT EXISTS relations (
    id TEXT PRIMARY KEY REFERENCES primitives_registry(id) ON DELETE CASCADE,
    schema_version TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_verified TEXT NOT NULL,
    sensitivity TEXT NOT NULL, volatility TEXT NOT NULL, activation TEXT NOT NULL,
    source_id TEXT NOT NULL REFERENCES primitives_registry(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL REFERENCES primitives_registry(id) ON DELETE CASCADE,
    predicate TEXT NOT NULL, valid_from TEXT, valid_to TEXT, weight REAL, metadata TEXT
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    log_id TEXT PRIMARY KEY, timestamp TEXT NOT NULL, primitive_id TEXT NOT NULL,
    operation_type TEXT NOT NULL, initiator TEXT NOT NULL, primitive_jcs_hash TEXT, previous_jcs_hash TEXT, new_jcs_hash TEXT NOT NULL,
    chain_version INTEGER NOT NULL DEFAULT 0, chain_sequence INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS vector_embeddings (
    primitive_id TEXT PRIMARY KEY REFERENCES primitives_registry(id) ON DELETE CASCADE,
    dimensions INTEGER NOT NULL,
    embedding_blob BLOB NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS memory_lifecycle (
    primitive_id TEXT PRIMARY KEY REFERENCES primitives_registry(id) ON DELETE CASCADE,
    importance_score REAL NOT NULL DEFAULT 0.5,
    access_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    last_accessed_at TEXT NOT NULL,
    metadata TEXT
  );
  CREATE TABLE IF NOT EXISTS memory_proposals (
    proposal_id TEXT PRIMARY KEY,
    candidate_primitive_json TEXT NOT NULL,
    decision_type TEXT NOT NULL,
    target_primitive_id TEXT REFERENCES primitives_registry(id) ON DELETE CASCADE,
    expected_updated_at TEXT,
    confidence_score REAL NOT NULL,
    status TEXT NOT NULL,
    reasoning TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS memory_contradictions (
    contradiction_id TEXT PRIMARY KEY,
    primitive_a_id TEXT NOT NULL REFERENCES primitives_registry(id) ON DELETE CASCADE,
    primitive_b_id TEXT NOT NULL REFERENCES primitives_registry(id) ON DELETE CASCADE,
    conflict_type TEXT NOT NULL,
    status TEXT NOT NULL,
    resolution_action TEXT,
    reasoning TEXT,
    detected_at TEXT NOT NULL,
    resolved_at TEXT
  );
  CREATE TABLE IF NOT EXISTS memory_lineage (
    lineage_id TEXT PRIMARY KEY,
    action_type TEXT NOT NULL,
    source_primitive_id TEXT NOT NULL,
    target_primitive_id TEXT,
    snapshot_primitive_json TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE VIRTUAL TABLE IF NOT EXISTS fts_knowledge_index USING fts5(primitive_id UNINDEXED, primitive_type UNINDEXED, searchable_text, tokenize='unicode61 remove_diacritics 1');

  CREATE TRIGGER IF NOT EXISTS trg_entities_fts_insert AFTER INSERT ON entities WHEN new.sensitivity != 'restricted' BEGIN INSERT INTO fts_knowledge_index(primitive_id, primitive_type, searchable_text) VALUES (new.id, 'entity', new.name || ' ' || COALESCE(new.description, '')); END;
  CREATE TRIGGER IF NOT EXISTS trg_entities_fts_delete AFTER DELETE ON entities BEGIN DELETE FROM fts_knowledge_index WHERE primitive_id = old.id; END;

  CREATE TRIGGER IF NOT EXISTS trg_directives_fts_insert AFTER INSERT ON directives WHEN new.sensitivity != 'restricted' BEGIN INSERT INTO fts_knowledge_index(primitive_id, primitive_type, searchable_text) VALUES (new.id, 'directive', new.statement || ' ' || new.domain || ' ' || COALESCE(new.rationale, '')); END;
  CREATE TRIGGER IF NOT EXISTS trg_directives_fts_delete AFTER DELETE ON directives BEGIN DELETE FROM fts_knowledge_index WHERE primitive_id = old.id; END;

  CREATE TRIGGER IF NOT EXISTS trg_assertions_fts_insert AFTER INSERT ON assertions WHEN new.sensitivity != 'restricted' BEGIN INSERT INTO fts_knowledge_index(primitive_id, primitive_type, searchable_text) VALUES (new.id, 'assertion', new.claim); END;
  CREATE TRIGGER IF NOT EXISTS trg_assertions_fts_delete AFTER DELETE ON assertions BEGIN DELETE FROM fts_knowledge_index WHERE primitive_id = old.id; END;

  CREATE TRIGGER IF NOT EXISTS trg_entities_lifecycle_insert AFTER INSERT ON entities BEGIN INSERT INTO memory_lifecycle(primitive_id, importance_score, access_count, created_at, last_accessed_at, metadata) VALUES (new.id, 0.5, 0, new.created_at, new.created_at, new.metadata) ON CONFLICT(primitive_id) DO NOTHING; END;
  CREATE TRIGGER IF NOT EXISTS trg_directives_lifecycle_insert AFTER INSERT ON directives BEGIN INSERT INTO memory_lifecycle(primitive_id, importance_score, access_count, created_at, last_accessed_at, metadata) VALUES (new.id, 0.5, 0, new.created_at, new.created_at, new.metadata) ON CONFLICT(primitive_id) DO NOTHING; END;
  CREATE TRIGGER IF NOT EXISTS trg_assertions_lifecycle_insert AFTER INSERT ON assertions BEGIN INSERT INTO memory_lifecycle(primitive_id, importance_score, access_count, created_at, last_accessed_at, metadata) VALUES (new.id, 0.5, 0, new.created_at, new.created_at, new.metadata) ON CONFLICT(primitive_id) DO NOTHING; END;
  CREATE TRIGGER IF NOT EXISTS trg_events_lifecycle_insert AFTER INSERT ON events BEGIN INSERT INTO memory_lifecycle(primitive_id, importance_score, access_count, created_at, last_accessed_at, metadata) VALUES (new.id, 0.5, 0, new.created_at, new.created_at, new.metadata) ON CONFLICT(primitive_id) DO NOTHING; END;
`;

export class AIETStorageRepository {
  private readonly db: Database.Database;

  constructor(options: AIETStorageOptions) {
    this.db = createDatabaseConnection(options);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    let ddl = EMBEDDED_DDL;
    if (typeof __dirname !== "undefined") {
      const migrationPath = path.join(__dirname, "migrations", "0001_initial.sql");
      if (fs.existsSync(migrationPath)) {
        ddl = fs.readFileSync(migrationPath, "utf8");
      }
    }
    this.db.exec(ddl);
    this.migrateGovernanceSchema();
  }

  /** Adds P1.2 columns without rewriting existing user databases. */
  private migrateGovernanceSchema(): void {
    const auditColumns = this.db.prepare("PRAGMA table_info(audit_log)").all() as Array<{
      name: string;
    }>;
    if (!auditColumns.some((column) => column.name === "chain_version")) {
      this.db.exec("ALTER TABLE audit_log ADD COLUMN chain_version INTEGER NOT NULL DEFAULT 0");
    }
    if (!auditColumns.some((column) => column.name === "chain_sequence")) {
      this.db.exec("ALTER TABLE audit_log ADD COLUMN chain_sequence INTEGER NOT NULL DEFAULT 0");
    }
    if (!auditColumns.some((column) => column.name === "primitive_jcs_hash")) {
      this.db.exec("ALTER TABLE audit_log ADD COLUMN primitive_jcs_hash TEXT");
    }

    const proposalColumns = this.db.prepare("PRAGMA table_info(memory_proposals)").all() as Array<{
      name: string;
    }>;
    if (!proposalColumns.some((column) => column.name === "expected_updated_at")) {
      this.db.exec("ALTER TABLE memory_proposals ADD COLUMN expected_updated_at TEXT");
    }

    this.db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_log_v1_sequence
      ON audit_log(chain_sequence)
      WHERE chain_version = 1;
    `);
  }

  public calculateJCSHash(primitive: AnyPrimitive): string {
    return calculateJCSHash(primitive);
  }

  public async getPrimitive(id: string): Promise<AnyPrimitive | null> {
    const reg = this.db
      .prepare("SELECT primitive_type FROM primitives_registry WHERE id = ?")
      .get(id) as { primitive_type: string } | undefined;
    if (!reg) return null;

    let row: Record<string, unknown> | undefined;
    if (reg.primitive_type === "entity") {
      row = this.db.prepare("SELECT * FROM entities WHERE id = ?").get(id) as Record<
        string,
        unknown
      >;
    } else if (reg.primitive_type === "directive") {
      row = this.db.prepare("SELECT * FROM directives WHERE id = ?").get(id) as Record<
        string,
        unknown
      >;
    } else if (reg.primitive_type === "assertion") {
      row = this.db.prepare("SELECT * FROM assertions WHERE id = ?").get(id) as Record<
        string,
        unknown
      >;
    } else if (reg.primitive_type === "event") {
      row = this.db.prepare("SELECT * FROM events WHERE id = ?").get(id) as Record<string, unknown>;
    } else if (reg.primitive_type === "relation") {
      row = this.db.prepare("SELECT * FROM relations WHERE id = ?").get(id) as Record<
        string,
        unknown
      >;
    }

    if (!row) return null;

    for (const key of Object.keys(row)) {
      if (row[key] === null) {
        delete row[key];
      }
    }

    if (typeof row["locale_info"] === "string")
      row["locale_info"] = JSON.parse(row["locale_info"] as string);
    if (typeof row["metadata"] === "string")
      row["metadata"] = JSON.parse(row["metadata"] as string);
    if (typeof row["tags"] === "string") row["tags"] = JSON.parse(row["tags"] as string);

    return row as unknown as AnyPrimitive;
  }

  public async getPrimitives(limit = 100, offset = 0): Promise<AnyPrimitive[]> {
    const rows = this.db
      .prepare("SELECT id FROM primitives_registry LIMIT ? OFFSET ?")
      .all(limit, offset) as Array<{ id: string }>;
    const primitives = await Promise.all(rows.map((r) => this.getPrimitive(r.id)));
    return primitives.filter((p): p is AnyPrimitive => p !== null);
  }

  private getPrimitiveSync(id: string): AnyPrimitive | null {
    const reg = this.db
      .prepare("SELECT primitive_type FROM primitives_registry WHERE id = ?")
      .get(id) as { primitive_type: string } | undefined;
    if (!reg) return null;

    const tableByType: Record<string, string> = {
      entity: "entities",
      directive: "directives",
      assertion: "assertions",
      event: "events",
      relation: "relations",
    };
    const table = tableByType[reg.primitive_type];
    if (!table) return null;
    const row = this.db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    for (const key of Object.keys(row)) if (row[key] === null) delete row[key];
    if (typeof row["locale_info"] === "string")
      row["locale_info"] = JSON.parse(String(row["locale_info"]));
    if (typeof row["metadata"] === "string") row["metadata"] = JSON.parse(String(row["metadata"]));
    if (typeof row["tags"] === "string") row["tags"] = JSON.parse(String(row["tags"]));
    return row as unknown as AnyPrimitive;
  }

  private primitiveType(
    primitive: AnyPrimitive,
  ): "entity" | "directive" | "assertion" | "event" | "relation" {
    if (primitive.id.startsWith("dir_")) return "directive";
    if (primitive.id.startsWith("ast_")) return "assertion";
    if (primitive.id.startsWith("evt_")) return "event";
    if (primitive.id.startsWith("rel_")) return "relation";
    return "entity";
  }

  private constructMutation(
    target: AnyPrimitive,
    candidate: AnyPrimitive,
    kind: "UPDATE" | "MERGE",
  ): AnyPrimitive {
    const targetType = this.primitiveType(target);
    const targetData = target as unknown as Record<string, unknown>;
    const candidateData = candidate as unknown as Record<string, unknown>;
    if (targetType !== this.primitiveType(candidate)) {
      throw new Error("Cannot mutate primitives with different types.");
    }
    if (candidate.sensitivity !== target.sensitivity) {
      throw new ImmutableFieldViolationError(
        `Sensitivity is immutable for primitive '${target.id}'.`,
        PAKBErrorCode.IMMUTABLE_FIELD_VIOLATION_ERROR,
        target.id,
      );
    }
    if (
      targetType === "relation" &&
      (candidateData["source_id"] !== targetData["source_id"] ||
        candidateData["target_id"] !== targetData["target_id"])
    ) {
      throw new ImmutableFieldViolationError(
        `Relation endpoints are immutable for primitive '${target.id}'.`,
        PAKBErrorCode.IMMUTABLE_FIELD_VIOLATION_ERROR,
        target.id,
      );
    }

    const mergedMetadata =
      kind === "MERGE"
        ? { ...(target.metadata ?? {}), ...(candidate.metadata ?? {}) }
        : candidate.metadata;
    const result: Record<string, unknown> = {
      ...candidateData,
      id: target.id,
      schema_version: target.schema_version,
      created_at: target.created_at,
      sensitivity: target.sensitivity,
      updated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      metadata: mergedMetadata,
    };

    if (kind === "MERGE") {
      if (targetType === "entity") {
        result["name"] = targetData["name"];
        result["type"] = targetData["type"];
        result["status"] = candidateData["status"] ?? targetData["status"];
        result["locale_info"] = candidateData["locale_info"] ?? targetData["locale_info"];
        result["description"] = candidateData["description"] ?? targetData["description"];
      } else if (targetType === "directive") {
        result["statement"] = targetData["statement"];
        result["enforcement"] = targetData["enforcement"];
        result["domain"] = targetData["domain"];
        result["cadence"] = candidateData["cadence"] ?? targetData["cadence"];
        result["exemption_scope"] =
          candidateData["exemption_scope"] ?? targetData["exemption_scope"];
        result["rationale"] = candidateData["rationale"] ?? targetData["rationale"];
      } else if (targetType === "assertion") {
        result["claim"] = targetData["claim"];
        result["evidence_type"] = targetData["evidence_type"];
        result["type"] = targetData["type"];
        result["status"] = candidateData["status"] ?? targetData["status"];
        result["source"] = candidateData["source"] ?? targetData["source"];
        result["valid_from"] = candidateData["valid_from"] ?? targetData["valid_from"];
        result["valid_to"] = candidateData["valid_to"] ?? targetData["valid_to"];
      } else if (targetType === "event") {
        result["timestamp"] = targetData["timestamp"];
        result["summary"] = targetData["summary"];
        result["type"] = candidateData["type"] ?? targetData["type"];
        result["impact_summary"] = candidateData["impact_summary"] ?? targetData["impact_summary"];
        result["tags"] = Array.from(
          new Set([
            ...(Array.isArray(targetData["tags"]) ? targetData["tags"] : []),
            ...(Array.isArray(candidateData["tags"]) ? candidateData["tags"] : []),
          ]),
        );
      } else {
        result["source_id"] = targetData["source_id"];
        result["target_id"] = targetData["target_id"];
        result["predicate"] = targetData["predicate"];
        result["weight"] = Math.max(
          Number(targetData["weight"] ?? 0),
          Number(candidateData["weight"] ?? 0),
        );
        result["valid_from"] = candidateData["valid_from"] ?? targetData["valid_from"];
        result["valid_to"] = candidateData["valid_to"] ?? targetData["valid_to"];
      }
    }
    validateOrThrow(result as unknown as AnyPrimitive);
    return result as unknown as AnyPrimitive;
  }

  private insertPrimitiveRows(primitive: AnyPrimitive): void {
    validateOrThrow(primitive);
    const type = this.primitiveType(primitive);
    const p = primitive as unknown as Record<string, unknown>;
    if (type === "relation") {
      const source = this.db
        .prepare("SELECT 1 FROM primitives_registry WHERE id = ?")
        .get(p["source_id"]);
      const target = this.db
        .prepare("SELECT 1 FROM primitives_registry WHERE id = ?")
        .get(p["target_id"]);
      if (!source || !target) {
        throw new DanglingReferenceError(
          `Dangling relation reference for '${primitive.id}'.`,
          PAKBErrorCode.DANGLING_REFERENCE_ERROR,
          primitive.id,
        );
      }
    }
    this.db
      .prepare("INSERT INTO primitives_registry (id, primitive_type) VALUES (?, ?)")
      .run(primitive.id, type);
    if (type === "entity") {
      this.db
        .prepare(
          "INSERT INTO entities (id, schema_version, created_at, updated_at, last_verified, sensitivity, volatility, activation, name, type, status, locale_info, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          p["id"],
          p["schema_version"],
          p["created_at"],
          p["updated_at"],
          p["last_verified"],
          p["sensitivity"],
          p["volatility"],
          p["activation"],
          p["name"],
          p["type"],
          p["status"] ?? null,
          p["locale_info"] ? JSON.stringify(p["locale_info"]) : null,
          p["description"] ?? null,
          p["metadata"] ? JSON.stringify(p["metadata"]) : null,
        );
    } else if (type === "directive") {
      this.db
        .prepare(
          "INSERT INTO directives (id, schema_version, created_at, updated_at, last_verified, sensitivity, volatility, activation, statement, enforcement, domain, cadence, exemption_scope, rationale, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          p["id"],
          p["schema_version"],
          p["created_at"],
          p["updated_at"],
          p["last_verified"],
          p["sensitivity"],
          p["volatility"],
          p["activation"],
          p["statement"],
          p["enforcement"],
          p["domain"],
          p["cadence"] ?? null,
          p["exemption_scope"] ?? null,
          p["rationale"] ?? null,
          p["metadata"] ? JSON.stringify(p["metadata"]) : null,
        );
    } else if (type === "assertion") {
      this.db
        .prepare(
          "INSERT INTO assertions (id, schema_version, created_at, updated_at, last_verified, sensitivity, volatility, activation, claim, evidence_type, type, status, source, valid_from, valid_to, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          p["id"],
          p["schema_version"],
          p["created_at"],
          p["updated_at"],
          p["last_verified"],
          p["sensitivity"],
          p["volatility"],
          p["activation"],
          p["claim"],
          p["evidence_type"],
          p["type"],
          p["status"] ?? null,
          p["source"] ?? null,
          p["valid_from"] ?? null,
          p["valid_to"] ?? null,
          p["metadata"] ? JSON.stringify(p["metadata"]) : null,
        );
    } else if (type === "event") {
      this.db
        .prepare(
          "INSERT INTO events (id, schema_version, created_at, updated_at, last_verified, sensitivity, volatility, activation, timestamp, summary, type, impact_summary, tags, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          p["id"],
          p["schema_version"],
          p["created_at"],
          p["updated_at"],
          p["last_verified"],
          p["sensitivity"],
          p["volatility"],
          p["activation"],
          p["timestamp"],
          p["summary"],
          p["type"] ?? null,
          p["impact_summary"] ?? null,
          p["tags"] ? JSON.stringify(p["tags"]) : null,
          p["metadata"] ? JSON.stringify(p["metadata"]) : null,
        );
    } else {
      this.db
        .prepare(
          "INSERT INTO relations (id, schema_version, created_at, updated_at, last_verified, sensitivity, volatility, activation, source_id, target_id, predicate, valid_from, valid_to, weight, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          p["id"],
          p["schema_version"],
          p["created_at"],
          p["updated_at"],
          p["last_verified"],
          p["sensitivity"],
          p["volatility"],
          p["activation"],
          p["source_id"],
          p["target_id"],
          p["predicate"],
          p["valid_from"] ?? null,
          p["valid_to"] ?? null,
          p["weight"] ?? null,
          p["metadata"] ? JSON.stringify(p["metadata"]) : null,
        );
    }
  }

  private updatePrimitiveRows(primitive: AnyPrimitive, expectedUpdatedAt: string): number {
    validateOrThrow(primitive);
    const p = primitive as unknown as Record<string, unknown>;
    const type = this.primitiveType(primitive);
    if (type === "entity")
      return this.db
        .prepare(
          "UPDATE entities SET updated_at = ?, last_verified = ?, volatility = ?, activation = ?, name = ?, type = ?, status = ?, locale_info = ?, description = ?, metadata = ? WHERE id = ? AND updated_at = ? AND sensitivity = ?",
        )
        .run(
          p["updated_at"],
          p["last_verified"],
          p["volatility"],
          p["activation"],
          p["name"],
          p["type"],
          p["status"] ?? null,
          p["locale_info"] ? JSON.stringify(p["locale_info"]) : null,
          p["description"] ?? null,
          p["metadata"] ? JSON.stringify(p["metadata"]) : null,
          p["id"],
          expectedUpdatedAt,
          p["sensitivity"],
        ).changes;
    if (type === "directive")
      return this.db
        .prepare(
          "UPDATE directives SET updated_at = ?, last_verified = ?, volatility = ?, activation = ?, statement = ?, enforcement = ?, domain = ?, cadence = ?, exemption_scope = ?, rationale = ?, metadata = ? WHERE id = ? AND updated_at = ? AND sensitivity = ?",
        )
        .run(
          p["updated_at"],
          p["last_verified"],
          p["volatility"],
          p["activation"],
          p["statement"],
          p["enforcement"],
          p["domain"],
          p["cadence"] ?? null,
          p["exemption_scope"] ?? null,
          p["rationale"] ?? null,
          p["metadata"] ? JSON.stringify(p["metadata"]) : null,
          p["id"],
          expectedUpdatedAt,
          p["sensitivity"],
        ).changes;
    if (type === "assertion")
      return this.db
        .prepare(
          "UPDATE assertions SET updated_at = ?, last_verified = ?, volatility = ?, activation = ?, claim = ?, evidence_type = ?, type = ?, status = ?, source = ?, valid_from = ?, valid_to = ?, metadata = ? WHERE id = ? AND updated_at = ? AND sensitivity = ?",
        )
        .run(
          p["updated_at"],
          p["last_verified"],
          p["volatility"],
          p["activation"],
          p["claim"],
          p["evidence_type"],
          p["type"],
          p["status"] ?? null,
          p["source"] ?? null,
          p["valid_from"] ?? null,
          p["valid_to"] ?? null,
          p["metadata"] ? JSON.stringify(p["metadata"]) : null,
          p["id"],
          expectedUpdatedAt,
          p["sensitivity"],
        ).changes;
    if (type === "event")
      return this.db
        .prepare(
          "UPDATE events SET updated_at = ?, last_verified = ?, volatility = ?, activation = ?, timestamp = ?, summary = ?, type = ?, impact_summary = ?, tags = ?, metadata = ? WHERE id = ? AND updated_at = ? AND sensitivity = ?",
        )
        .run(
          p["updated_at"],
          p["last_verified"],
          p["volatility"],
          p["activation"],
          p["timestamp"],
          p["summary"],
          p["type"] ?? null,
          p["impact_summary"] ?? null,
          p["tags"] ? JSON.stringify(p["tags"]) : null,
          p["metadata"] ? JSON.stringify(p["metadata"]) : null,
          p["id"],
          expectedUpdatedAt,
          p["sensitivity"],
        ).changes;
    return this.db
      .prepare(
        "UPDATE relations SET updated_at = ?, last_verified = ?, volatility = ?, activation = ?, predicate = ?, valid_from = ?, valid_to = ?, weight = ?, metadata = ? WHERE id = ? AND updated_at = ? AND sensitivity = ? AND source_id = ? AND target_id = ?",
      )
      .run(
        p["updated_at"],
        p["last_verified"],
        p["volatility"],
        p["activation"],
        p["predicate"],
        p["valid_from"] ?? null,
        p["valid_to"] ?? null,
        p["weight"] ?? null,
        p["metadata"] ? JSON.stringify(p["metadata"]) : null,
        p["id"],
        expectedUpdatedAt,
        p["sensitivity"],
        p["source_id"],
        p["target_id"],
      ).changes;
  }

  public async insertPrimitive(
    primitive: AnyPrimitive,
    options?: { autorename?: boolean },
  ): Promise<void> {
    validateOrThrow(primitive);

    const cloned = JSON.parse(JSON.stringify(primitive)) as AnyPrimitive;

    const targetPrimitive = cloned;

    const existing = await this.getPrimitive(targetPrimitive.id);
    if (existing) {
      const existingHash = calculateJCSHash(existing);
      const incomingHash = calculateJCSHash(targetPrimitive);
      if (existingHash === incomingHash) {
        return; // Idempotent merge
      }
      if (!options?.autorename) {
        throw new IDCollisionError(
          `ID collision for primitive '${targetPrimitive.id}' with differing content.`,
          PAKBErrorCode.ID_COLLISION_ERROR,
          targetPrimitive.id,
        );
      }
      // Autorename: generate new ULID matching primitive class
      let pType: "entity" | "directive" | "assertion" | "event" | "relation" = "entity";
      if (targetPrimitive.id.startsWith("dir_")) pType = "directive";
      else if (targetPrimitive.id.startsWith("ast_")) pType = "assertion";
      else if (targetPrimitive.id.startsWith("evt_")) pType = "event";
      else if (targetPrimitive.id.startsWith("rel_")) pType = "relation";

      const newId = generateULID(pType);
      (targetPrimitive as unknown as Record<string, unknown>)["id"] = newId;
    }

    if ("source_id" in targetPrimitive && "target_id" in targetPrimitive) {
      const sourceExists = this.db
        .prepare("SELECT 1 FROM primitives_registry WHERE id = ?")
        .get(targetPrimitive.source_id);
      const targetExists = this.db
        .prepare("SELECT 1 FROM primitives_registry WHERE id = ?")
        .get(targetPrimitive.target_id);
      if (!sourceExists || !targetExists) {
        throw new DanglingReferenceError(
          `Dangling relation reference: source '${targetPrimitive.source_id}' or target '${targetPrimitive.target_id}' does not exist.`,
          PAKBErrorCode.DANGLING_REFERENCE_ERROR,
          targetPrimitive.id,
        );
      }
    }

    let primType = "entity";
    if (targetPrimitive.id.startsWith("dir_")) primType = "directive";
    else if (targetPrimitive.id.startsWith("ast_")) primType = "assertion";
    else if (targetPrimitive.id.startsWith("evt_")) primType = "event";
    else if (targetPrimitive.id.startsWith("rel_")) primType = "relation";

    this.db.transaction(() => {
      this.db
        .prepare("INSERT INTO primitives_registry (id, primitive_type) VALUES (?, ?)")
        .run(targetPrimitive.id, primType);

      if (primType === "entity") {
        const p = targetPrimitive as unknown as Record<string, unknown>;
        this.db
          .prepare(`
          INSERT INTO entities (id, schema_version, created_at, updated_at, last_verified, sensitivity, volatility, activation, name, type, status, locale_info, description, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
          .run(
            p["id"],
            p["schema_version"],
            p["created_at"],
            p["updated_at"],
            p["last_verified"],
            p["sensitivity"],
            p["volatility"],
            p["activation"],
            p["name"],
            p["type"],
            p["status"] ?? null,
            p["locale_info"] ? JSON.stringify(p["locale_info"]) : null,
            p["description"] ?? null,
            p["metadata"] ? JSON.stringify(p["metadata"]) : null,
          );
      } else if (primType === "directive") {
        const p = targetPrimitive as unknown as Record<string, unknown>;
        this.db
          .prepare(`
          INSERT INTO directives (id, schema_version, created_at, updated_at, last_verified, sensitivity, volatility, activation, statement, enforcement, domain, cadence, exemption_scope, rationale, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
          .run(
            p["id"],
            p["schema_version"],
            p["created_at"],
            p["updated_at"],
            p["last_verified"],
            p["sensitivity"],
            p["volatility"],
            p["activation"],
            p["statement"],
            p["enforcement"],
            p["domain"],
            p["cadence"] ?? null,
            p["exemption_scope"] ?? null,
            p["rationale"] ?? null,
            p["metadata"] ? JSON.stringify(p["metadata"]) : null,
          );
      } else if (primType === "assertion") {
        const p = targetPrimitive as unknown as Record<string, unknown>;
        this.db
          .prepare(`
          INSERT INTO assertions (id, schema_version, created_at, updated_at, last_verified, sensitivity, volatility, activation, claim, evidence_type, type, status, source, valid_from, valid_to, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
          .run(
            p["id"],
            p["schema_version"],
            p["created_at"],
            p["updated_at"],
            p["last_verified"],
            p["sensitivity"],
            p["volatility"],
            p["activation"],
            p["claim"],
            p["evidence_type"],
            p["type"],
            p["status"] ?? null,
            p["source"] ?? null,
            p["valid_from"] ?? null,
            p["valid_to"] ?? null,
            p["metadata"] ? JSON.stringify(p["metadata"]) : null,
          );
      } else if (primType === "event") {
        const p = targetPrimitive as unknown as Record<string, unknown>;
        this.db
          .prepare(`
          INSERT INTO events (id, schema_version, created_at, updated_at, last_verified, sensitivity, volatility, activation, timestamp, summary, type, impact_summary, tags, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
          .run(
            p["id"],
            p["schema_version"],
            p["created_at"],
            p["updated_at"],
            p["last_verified"],
            p["sensitivity"],
            p["volatility"],
            p["activation"],
            p["timestamp"],
            p["summary"],
            p["type"] ?? null,
            p["impact_summary"] ?? null,
            p["tags"] ? JSON.stringify(p["tags"]) : null,
            p["metadata"] ? JSON.stringify(p["metadata"]) : null,
          );
      } else if (primType === "relation") {
        const p = targetPrimitive as unknown as Record<string, unknown>;
        this.db
          .prepare(`
          INSERT INTO relations (id, schema_version, created_at, updated_at, last_verified, sensitivity, volatility, activation, source_id, target_id, predicate, valid_from, valid_to, weight, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
          .run(
            p["id"],
            p["schema_version"],
            p["created_at"],
            p["updated_at"],
            p["last_verified"],
            p["sensitivity"],
            p["volatility"],
            p["activation"],
            p["source_id"],
            p["target_id"],
            p["predicate"],
            p["valid_from"] ?? null,
            p["valid_to"] ?? null,
            p["weight"] ?? null,
            p["metadata"] ? JSON.stringify(p["metadata"]) : null,
          );
      }

      this.appendAuditRecordSync(targetPrimitive, "CREATE", "human_user");
    })();
  }

  public async getProposalRecord(proposalId: string): Promise<StorageProposalRecord | null> {
    const row = this.db
      .prepare("SELECT * FROM memory_proposals WHERE proposal_id = ?")
      .get(proposalId) as Record<string, unknown> | undefined;
    return row ? this.toProposalRecord(row) : null;
  }

  public async getPendingProposals(): Promise<readonly StorageProposalRecord[]> {
    const rows = this.db
      .prepare("SELECT * FROM memory_proposals WHERE status = 'pending' ORDER BY created_at DESC")
      .all() as Array<Record<string, unknown>>;
    return rows.map((row) => this.toProposalRecord(row));
  }

  public async getAuditHistory(): Promise<readonly StorageAuditRecord[]> {
    const rows = this.db
      .prepare(
        "SELECT * FROM audit_log ORDER BY chain_version DESC, chain_sequence DESC, timestamp DESC",
      )
      .all() as Array<Record<string, unknown>>;
    return rows.map((row) => this.toAuditRecord(row));
  }

  private toProposalRecord(row: Record<string, unknown>): StorageProposalRecord {
    return {
      proposal_id: String(row["proposal_id"]),
      candidate_primitive_json: String(row["candidate_primitive_json"]),
      decision_type: String(row["decision_type"]) as StorageProposalRecord["decision_type"],
      target_primitive_id: row["target_primitive_id"]
        ? String(row["target_primitive_id"])
        : undefined,
      expected_updated_at: row["expected_updated_at"]
        ? String(row["expected_updated_at"])
        : undefined,
      confidence_score: Number(row["confidence_score"]),
      status: String(row["status"]) as StorageProposalRecord["status"],
      reasoning: String(row["reasoning"] ?? ""),
      created_at: String(row["created_at"]),
    };
  }

  private toAuditRecord(row: Record<string, unknown>): StorageAuditRecord {
    return {
      log_id: String(row["log_id"]),
      timestamp: String(row["timestamp"]),
      primitive_id: String(row["primitive_id"]),
      operation_type: String(row["operation_type"]),
      initiator: String(row["initiator"]),
      primitive_jcs_hash: String(row["primitive_jcs_hash"] ?? ""),
      previous_jcs_hash: String(row["previous_jcs_hash"] ?? ""),
      new_jcs_hash: String(row["new_jcs_hash"]),
      chain_version: Number(row["chain_version"] ?? 0),
      chain_sequence: Number(row["chain_sequence"] ?? 0),
    };
  }

  private saveProposalRecordSync(record: StorageProposalRecord): void {
    this.db
      .prepare(`
      INSERT INTO memory_proposals (proposal_id, candidate_primitive_json, decision_type, target_primitive_id, expected_updated_at, confidence_score, status, reasoning, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(proposal_id) DO UPDATE SET
        target_primitive_id = excluded.target_primitive_id,
        expected_updated_at = excluded.expected_updated_at,
        confidence_score = excluded.confidence_score,
        status = excluded.status,
        reasoning = excluded.reasoning
    `)
      .run(
        record.proposal_id,
        record.candidate_primitive_json,
        record.decision_type,
        record.target_primitive_id ?? null,
        record.expected_updated_at ?? null,
        record.confidence_score,
        record.status,
        record.reasoning,
        record.created_at,
      );
  }

  private appendAuditRecordSync(
    primitive: AnyPrimitive,
    operationType: string,
    initiator: string,
  ): StorageAuditRecord {
    const latest = this.db
      .prepare(
        "SELECT * FROM audit_log WHERE chain_version = 1 ORDER BY chain_sequence DESC LIMIT 1",
      )
      .get() as Record<string, unknown> | undefined;
    const chainSequence = Number(latest?.["chain_sequence"] ?? 0) + 1;
    const previousJcsHash = latest ? String(latest["new_jcs_hash"]) : "0".repeat(64);
    const logId = `log_${ulid().toUpperCase()}`;
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const primitiveJcsHash = calculateJCSHash(primitive);
    const payload = {
      chain_version: 1,
      chain_sequence: chainSequence,
      previous_jcs_hash: previousJcsHash,
      log_id: logId,
      timestamp,
      primitive_id: primitive.id,
      operation_type: operationType,
      initiator,
      primitive_jcs_hash: primitiveJcsHash,
    };
    const newJcsHash = calculateJCSHash(payload);
    this.db
      .prepare(
        "INSERT INTO audit_log (log_id, timestamp, primitive_id, operation_type, initiator, primitive_jcs_hash, previous_jcs_hash, new_jcs_hash, chain_version, chain_sequence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)",
      )
      .run(
        logId,
        timestamp,
        primitive.id,
        operationType,
        initiator,
        primitiveJcsHash,
        previousJcsHash,
        newJcsHash,
        chainSequence,
      );
    return {
      log_id: logId,
      timestamp,
      primitive_id: primitive.id,
      operation_type: operationType,
      initiator,
      primitive_jcs_hash: primitiveJcsHash,
      previous_jcs_hash: previousJcsHash,
      new_jcs_hash: newJcsHash,
      chain_version: 1,
      chain_sequence: chainSequence,
    };
  }

  public executeAtomicMutationTransaction(input: StorageMutationInput): StorageMutationResult {
    const transaction = this.db.transaction(() => {
      let persisted: AnyPrimitive;
      if (input.type === "CREATE") {
        if (this.getPrimitiveSync(input.candidate_primitive.id)) {
          throw new IDCollisionError(
            `ID collision for primitive '${input.candidate_primitive.id}'.`,
          );
        }
        persisted = input.candidate_primitive;
        this.insertPrimitiveRows(persisted);
      } else {
        if (!input.target_primitive_id || !input.expected_updated_at) {
          throw new Error(`${input.type} requires target_primitive_id and expected_updated_at.`);
        }
        const target = this.getPrimitiveSync(input.target_primitive_id);
        if (!target) {
          throw new PrimitiveNotFoundError(`Primitive '${input.target_primitive_id}' not found.`);
        }
        if (target.updated_at !== input.expected_updated_at) {
          throw new ConcurrentModificationError(`OCC lock error for '${target.id}'.`);
        }
        persisted = this.constructMutation(target, input.candidate_primitive, input.type);
        if (this.updatePrimitiveRows(persisted, input.expected_updated_at) !== 1) {
          throw new ConcurrentModificationError(`OCC lock error for '${target.id}'.`);
        }
      }
      this.saveProposalRecordSync(input.proposal);
      const audit = this.appendAuditRecordSync(persisted, input.operation_type, input.initiator);
      return {
        persisted_primitive: persisted,
        proposal_record: input.proposal,
        audit_record: audit,
      };
    });
    return transaction();
  }

  public saveProposalWithAudit(
    proposal: StorageProposalRecord,
    auditPrimitive: AnyPrimitive,
    operationType: string,
    initiator: string,
  ): StorageAuditRecord {
    const transaction = this.db.transaction(() => {
      this.saveProposalRecordSync(proposal);
      return this.appendAuditRecordSync(auditPrimitive, operationType, initiator);
    });
    return transaction();
  }

  public verifyAuditChain(): AuditChainVerification {
    const rows = this.db
      .prepare("SELECT * FROM audit_log WHERE chain_version = 1 ORDER BY chain_sequence ASC")
      .all() as Array<Record<string, unknown>>;
    let previousHash = "0".repeat(64);
    let expectedSequence = 1;
    for (const row of rows) {
      const audit = this.toAuditRecord(row);
      if (audit.chain_sequence !== expectedSequence || audit.previous_jcs_hash !== previousHash) {
        return {
          valid: false,
          broken_at_log_id: audit.log_id,
          reason: "sequence or previous hash mismatch",
        };
      }
      const payload = {
        chain_version: 1,
        chain_sequence: audit.chain_sequence,
        previous_jcs_hash: audit.previous_jcs_hash,
        log_id: audit.log_id,
        timestamp: audit.timestamp,
        primitive_id: audit.primitive_id,
        operation_type: audit.operation_type,
        initiator: audit.initiator,
        primitive_jcs_hash: audit.primitive_jcs_hash,
      };
      if (calculateJCSHash(payload) !== audit.new_jcs_hash) {
        return { valid: false, broken_at_log_id: audit.log_id, reason: "hash mismatch" };
      }
      previousHash = audit.new_jcs_hash;
      expectedSequence++;
    }
    return { valid: true };
  }

  public async updatePrimitive(primitive: AnyPrimitive, expectedUpdatedAt: string): Promise<void> {
    const target = this.getPrimitiveSync(primitive.id);
    if (!target) {
      throw new PrimitiveNotFoundError(
        `Primitive '${primitive.id}' not found.`,
        PAKBErrorCode.PRIMITIVE_NOT_FOUND_ERROR,
        primitive.id,
      );
    }
    if (target.updated_at !== expectedUpdatedAt) {
      throw new ConcurrentModificationError(
        `OCC lock error for '${primitive.id}': expected '${expectedUpdatedAt}' but found '${target.updated_at}'.`,
        PAKBErrorCode.CONCURRENT_MODIFICATION_ERROR,
        primitive.id,
      );
    }
    const updated = this.constructMutation(target, primitive, "UPDATE");
    const transaction = this.db.transaction(() => {
      if (this.updatePrimitiveRows(updated, expectedUpdatedAt) !== 1) {
        throw new ConcurrentModificationError(
          `OCC lock error for '${primitive.id}'.`,
          PAKBErrorCode.CONCURRENT_MODIFICATION_ERROR,
          primitive.id,
        );
      }
      this.appendAuditRecordSync(updated, "UPDATE", "human_user");
    });
    transaction();
  }

  public async archivePrimitive(id: string): Promise<void> {
    const existing = await this.getPrimitive(id);
    if (!existing) {
      throw new PrimitiveNotFoundError(
        `Primitive '${id}' not found.`,
        PAKBErrorCode.PRIMITIVE_NOT_FOUND_ERROR,
        id,
      );
    }

    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    this.db.transaction(() => {
      if (id.startsWith("ent_")) {
        this.db
          .prepare("UPDATE entities SET status = 'archived', updated_at = ? WHERE id = ?")
          .run(now, id);
      } else if (id.startsWith("ast_")) {
        this.db
          .prepare("UPDATE assertions SET status = 'superseded', updated_at = ? WHERE id = ?")
          .run(now, id);
      }
    })();
  }

  public async deletePrimitive(id: string, options?: { hard_delete?: boolean }): Promise<void> {
    const existing = await this.getPrimitive(id);
    if (!existing) {
      throw new PrimitiveNotFoundError(
        `Primitive '${id}' not found for deletion.`,
        PAKBErrorCode.PRIMITIVE_NOT_FOUND_ERROR,
        id,
      );
    }

    if (options?.hard_delete) {
      this.db.transaction(() => {
        this.db.prepare("DELETE FROM relations WHERE source_id = ? OR target_id = ?").run(id, id);
        this.db.prepare("DELETE FROM primitives_registry WHERE id = ?").run(id);
      })();
    } else {
      await this.archivePrimitive(id);
    }
  }

  public async searchFTS5(query: string, options?: SearchOptions): Promise<SearchResponse> {
    if (!query || typeof query !== "string") {
      return {
        total_matches: 0,
        limit: options?.limit ?? 10,
        offset: options?.offset ?? 0,
        results: [],
      };
    }

    const limit = options?.limit ?? 10;
    const offset = options?.offset ?? 0;
    const sensitivityLimit = options?.sensitivity_limit ?? SensitivityTier.INTERNAL;

    // Sanitize FTS5 query terms to prevent FTS syntax exceptions
    const sanitizedQuery = `"${query.replace(/"/g, '""')}"`;

    const sql = `
      SELECT primitive_id, primitive_type, rank, snippet(fts_knowledge_index, 2, '<b>', '</b>', '...', 10) as snippet
      FROM fts_knowledge_index
      WHERE fts_knowledge_index MATCH ?
      ORDER BY rank ASC
      LIMIT ? OFFSET ?
    `;

    try {
      const rows = this.db.prepare(sql).all(sanitizedQuery, limit, offset) as Array<{
        primitive_id: string;
        primitive_type: string;
        rank: number;
        snippet: string;
      }>;

      const results: SearchResult[] = [];
      for (const row of rows) {
        const prim = await this.getPrimitive(row.primitive_id);
        if (prim && prim.sensitivity !== SensitivityTier.RESTRICTED) {
          if (
            sensitivityLimit === SensitivityTier.PUBLIC &&
            prim.sensitivity !== SensitivityTier.PUBLIC
          ) {
            continue;
          }
          let claim = "";
          if ("name" in prim) claim = (prim as { name: string }).name;
          else if ("statement" in prim) claim = (prim as { statement: string }).statement;
          else if ("claim" in prim) claim = (prim as { claim: string }).claim;

          results.push({
            id: row.primitive_id,
            primitive_type: row.primitive_type,
            score: row.rank,
            snippet: row.snippet,
            headline_claim: claim,
          });
        }
      }

      return { total_matches: results.length, limit, offset, results };
    } catch {
      return { total_matches: 0, limit, offset, results: [] };
    }
  }

  public async upsertVectorEmbedding(primitiveId: string, embedding: Float32Array): Promise<void> {
    const existing = await this.getPrimitive(primitiveId);
    if (!existing) {
      throw new PrimitiveNotFoundError(
        `Primitive '${primitiveId}' not found for embedding attachment.`,
      );
    }

    const serialized = serializeVector(embedding);
    const sql = `
      INSERT INTO vector_embeddings (primitive_id, dimensions, embedding_blob, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(primitive_id) DO UPDATE SET
        dimensions = excluded.dimensions,
        embedding_blob = excluded.embedding_blob,
        updated_at = excluded.updated_at
    `;
    this.db
      .prepare(sql)
      .run(
        primitiveId,
        embedding.length,
        serialized,
        new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      );
  }

  public async getVectorEmbedding(primitiveId: string): Promise<Float32Array | null> {
    const sql = "SELECT dimensions, embedding_blob FROM vector_embeddings WHERE primitive_id = ?";
    const row = this.db.prepare(sql).get(primitiveId) as
      | { dimensions: number; embedding_blob: Buffer }
      | undefined;
    if (!row) return null;
    return deserializeVector(row.embedding_blob);
  }

  public async searchVector(
    queryEmbedding: Float32Array,
    options?: { limit?: number; sensitivity_limit?: SensitivityTier },
  ): Promise<VectorSearchResult> {
    const limit = options?.limit ?? 10;
    const sensitivityLimit = options?.sensitivity_limit ?? SensitivityTier.INTERNAL;

    const sql =
      "SELECT primitive_id, dimensions, embedding_blob FROM vector_embeddings WHERE dimensions = ?";
    const rows = this.db.prepare(sql).all(queryEmbedding.length) as Array<{
      primitive_id: string;
      dimensions: number;
      embedding_blob: Buffer;
    }>;

    const matches: VectorMatch[] = [];
    for (const row of rows) {
      const prim = await this.getPrimitive(row.primitive_id);
      if (prim && prim.sensitivity !== SensitivityTier.RESTRICTED) {
        if (
          sensitivityLimit === SensitivityTier.PUBLIC &&
          prim.sensitivity !== SensitivityTier.PUBLIC
        ) {
          continue;
        }

        const vec = deserializeVector(row.embedding_blob);
        const score = cosineSimilarity(queryEmbedding, vec);
        matches.push({
          primitive_id: row.primitive_id,
          similarity_score: score,
          primitive: prim,
        });
      }
    }

    matches.sort((a, b) => b.similarity_score - a.similarity_score);
    const sliced = matches.slice(0, limit);

    return {
      total_matches: sliced.length,
      results: sliced,
    };
  }

  public async searchHybrid(
    query: string,
    queryEmbedding?: Float32Array | null,
    options?: HybridSearchOptions,
  ): Promise<HybridSearchResult> {
    const limit = options?.limit ?? 10;
    const alpha = options?.alpha ?? 0.5;

    // 1. FTS Keyword Search
    const ftsOptions: SearchOptions = { limit: limit * 2 };
    if (options?.sensitivity_limit !== undefined) {
      (ftsOptions as { sensitivity_limit?: SensitivityTier }).sensitivity_limit =
        options.sensitivity_limit;
    }
    const ftsResponse = await this.searchFTS5(query, ftsOptions);

    // 2. Vector Search (if embedding provided)
    let vectorResponse: VectorSearchResult = { total_matches: 0, results: [] };
    if (queryEmbedding && queryEmbedding.length > 0) {
      const vecOptions: { limit?: number; sensitivity_limit?: SensitivityTier } = {
        limit: limit * 2,
      };
      if (options?.sensitivity_limit !== undefined) {
        vecOptions.sensitivity_limit = options.sensitivity_limit;
      }
      vectorResponse = await this.searchVector(queryEmbedding, vecOptions);
    }

    // 3. Reciprocal Rank Fusion (RRF) Combined Scoring
    const scoreMap = new Map<
      string,
      {
        ftsRank: number | null;
        vectorScore: number | null;
        rrfScore: number;
        primitive: AnyPrimitive | null;
      }
    >();

    // Process FTS Ranks
    ftsResponse.results.forEach((ftsResult, index) => {
      const rank = index + 1;
      const rrfContribution = alpha / (rank + 60);
      scoreMap.set(ftsResult.id, {
        ftsRank: rank,
        vectorScore: null,
        rrfScore: rrfContribution,
        primitive: null,
      });
    });

    // Process Vector Ranks
    vectorResponse.results.forEach((vecMatch, index) => {
      const rank = index + 1;
      const rrfContribution = (1 - alpha) / (rank + 60);
      const existing = scoreMap.get(vecMatch.primitive_id);

      if (existing) {
        scoreMap.set(vecMatch.primitive_id, {
          ...existing,
          vectorScore: vecMatch.similarity_score,
          rrfScore: existing.rrfScore + rrfContribution,
          primitive: vecMatch.primitive ?? existing.primitive,
        });
      } else {
        scoreMap.set(vecMatch.primitive_id, {
          ftsRank: null,
          vectorScore: vecMatch.similarity_score,
          rrfScore: rrfContribution,
          primitive: vecMatch.primitive ?? null,
        });
      }
    });

    // Hydrate primitives if needed and assemble results
    const combinedItems: HybridSearchResultItem[] = [];
    for (const [id, data] of scoreMap.entries()) {
      const prim = data.primitive ?? (await this.getPrimitive(id));
      combinedItems.push({
        primitive_id: id,
        combined_score: data.rrfScore,
        fts_rank: data.ftsRank,
        vector_score: data.vectorScore,
        primitive: prim,
      });
    }

    combinedItems.sort((a, b) => b.combined_score - a.combined_score);
    const finalResults = combinedItems.slice(0, limit);

    return {
      total_matches: finalResults.length,
      results: finalResults,
    };
  }

  public async traverseGraph(
    seedId: string,
    maxDepth = 3,
    predicates?: string[],
  ): Promise<GraphResult> {
    const depthLimit = Math.min(maxDepth, 3);

    const sql = `
      WITH RECURSIVE graph_traversal(node_id, depth, path) AS (
        SELECT ? AS node_id, 0 AS depth, '/' || ? || '/' AS path
        UNION ALL
        SELECT 
          CASE WHEN r.source_id = gt.node_id THEN r.target_id ELSE r.source_id END AS node_id,
          gt.depth + 1 AS depth,
          gt.path || CASE WHEN r.source_id = gt.node_id THEN r.target_id ELSE r.source_id END || '/' AS path
        FROM graph_traversal gt
        JOIN relations r ON (r.source_id = gt.node_id OR r.target_id = gt.node_id)
        WHERE gt.depth < ?
          AND r.sensitivity != 'restricted'
          AND instr(gt.path, '/' || CASE WHEN r.source_id = gt.node_id THEN r.target_id ELSE r.source_id END || '/') = 0
      )
      SELECT DISTINCT node_id, depth FROM graph_traversal;
    `;

    const rows = this.db.prepare(sql).all(seedId, seedId, depthLimit) as Array<{
      node_id: string;
      depth: number;
    }>;

    const nodes: GraphNode[] = [];
    for (const row of rows) {
      const prim = await this.getPrimitive(row.node_id);
      if (prim && prim.sensitivity !== SensitivityTier.RESTRICTED) {
        nodes.push({ id: row.node_id, depth: row.depth, primitive: prim });
      }
    }

    const nodeIds = new Set(nodes.map((n) => n.id));
    const edgesRows = this.db
      .prepare("SELECT * FROM relations WHERE sensitivity != 'restricted'")
      .all() as Array<Record<string, unknown>>;
    const edges: GraphEdge[] = [];

    for (const r of edgesRows) {
      const sourceId = r["source_id"] as string;
      const targetId = r["target_id"] as string;
      const pred = r["predicate"] as string;
      if (nodeIds.has(sourceId) && nodeIds.has(targetId)) {
        if (!predicates || predicates.includes(pred)) {
          edges.push({
            id: r["id"] as string,
            source_id: sourceId,
            target_id: targetId,
            predicate: pred,
          });
        }
      }
    }

    return { seed_id: seedId, max_depth: depthLimit, nodes, edges };
  }

  public async getTimeline(options?: TimelineOptions): Promise<TimelineResponse> {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    let sql = "SELECT * FROM events WHERE sensitivity != 'restricted'";
    const params: unknown[] = [];

    if (options?.start_time) {
      sql += " AND timestamp >= ?";
      params.push(options.start_time);
    }
    if (options?.end_time) {
      sql += " AND timestamp <= ?";
      params.push(options.end_time);
    }
    if (options?.type) {
      sql += " AND type = ?";
      params.push(options.type);
    }

    sql += " ORDER BY timestamp DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const rows = this.db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
    const events: AnyPrimitive[] = [];

    for (const row of rows) {
      if (typeof row["metadata"] === "string")
        row["metadata"] = JSON.parse(row["metadata"] as string);
      if (typeof row["tags"] === "string") row["tags"] = JSON.parse(row["tags"] as string);
      events.push(row as unknown as AnyPrimitive);
    }

    return { total_count: events.length, limit, offset, events };
  }

  public async getMemoryLifecycle(primitiveId: string): Promise<MemoryLifecycleRecord | null> {
    const sql =
      "SELECT primitive_id, importance_score, access_count, created_at, last_accessed_at, metadata FROM memory_lifecycle WHERE primitive_id = ?";
    const row = this.db.prepare(sql).get(primitiveId) as Record<string, unknown> | undefined;
    if (!row) return null;

    let meta: Record<string, unknown> | null = null;
    if (typeof row["metadata"] === "string") {
      try {
        meta = JSON.parse(row["metadata"] as string);
      } catch {}
    }

    return {
      primitive_id: String(row["primitive_id"]),
      importance_score: Number(row["importance_score"]),
      access_count: Number(row["access_count"]),
      created_at: String(row["created_at"]),
      last_accessed_at: String(row["last_accessed_at"]),
      metadata: meta,
    };
  }

  public async setMemoryImportance(primitiveId: string, score: number): Promise<void> {
    const clamped = Math.max(0, Math.min(1, score));
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const sql = `
      INSERT INTO memory_lifecycle (primitive_id, importance_score, access_count, created_at, last_accessed_at)
      VALUES (?, ?, 0, ?, ?)
      ON CONFLICT(primitive_id) DO UPDATE SET importance_score = excluded.importance_score
    `;
    this.db.prepare(sql).run(primitiveId, clamped, now, now);
  }

  public async touchMemoryAccess(primitiveId: string): Promise<void> {
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const sql = `
      INSERT INTO memory_lifecycle (primitive_id, importance_score, access_count, created_at, last_accessed_at)
      VALUES (?, 0.5, 1, ?, ?)
      ON CONFLICT(primitive_id) DO UPDATE SET
        access_count = access_count + 1,
        last_accessed_at = excluded.last_accessed_at
    `;
    this.db.prepare(sql).run(primitiveId, now, now);
  }

  public async mergeMemories(primaryId: string, duplicateIds: readonly string[]): Promise<void> {
    const primary = await this.getPrimitive(primaryId);
    if (!primary) {
      throw new PrimitiveNotFoundError(`Primary primitive '${primaryId}' not found for merge.`);
    }

    this.db.exec("BEGIN");
    try {
      for (const dupId of duplicateIds) {
        if (dupId === primaryId) continue;

        // 1. Re-link relations pointing to duplicate
        this.db
          .prepare("UPDATE relations SET source_id = ? WHERE source_id = ?")
          .run(primaryId, dupId);
        this.db
          .prepare("UPDATE relations SET target_id = ? WHERE target_id = ?")
          .run(primaryId, dupId);

        // 2. Transfer vector embedding if primary doesn't have one
        const dupEmbedding = await this.getVectorEmbedding(dupId);
        const primaryEmbedding = await this.getVectorEmbedding(primaryId);
        if (dupEmbedding && !primaryEmbedding) {
          await this.upsertVectorEmbedding(primaryId, dupEmbedding);
        }

        // 3. Delete duplicate primitive
        this.db.prepare("DELETE FROM primitives_registry WHERE id = ?").run(dupId);
      }
      this.db.exec("COMMIT");
    } catch (err) {
      try {
        this.db.exec("ROLLBACK");
      } catch {}
      throw err;
    }
  }

  public async retrieveRankedMemories(
    query: string,
    queryEmbedding?: Float32Array | null,
    options?: RankedMemoryOptions,
  ): Promise<RankedMemoryResponse> {
    const limit = options?.limit ?? 10;
    const beta = options?.importance_weight ?? 0.5;
    const halfLifeDays = options?.recency_decay_half_life_days ?? 30;

    const hybridResponse = await this.searchHybrid(query, queryEmbedding, {
      limit: limit * 2,
      sensitivity_limit: options?.sensitivity_limit,
    });

    const nowMs = Date.now();
    const halfLifeMs = halfLifeDays * 86400 * 1000;
    const lambda = Math.LN2 / halfLifeMs;

    const items: RankedMemoryItem[] = [];

    for (const res of hybridResponse.results) {
      const lifecycle = await this.getMemoryLifecycle(res.primitive_id);
      const importanceScore = lifecycle?.importance_score ?? 0.5;
      const lastAccessedAt = lifecycle?.last_accessed_at ?? new Date().toISOString();
      const accessCount = lifecycle?.access_count ?? 0;

      const lastAccessedMs = new Date(lastAccessedAt).getTime();
      const ageMs = Math.max(0, nowMs - lastAccessedMs);
      const recencyScore = Math.exp(-lambda * ageMs);

      const rrfScore = res.combined_score;
      const finalScore = rrfScore * (1 + beta * importanceScore) * recencyScore;

      items.push({
        primitive_id: res.primitive_id,
        final_score: finalScore,
        rrf_score: rrfScore,
        importance_score: importanceScore,
        recency_score: recencyScore,
        access_count: accessCount,
        last_accessed_at: lastAccessedAt,
        primitive: res.primitive,
      });

      await this.touchMemoryAccess(res.primitive_id);
    }

    items.sort((a, b) => b.final_score - a.final_score);
    const finalResults = items.slice(0, limit);

    return {
      total_matches: finalResults.length,
      results: finalResults,
    };
  }

  public async executeTransaction<T>(work: () => Promise<T>): Promise<TransactionResult<T>> {
    try {
      this.db.exec("BEGIN");
      const result = await work();
      this.db.exec("COMMIT");
      return { success: true, result };
    } catch (err) {
      try {
        this.db.exec("ROLLBACK");
      } catch {
        // Ignore rollback failure if transaction was not open or already rolled back.
      }
      return { success: false, error: err as Error };
    }
  }

  public async recordContradiction(record: {
    contradiction_id: string;
    primitive_a_id: string;
    primitive_b_id: string;
    conflict_type: string;
    status: "detected" | "resolved" | "ignored";
    reasoning?: string;
    detected_at: string;
  }): Promise<void> {
    const sql = `
      INSERT INTO memory_contradictions (contradiction_id, primitive_a_id, primitive_b_id, conflict_type, status, reasoning, detected_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(contradiction_id) DO UPDATE SET
        status = excluded.status,
        reasoning = excluded.reasoning
    `;
    this.db
      .prepare(sql)
      .run(
        record.contradiction_id,
        record.primitive_a_id,
        record.primitive_b_id,
        record.conflict_type,
        record.status,
        record.reasoning ?? null,
        record.detected_at,
      );
  }

  public async listContradictions(status?: string): Promise<
    Array<{
      contradiction_id: string;
      primitive_a_id: string;
      primitive_b_id: string;
      conflict_type: string;
      status: string;
      resolution_action?: string | undefined;
      reasoning?: string | undefined;
      detected_at: string;
      resolved_at?: string | undefined;
    }>
  > {
    const sql = status
      ? "SELECT * FROM memory_contradictions WHERE status = ? ORDER BY detected_at DESC"
      : "SELECT * FROM memory_contradictions ORDER BY detected_at DESC";
    const rows = (status ? this.db.prepare(sql).all(status) : this.db.prepare(sql).all()) as Array<
      Record<string, unknown>
    >;

    return rows.map((r) => ({
      contradiction_id: String(r["contradiction_id"]),
      primitive_a_id: String(r["primitive_a_id"]),
      primitive_b_id: String(r["primitive_b_id"]),
      conflict_type: String(r["conflict_type"]),
      status: String(r["status"]),
      resolution_action: r["resolution_action"] ? String(r["resolution_action"]) : undefined,
      reasoning: r["reasoning"] ? String(r["reasoning"]) : undefined,
      detected_at: String(r["detected_at"]),
      resolved_at: r["resolved_at"] ? String(r["resolved_at"]) : undefined,
    }));
  }

  public async resolveContradiction(
    contradictionId: string,
    action: string,
    reasoning: string,
  ): Promise<void> {
    const resolvedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const sql = `
      UPDATE memory_contradictions
      SET status = 'resolved', resolution_action = ?, reasoning = ?, resolved_at = ?
      WHERE contradiction_id = ?
    `;
    this.db.prepare(sql).run(action, reasoning, resolvedAt, contradictionId);
  }

  public async recordLineage(record: {
    lineage_id: string;
    action_type: "MERGE" | "SUPERSEDE" | "ARCHIVE";
    source_primitive_id: string;
    target_primitive_id?: string;
    snapshot_primitive_json: string;
    reasoning: string;
    created_at: string;
  }): Promise<void> {
    const sql = `
      INSERT INTO memory_lineage (lineage_id, action_type, source_primitive_id, target_primitive_id, snapshot_primitive_json, reasoning, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    this.db
      .prepare(sql)
      .run(
        record.lineage_id,
        record.action_type,
        record.source_primitive_id,
        record.target_primitive_id ?? null,
        record.snapshot_primitive_json,
        record.reasoning,
        record.created_at,
      );
  }

  public async rollbackLineage(lineageId: string): Promise<boolean> {
    const row = this.db
      .prepare("SELECT * FROM memory_lineage WHERE lineage_id = ?")
      .get(lineageId) as Record<string, unknown> | undefined;
    if (!row) {
      return false;
    }

    const snapshotJson = String(row["snapshot_primitive_json"]);
    const primitive = JSON.parse(snapshotJson);

    // Remove current state before restoring snapshot
    this.db.prepare("DELETE FROM primitives_registry WHERE id = ?").run(primitive.id);

    // Re-insert original primitive into registry & table
    await this.insertPrimitive(primitive);

    // Delete lineage entry
    this.db.prepare("DELETE FROM memory_lineage WHERE lineage_id = ?").run(lineageId);
    return true;
  }

  public async close(): Promise<void> {
    this.db.close();
  }
}

/**
 * @deprecated Use AIETStorageRepository instead.
 */
export { AIETStorageRepository as PAKBStorageRepository };
