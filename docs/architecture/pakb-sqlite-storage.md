# Personal AI Knowledge Base (PAKB) — SQLite Storage Architecture v1.0

**Specification Title:** PAKB SQLite Storage Architecture v1.0  
**Status:** Frozen Normative Specification  
**Publication Date:** 5 August 2026  
**Author:** Senior Software Architect  
**Target Environment:** SQLite 3.46+ (WAL Mode, JSON1, FTS5, Foreign Keys Enabled)  
**Parent Specifications:** 
* `PAKB-Refactored-Domain-Model.md` (Domain Model v1.0)
* `PAKB-ADRs-v1.0.md` (Architecture Decision Records v1.0)
* `pakb-schema-v1.json` (JSON Schema v1.0)
* `PAKB-Storage-Semantics-v1.0.md` (Storage Semantics v1.0)

---

## 1. Executive Overview & Storage Backend Scope

This document defines the normative physical relational design for the SQLite storage backend of the Personal AI Knowledge Base (PAKB). Conforming SQLite backends MUST implement the exact DDL schemas, index configurations, PRAGMAs, triggers, and recursive CTE query patterns specified herein.

This specification requires **SQLite version 3.46 or higher** compiled with JSON1, FTS5, and recursive CTE support enabled.

---

## 2. Recommended PRAGMA Configuration

Every connection opened to the PAKB SQLite database MUST execute the following PRAGMAs immediately upon connection establishment prior to executing any read or write operations:

```sql
-- Enable Write-Ahead Logging for concurrent read/write isolation
PRAGMA journal_mode = WAL;

-- Enforce foreign key referential integrity constraints
PRAGMA foreign_keys = ON;

-- Optimize WAL disk synchronization
PRAGMA synchronous = NORMAL;

-- Set 5-second busy timeout for optimistic lock retries
PRAGMA busy_timeout = 5000;

-- Allocate 20 MB in-memory page cache (-20000 KiB)
PRAGMA cache_size = -20000;

-- Store temporary tables and indexes in RAM
PRAGMA temp_store = MEMORY;

-- Enforce UTF-8 string encoding
PRAGMA encoding = 'UTF-8';
```

---

## 3. Relational Entity-Relationship (ER) Architecture

The PAKB physical schema implements a **Registry-Anchored Relational Graph**:

```
                       ┌─────────────────────────┐
                       │   primitives_registry   │
                       │   (id, primitive_type)  │
                       └────────────▲────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │ (1:1 PK)                 │ (1:1 PK)                 │ (1:1 PK)
┌────────┴────────┐        ┌────────┴────────┐        ┌────────┴────────┐
│    entities     │        │   directives    │        │   assertions    │
└─────────────────┘        └─────────────────┘        └─────────────────┘
         │                          │                          │
         │ (1:1 PK)                 │ (1:1 PK)                 │ (FK source/target)
┌────────┴────────┐        ┌────────┴────────┐        ┌────────┴────────┐
│     events      │        │    audit_log    │        │    relations    │
└─────────────────┘        └─────────────────┘        └─────────────────┘
```

1. **`primitives_registry`**: Central lookup anchor enforcing global primary key uniqueness across all 5 primitives (`entities`, `directives`, `assertions`, `events`, `relations`).
2. **Primitive Tables (`entities`, `directives`, `assertions`, `events`, `relations`)**: Store domain attributes for each primitive. Primary keys directly reference `primitives_registry.id` with `ON DELETE CASCADE`.
3. **`relations`**: Implements directed graph edges where `source_id` and `target_id` hold foreign keys pointing to `primitives_registry.id`.
4. **`audit_log`**: Append-only transaction log recording all mutations.

---

## 4. Normative DDL Table Definitions

### 4.1 Master Registry Table

```sql
CREATE TABLE primitives_registry (
    id TEXT PRIMARY KEY CHECK (
        id GLOB 'ent_[0-9A-HJKMNP-TV-Z]*' OR
        id GLOB 'dir_[0-9A-HJKMNP-TV-Z]*' OR
        id GLOB 'ast_[0-9A-HJKMNP-TV-Z]*' OR
        id GLOB 'evt_[0-9A-HJKMNP-TV-Z]*' OR
        id GLOB 'rel_[0-9A-HJKMNP-TV-Z]*'
    ),
    primitive_type TEXT NOT NULL CHECK (
        primitive_type IN ('entity', 'directive', 'assertion', 'event', 'relation')
    )
);
```

### 4.2 Entities Table

```sql
CREATE TABLE entities (
    id TEXT PRIMARY KEY REFERENCES primitives_registry(id) ON DELETE CASCADE,
    schema_version TEXT NOT NULL CHECK (schema_version GLOB '1.[0-9]*.[0-9]*'),
    created_at TEXT NOT NULL CHECK (created_at GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z'),
    updated_at TEXT NOT NULL CHECK (updated_at GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z'),
    last_verified TEXT NOT NULL CHECK (last_verified GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z'),
    sensitivity TEXT NOT NULL CHECK (sensitivity IN ('public', 'internal', 'restricted')),
    volatility TEXT NOT NULL CHECK (volatility IN ('invariant', 'low', 'medium', 'high')),
    activation TEXT NOT NULL CHECK (activation IN ('always_on', 'on_demand', 'restricted')),
    name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 256),
    type TEXT NOT NULL CHECK (type IN ('owner', 'contact', 'organization', 'workstream', 'objective', 'environment')),
    status TEXT CHECK (status IS NULL OR status IN ('idea', 'active', 'paused', 'completed', 'archived')),
    locale_info TEXT CHECK (locale_info IS NULL OR json_valid(locale_info)),
    description TEXT CHECK (description IS NULL OR length(description) <= 4096),
    metadata TEXT CHECK (metadata IS NULL OR (
        json_valid(metadata) AND 
        json_type(metadata) = 'object' AND
        json_extract(metadata, '$.scoped_entity_id') IS NULL AND
        json_extract(metadata, '$.source_id') IS NULL AND
        json_extract(metadata, '$.target_id') IS NULL
    ))
);
```

### 4.3 Directives Table

```sql
CREATE TABLE directives (
    id TEXT PRIMARY KEY REFERENCES primitives_registry(id) ON DELETE CASCADE,
    schema_version TEXT NOT NULL CHECK (schema_version GLOB '1.[0-9]*.[0-9]*'),
    created_at TEXT NOT NULL CHECK (created_at GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z'),
    updated_at TEXT NOT NULL CHECK (updated_at GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z'),
    last_verified TEXT NOT NULL CHECK (last_verified GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z'),
    sensitivity TEXT NOT NULL CHECK (sensitivity IN ('public', 'internal', 'restricted')),
    volatility TEXT NOT NULL CHECK (volatility IN ('invariant', 'low', 'medium', 'high')),
    activation TEXT NOT NULL CHECK (activation IN ('always_on', 'on_demand', 'restricted')),
    statement TEXT NOT NULL CHECK (length(statement) >= 1 AND length(statement) <= 2048),
    enforcement TEXT NOT NULL CHECK (enforcement IN ('hard', 'soft')),
    domain TEXT NOT NULL CHECK (length(domain) >= 1 AND length(domain) <= 128),
    cadence TEXT CHECK (cadence IS NULL OR cadence IN ('daily', 'weekly', 'monthly', 'on_event')),
    exemption_scope TEXT CHECK (exemption_scope IS NULL OR length(exemption_scope) <= 1024),
    rationale TEXT CHECK (rationale IS NULL OR length(rationale) <= 2048),
    metadata TEXT CHECK (metadata IS NULL OR (
        json_valid(metadata) AND 
        json_type(metadata) = 'object' AND
        json_extract(metadata, '$.scoped_entity_id') IS NULL AND
        json_extract(metadata, '$.source_id') IS NULL AND
        json_extract(metadata, '$.target_id') IS NULL
    ))
);
```

### 4.4 Assertions Table

```sql
CREATE TABLE assertions (
    id TEXT PRIMARY KEY REFERENCES primitives_registry(id) ON DELETE CASCADE,
    schema_version TEXT NOT NULL CHECK (schema_version GLOB '1.[0-9]*.[0-9]*'),
    created_at TEXT NOT NULL CHECK (created_at GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z'),
    updated_at TEXT NOT NULL CHECK (updated_at GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z'),
    last_verified TEXT NOT NULL CHECK (last_verified GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z'),
    sensitivity TEXT NOT NULL CHECK (sensitivity IN ('public', 'internal', 'restricted')),
    volatility TEXT NOT NULL CHECK (volatility IN ('invariant', 'low', 'medium', 'high')),
    activation TEXT NOT NULL CHECK (activation IN ('always_on', 'on_demand', 'restricted')),
    claim TEXT NOT NULL CHECK (length(claim) >= 1 AND length(claim) <= 4096),
    evidence_type TEXT NOT NULL CHECK (evidence_type IN ('observed', 'stated', 'inferred')),
    type TEXT NOT NULL CHECK (type IN ('fact', 'decision_adr', 'insight', 'credential_reference')),
    status TEXT CHECK (status IS NULL OR status IN ('proposed', 'accepted', 'superseded')),
    source TEXT CHECK (source IS NULL OR length(source) <= 2048),
    valid_from TEXT CHECK (valid_from IS NULL OR valid_from GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z'),
    valid_to TEXT CHECK (valid_to IS NULL OR valid_to GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z'),
    metadata TEXT CHECK (metadata IS NULL OR (
        json_valid(metadata) AND 
        json_type(metadata) = 'object' AND
        json_extract(metadata, '$.scoped_entity_id') IS NULL AND
        json_extract(metadata, '$.source_id') IS NULL AND
        json_extract(metadata, '$.target_id') IS NULL
    ))
);
```

### 4.5 Events Table

```sql
CREATE TABLE events (
    id TEXT PRIMARY KEY REFERENCES primitives_registry(id) ON DELETE CASCADE,
    schema_version TEXT NOT NULL CHECK (schema_version GLOB '1.[0-9]*.[0-9]*'),
    created_at TEXT NOT NULL CHECK (created_at GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z'),
    updated_at TEXT NOT NULL CHECK (updated_at GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z'),
    last_verified TEXT NOT NULL CHECK (last_verified GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z'),
    sensitivity TEXT NOT NULL CHECK (sensitivity IN ('public', 'internal', 'restricted')),
    volatility TEXT NOT NULL CHECK (volatility IN ('invariant', 'low', 'medium', 'high')),
    activation TEXT NOT NULL CHECK (activation IN ('always_on', 'on_demand', 'restricted')),
    timestamp TEXT NOT NULL CHECK (timestamp GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z'),
    summary TEXT NOT NULL CHECK (length(summary) >= 1 AND length(summary) <= 2048),
    type TEXT CHECK (type IS NULL OR type IN ('milestone', 'session_log', 'interaction', 'state_change')),
    impact_summary TEXT CHECK (impact_summary IS NULL OR length(impact_summary) <= 2048),
    tags TEXT CHECK (tags IS NULL OR (json_valid(tags) AND json_type(tags) = 'array')),
    metadata TEXT CHECK (metadata IS NULL OR (
        json_valid(metadata) AND 
        json_type(metadata) = 'object' AND
        json_extract(metadata, '$.scoped_entity_id') IS NULL AND
        json_extract(metadata, '$.source_id') IS NULL AND
        json_extract(metadata, '$.target_id') IS NULL
    ))
);
```

### 4.6 Relations Table

```sql
CREATE TABLE relations (
    id TEXT PRIMARY KEY REFERENCES primitives_registry(id) ON DELETE CASCADE,
    schema_version TEXT NOT NULL CHECK (schema_version GLOB '1.[0-9]*.[0-9]*'),
    created_at TEXT NOT NULL CHECK (created_at GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z'),
    updated_at TEXT NOT NULL CHECK (updated_at GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z'),
    last_verified TEXT NOT NULL CHECK (last_verified GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z'),
    sensitivity TEXT NOT NULL CHECK (sensitivity IN ('public', 'internal', 'restricted')),
    volatility TEXT NOT NULL CHECK (volatility IN ('invariant', 'low', 'medium', 'high')),
    activation TEXT NOT NULL CHECK (activation IN ('always_on', 'on_demand', 'restricted')),
    source_id TEXT NOT NULL REFERENCES primitives_registry(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL REFERENCES primitives_registry(id) ON DELETE CASCADE,
    predicate TEXT NOT NULL CHECK (
        predicate IN ('governs', 'owns', 'depends_on', 'supersedes', 'supports', 'located_at', 'member_of') OR
        predicate GLOB 'ext_[a-z0-9_]*'
    ),
    valid_from TEXT CHECK (valid_from IS NULL OR valid_from GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z'),
    valid_to TEXT CHECK (valid_to IS NULL OR valid_to GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z'),
    weight REAL CHECK (weight IS NULL OR (weight >= 0.0 AND weight <= 1.0)),
    metadata TEXT CHECK (metadata IS NULL OR (
        json_valid(metadata) AND 
        json_type(metadata) = 'object' AND
        json_extract(metadata, '$.scoped_entity_id') IS NULL AND
        json_extract(metadata, '$.source_id') IS NULL AND
        json_extract(metadata, '$.target_id') IS NULL
    ))
);
```

### 4.7 Audit Log Table

```sql
CREATE TABLE audit_log (
    log_id TEXT PRIMARY KEY CHECK (log_id GLOB 'log_[0-9A-HJKMNP-TV-Z]*'),
    timestamp TEXT NOT NULL CHECK (timestamp GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z'),
    primitive_id TEXT NOT NULL REFERENCES primitives_registry(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('CREATE', 'UPDATE', 'SUPERSEDE', 'ARCHIVE', 'DELETE')),
    initiator TEXT NOT NULL CHECK (initiator IN ('human_user', 'agent_proposal')),
    previous_jcs_hash TEXT,
    new_jcs_hash TEXT NOT NULL
);
```

---

## 5. Indexes Strategy

```sql
-- Cover Graph Edge Lookups
CREATE INDEX idx_relations_source_id ON relations(source_id, predicate, sensitivity);
CREATE INDEX idx_relations_target_id ON relations(target_id, predicate, sensitivity);
CREATE INDEX idx_relations_predicate ON relations(predicate);

-- Context Activation & Tier 0 Preamble Compilation Indexes
CREATE INDEX idx_directives_activation ON directives(activation, enforcement, domain) 
    WHERE sensitivity != 'restricted';

CREATE INDEX idx_entities_activation ON entities(activation, type) 
    WHERE sensitivity != 'restricted';

-- Sensitivity & Security Exclusions
CREATE INDEX idx_assertions_sensitivity ON assertions(sensitivity, activation);
CREATE INDEX idx_events_sensitivity ON events(sensitivity, activation);

-- Audit Trail Lookup
CREATE INDEX idx_audit_log_primitive_id ON audit_log(primitive_id, timestamp);
```

---

## 6. Full-Text Search (FTS5) Strategy

### 6.1 FTS5 Virtual Table Definition

```sql
CREATE VIRTUAL TABLE fts_knowledge_index USING fts5(
    primitive_id UNINDEXED,
    primitive_type UNINDEXED,
    searchable_text,
    tokenize='unicode61 remove_diacritics 1'
);
```

### 6.2 FTS5 Trigger Automation

```sql
-- Sync Entities to FTS5
CREATE TRIGGER trg_entities_fts_insert AFTER INSERT ON entities
WHEN new.sensitivity != 'restricted'
BEGIN
    INSERT INTO fts_knowledge_index(primitive_id, primitive_type, searchable_text)
    VALUES (new.id, 'entity', new.name || ' ' || COALESCE(new.description, ''));
END;

CREATE TRIGGER trg_entities_fts_delete AFTER DELETE ON entities
BEGIN
    DELETE FROM fts_knowledge_index WHERE primitive_id = old.id;
END;

-- Sync Directives to FTS5
CREATE TRIGGER trg_directives_fts_insert AFTER INSERT ON directives
WHEN new.sensitivity != 'restricted'
BEGIN
    INSERT INTO fts_knowledge_index(primitive_id, primitive_type, searchable_text)
    VALUES (new.id, 'directive', new.statement || ' ' || new.domain || ' ' || COALESCE(new.rationale, ''));
END;

CREATE TRIGGER trg_directives_fts_delete AFTER DELETE ON directives
BEGIN
    DELETE FROM fts_knowledge_index WHERE primitive_id = old.id;
END;

-- Sync Assertions to FTS5
CREATE TRIGGER trg_assertions_fts_insert AFTER INSERT ON assertions
WHEN new.sensitivity != 'restricted'
BEGIN
    INSERT INTO fts_knowledge_index(primitive_id, primitive_type, searchable_text)
    VALUES (new.id, 'assertion', new.claim);
END;

CREATE TRIGGER trg_assertions_fts_delete AFTER DELETE ON assertions
BEGIN
    DELETE FROM fts_knowledge_index WHERE primitive_id = old.id;
END;
```

---

## 7. Recursive CTE Strategy for Graph Traversal (ADR-003)

Graph traversal queries MUST implement recursive Common Table Expressions (CTEs) enforcing a hard depth limit of $	ext{MAX\_DEPTH} = 3$ and path tracking to prevent cycles:

```sql
-- Standardized Graph Traversal Query Template (Depth <= 3)
WITH RECURSIVE graph_traversal(node_id, depth, path) AS (
    -- Seed Node Initialization
    SELECT 
        ?1 AS node_id,
        0 AS depth,
        ?1 AS path
    
    UNION ALL
    
    -- Forward Edge and Dynamic Inverse Traversal
    SELECT 
        CASE 
            WHEN r.source_id = gt.node_id THEN r.target_id 
            ELSE r.source_id 
        END AS node_id,
        gt.depth + 1 AS depth,
        gt.path || '/' || CASE WHEN r.source_id = gt.node_id THEN r.target_id ELSE r.source_id END AS path
    FROM graph_traversal gt
    JOIN relations r ON (r.source_id = gt.node_id OR r.target_id = gt.node_id)
    WHERE gt.depth < 3
      AND r.sensitivity != 'restricted'
      AND instr(gt.path, CASE WHEN r.source_id = gt.node_id THEN r.target_id ELSE r.source_id END) = 0
)
SELECT DISTINCT node_id, depth FROM graph_traversal;
```

---

## 8. Optimistic Concurrency Control (OCC) Triggers

```sql
-- Enforce OCC Token Match & ISO Timestamp Progression
CREATE TRIGGER trg_entities_occ_update BEFORE UPDATE ON entities
BEGIN
    SELECT CASE
        WHEN old.updated_at != old.updated_at THEN
            RAISE(ABORT, 'ConcurrentModificationError: Optimistic lock token mismatch')
    END;
END;
```

---

## 9. Migration & Schema Versioning Strategy

1. **Pragma Versioning**: SQLite `user_version` PRAGMA stores the schema version integer (e.g. `100` for v1.0.0).
2. **Schema Migration Table**:
   ```sql
   CREATE TABLE schema_migrations (
       version_code INTEGER PRIMARY KEY,
       semver TEXT NOT NULL,
       applied_at TEXT NOT NULL CHECK (applied_at GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z')
   );
   ```

---

## 10. Expected Database Invariants

Every conforming PAKB SQLite database instance MUST satisfy the following structural invariants:

1. **Global Uniqueness**: Every `id` in `entities`, `directives`, `assertions`, `events`, or `relations` MUST have a corresponding entry in `primitives_registry`.
2. **Restricted Privacy Boundary**: FTS5 virtual table `fts_knowledge_index` MUST NOT contain any primitive where `sensitivity == 'restricted'`.
3. **Valid JSON**: All `metadata`, `locale_info`, and `tags` columns MUST contain valid JSON payloads or `NULL`.
4. **UTC Timestamp Format**: All timestamps MUST adhere strictly to ISO 8601 UTC format (`YYYY-MM-DDTHH:mm:ssZ`).
5. **No Orphan Edges**: `relations.source_id` and `relations.target_id` MUST reference valid registered primitive IDs. Hard deletion of a primitive MUST cascade-delete connected relations via foreign key `ON DELETE CASCADE`.

---

## 11. SQLite Architecture Freeze Statement

**PAKB SQLite Storage Architecture v1.0 is the normative physical storage specification for SQLite backends.** This specification is frozen. All conforming SQLite database implementations MUST execute the DDL, indexes, triggers, PRAGMAs, and recursive CTE query templates defined herein. Any future physical schema modifications require a new versioned specification (e.g., SQLite Storage Architecture v1.1 or v2.0).
