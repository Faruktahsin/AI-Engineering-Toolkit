import fs from "node:fs";
import path from "node:path";
import { generateULID, validateOrThrow } from "@aiet/domain";
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
import { type PAKBStorageOptions, createDatabaseConnection } from "./connection";
import { calculateJCSHash } from "./jcs-hash";

export interface SearchOptions {
  readonly primitive_type?: "entity" | "directive" | "assertion" | "event" | null;
  readonly sensitivity_limit?: SensitivityTier;
  readonly limit?: number;
  readonly offset?: number;
}

export interface SearchResult {
  readonly id: string;
  readonly primitive_type: string;
  readonly score: number;
  readonly snippet: string;
  readonly headline_claim: string;
}

export interface SearchResponse {
  readonly total_matches: number;
  readonly limit: number;
  readonly offset: number;
  readonly results: SearchResult[];
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
    log_id TEXT PRIMARY KEY, timestamp TEXT NOT NULL, primitive_id TEXT NOT NULL REFERENCES primitives_registry(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL, initiator TEXT NOT NULL, previous_jcs_hash TEXT, new_jcs_hash TEXT NOT NULL
  );
  CREATE VIRTUAL TABLE IF NOT EXISTS fts_knowledge_index USING fts5(primitive_id UNINDEXED, primitive_type UNINDEXED, searchable_text, tokenize='unicode61 remove_diacritics 1');

  CREATE TRIGGER IF NOT EXISTS trg_entities_fts_insert AFTER INSERT ON entities WHEN new.sensitivity != 'restricted' BEGIN INSERT INTO fts_knowledge_index(primitive_id, primitive_type, searchable_text) VALUES (new.id, 'entity', new.name || ' ' || COALESCE(new.description, '')); END;
  CREATE TRIGGER IF NOT EXISTS trg_entities_fts_delete AFTER DELETE ON entities BEGIN DELETE FROM fts_knowledge_index WHERE primitive_id = old.id; END;

  CREATE TRIGGER IF NOT EXISTS trg_directives_fts_insert AFTER INSERT ON directives WHEN new.sensitivity != 'restricted' BEGIN INSERT INTO fts_knowledge_index(primitive_id, primitive_type, searchable_text) VALUES (new.id, 'directive', new.statement || ' ' || new.domain || ' ' || COALESCE(new.rationale, '')); END;
  CREATE TRIGGER IF NOT EXISTS trg_directives_fts_delete AFTER DELETE ON directives BEGIN DELETE FROM fts_knowledge_index WHERE primitive_id = old.id; END;

  CREATE TRIGGER IF NOT EXISTS trg_assertions_fts_insert AFTER INSERT ON assertions WHEN new.sensitivity != 'restricted' BEGIN INSERT INTO fts_knowledge_index(primitive_id, primitive_type, searchable_text) VALUES (new.id, 'assertion', new.claim); END;
  CREATE TRIGGER IF NOT EXISTS trg_assertions_fts_delete AFTER DELETE ON assertions BEGIN DELETE FROM fts_knowledge_index WHERE primitive_id = old.id; END;
`;

export class PAKBStorageRepository {
  private readonly db: Database.Database;

  constructor(options: PAKBStorageOptions) {
    this.db = createDatabaseConnection(options);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    const migrationPath = path.join(__dirname, "migrations", "0001_initial.sql");
    let ddl: string;
    if (fs.existsSync(migrationPath)) {
      ddl = fs.readFileSync(migrationPath, "utf8");
    } else {
      ddl = EMBEDDED_DDL;
    }
    this.db.exec(ddl);
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

    if (typeof row["locale_info"] === "string")
      row["locale_info"] = JSON.parse(row["locale_info"] as string);
    if (typeof row["metadata"] === "string")
      row["metadata"] = JSON.parse(row["metadata"] as string);
    if (typeof row["tags"] === "string") row["tags"] = JSON.parse(row["tags"] as string);

    return row as unknown as AnyPrimitive;
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

    const newHash = calculateJCSHash(targetPrimitive);

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

      const logId = `log_${ulid()}`;
      this.db
        .prepare(`
        INSERT INTO audit_log (log_id, timestamp, primitive_id, operation_type, initiator, previous_jcs_hash, new_jcs_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
        .run(
          logId,
          new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
          targetPrimitive.id,
          "CREATE",
          "human_user",
          null,
          newHash,
        );
    })();
  }

  public async updatePrimitive(primitive: AnyPrimitive, expectedUpdatedAt: string): Promise<void> {
    validateOrThrow(primitive);

    this.db.transaction(() => {
      const reg = this.db
        .prepare("SELECT primitive_type FROM primitives_registry WHERE id = ?")
        .get(primitive.id) as { primitive_type: string } | undefined;
      if (!reg) {
        throw new PrimitiveNotFoundError(
          `Primitive '${primitive.id}' not found.`,
          PAKBErrorCode.PRIMITIVE_NOT_FOUND_ERROR,
          primitive.id,
        );
      }

      let existingRow: Record<string, unknown> | undefined;
      if (reg.primitive_type === "entity")
        existingRow = this.db
          .prepare("SELECT * FROM entities WHERE id = ?")
          .get(primitive.id) as Record<string, unknown>;
      else if (reg.primitive_type === "directive")
        existingRow = this.db
          .prepare("SELECT * FROM directives WHERE id = ?")
          .get(primitive.id) as Record<string, unknown>;
      else if (reg.primitive_type === "assertion")
        existingRow = this.db
          .prepare("SELECT * FROM assertions WHERE id = ?")
          .get(primitive.id) as Record<string, unknown>;
      else if (reg.primitive_type === "event")
        existingRow = this.db
          .prepare("SELECT * FROM events WHERE id = ?")
          .get(primitive.id) as Record<string, unknown>;
      else if (reg.primitive_type === "relation")
        existingRow = this.db
          .prepare("SELECT * FROM relations WHERE id = ?")
          .get(primitive.id) as Record<string, unknown>;

      if (!existingRow) {
        throw new PrimitiveNotFoundError(
          `Primitive '${primitive.id}' not found.`,
          PAKBErrorCode.PRIMITIVE_NOT_FOUND_ERROR,
          primitive.id,
        );
      }

      // Immutability Check
      if (
        existingRow["id"] !== primitive.id ||
        existingRow["created_at"] !== primitive.created_at ||
        existingRow["schema_version"] !== primitive.schema_version
      ) {
        throw new ImmutableFieldViolationError(
          `Immutable field violation on primitive '${primitive.id}'.`,
          PAKBErrorCode.IMMUTABLE_FIELD_VIOLATION_ERROR,
          primitive.id,
        );
      }

      // Atomic OCC Check inside transaction
      if (existingRow["updated_at"] !== expectedUpdatedAt) {
        throw new ConcurrentModificationError(
          `OCC lock error for '${primitive.id}': expected '${expectedUpdatedAt}' but found '${existingRow["updated_at"]}'.`,
          PAKBErrorCode.CONCURRENT_MODIFICATION_ERROR,
          primitive.id,
        );
      }

      const prevHash = calculateJCSHash(existingRow as unknown as AnyPrimitive);
      const newHash = calculateJCSHash(primitive);

      if (reg.primitive_type === "entity") {
        const p = primitive as unknown as Record<string, unknown>;
        this.db
          .prepare(`
          UPDATE entities SET updated_at = ?, last_verified = ?, sensitivity = ?, volatility = ?, activation = ?, name = ?, type = ?, status = ?, locale_info = ?, description = ?, metadata = ?
          WHERE id = ? AND updated_at = ?
        `)
          .run(
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
            p["id"],
            expectedUpdatedAt,
          );
      } else if (reg.primitive_type === "directive") {
        const p = primitive as unknown as Record<string, unknown>;
        this.db
          .prepare(`
          UPDATE directives SET updated_at = ?, last_verified = ?, sensitivity = ?, volatility = ?, activation = ?, statement = ?, enforcement = ?, domain = ?, cadence = ?, exemption_scope = ?, rationale = ?, metadata = ?
          WHERE id = ? AND updated_at = ?
        `)
          .run(
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
            p["id"],
            expectedUpdatedAt,
          );
      }

      const logId = `log_${ulid()}`;
      this.db
        .prepare(`
        INSERT INTO audit_log (log_id, timestamp, primitive_id, operation_type, initiator, previous_jcs_hash, new_jcs_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
        .run(
          logId,
          new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
          primitive.id,
          "UPDATE",
          "human_user",
          prevHash,
          newHash,
        );
    })();
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

  public async close(): Promise<void> {
    this.db.close();
  }
}
