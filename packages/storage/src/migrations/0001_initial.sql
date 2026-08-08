-- Master Registry Table
CREATE TABLE IF NOT EXISTS primitives_registry (
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

-- Entities Table
CREATE TABLE IF NOT EXISTS entities (
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

-- Directives Table
CREATE TABLE IF NOT EXISTS directives (
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

-- Assertions Table
CREATE TABLE IF NOT EXISTS assertions (
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

-- Events Table
CREATE TABLE IF NOT EXISTS events (
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

-- Relations Table
CREATE TABLE IF NOT EXISTS relations (
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

-- Audit Log Table
CREATE TABLE IF NOT EXISTS audit_log (
    log_id TEXT PRIMARY KEY CHECK (log_id GLOB 'log_[0-9A-HJKMNP-TV-Z]*'),
    timestamp TEXT NOT NULL CHECK (timestamp GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z'),
    primitive_id TEXT NOT NULL REFERENCES primitives_registry(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('CREATE', 'UPDATE', 'SUPERSEDE', 'ARCHIVE', 'DELETE')),
    initiator TEXT NOT NULL CHECK (initiator IN ('human_user', 'agent_proposal')),
    previous_jcs_hash TEXT,
    new_jcs_hash TEXT NOT NULL
);

-- Vector Embeddings Table
CREATE TABLE IF NOT EXISTS vector_embeddings (
    primitive_id TEXT PRIMARY KEY REFERENCES primitives_registry(id) ON DELETE CASCADE,
    dimensions INTEGER NOT NULL,
    embedding_blob BLOB NOT NULL,
    updated_at TEXT NOT NULL
);

-- Memory Lifecycle Table
CREATE TABLE IF NOT EXISTS memory_lifecycle (
    primitive_id TEXT PRIMARY KEY REFERENCES primitives_registry(id) ON DELETE CASCADE,
    importance_score REAL NOT NULL DEFAULT 0.5,
    access_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    last_accessed_at TEXT NOT NULL,
    metadata TEXT
);

-- Memory Proposals Table
CREATE TABLE IF NOT EXISTS memory_proposals (
    proposal_id TEXT PRIMARY KEY,
    candidate_primitive_json TEXT NOT NULL,
    decision_type TEXT NOT NULL,
    target_primitive_id TEXT REFERENCES primitives_registry(id) ON DELETE CASCADE,
    confidence_score REAL NOT NULL,
    status TEXT NOT NULL,
    reasoning TEXT,
    created_at TEXT NOT NULL
);

-- Schema Migrations Tracking Table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version_code INTEGER PRIMARY KEY,
    semver TEXT NOT NULL,
    applied_at TEXT NOT NULL CHECK (applied_at GLOB '20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_relations_source_id ON relations(source_id, predicate, sensitivity);
CREATE INDEX IF NOT EXISTS idx_relations_target_id ON relations(target_id, predicate, sensitivity);
CREATE INDEX IF NOT EXISTS idx_relations_predicate ON relations(predicate);
CREATE INDEX IF NOT EXISTS idx_directives_activation ON directives(activation, enforcement, domain) WHERE sensitivity != 'restricted';
CREATE INDEX IF NOT EXISTS idx_entities_activation ON entities(activation, type) WHERE sensitivity != 'restricted';
CREATE INDEX IF NOT EXISTS idx_assertions_sensitivity ON assertions(sensitivity, activation);
CREATE INDEX IF NOT EXISTS idx_events_sensitivity ON events(sensitivity, activation);
CREATE INDEX IF NOT EXISTS idx_audit_log_primitive_id ON audit_log(primitive_id, timestamp);

-- Full-Text Search (FTS5) Virtual Table
CREATE VIRTUAL TABLE IF NOT EXISTS fts_knowledge_index USING fts5(
    primitive_id UNINDEXED,
    primitive_type UNINDEXED,
    searchable_text,
    tokenize='unicode61 remove_diacritics 1'
);

-- FTS5 Triggers
CREATE TRIGGER IF NOT EXISTS trg_entities_fts_insert AFTER INSERT ON entities
WHEN new.sensitivity != 'restricted'
BEGIN
    INSERT INTO fts_knowledge_index(primitive_id, primitive_type, searchable_text)
    VALUES (new.id, 'entity', new.name || ' ' || COALESCE(new.description, ''));
END;

CREATE TRIGGER IF NOT EXISTS trg_entities_fts_delete AFTER DELETE ON entities
BEGIN
    DELETE FROM fts_knowledge_index WHERE primitive_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_directives_fts_insert AFTER INSERT ON directives
WHEN new.sensitivity != 'restricted'
BEGIN
    INSERT INTO fts_knowledge_index(primitive_id, primitive_type, searchable_text)
    VALUES (new.id, 'directive', new.statement || ' ' || new.domain || ' ' || COALESCE(new.rationale, ''));
END;

CREATE TRIGGER IF NOT EXISTS trg_directives_fts_delete AFTER DELETE ON directives
BEGIN
    DELETE FROM fts_knowledge_index WHERE primitive_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_assertions_fts_insert AFTER INSERT ON assertions
WHEN new.sensitivity != 'restricted'
BEGIN
    INSERT INTO fts_knowledge_index(primitive_id, primitive_type, searchable_text)
    VALUES (new.id, 'assertion', new.claim);
END;

CREATE TRIGGER IF NOT EXISTS trg_assertions_fts_delete AFTER DELETE ON assertions
BEGIN
    DELETE FROM fts_knowledge_index WHERE primitive_id = old.id;
END;
