import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const primitivesRegistry = sqliteTable("primitives_registry", {
  id: text("id").primaryKey(),
  primitiveType: text("primitive_type").notNull(),
});

export const entities = sqliteTable("entities", {
  id: text("id")
    .primaryKey()
    .references(() => primitivesRegistry.id, { onDelete: "cascade" }),
  schemaVersion: text("schema_version").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  lastVerified: text("last_verified").notNull(),
  sensitivity: text("sensitivity").notNull(),
  volatility: text("volatility").notNull(),
  activation: text("activation").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status"),
  localeInfo: text("locale_info"),
  description: text("description"),
  metadata: text("metadata"),
});

export const directives = sqliteTable("directives", {
  id: text("id")
    .primaryKey()
    .references(() => primitivesRegistry.id, { onDelete: "cascade" }),
  schemaVersion: text("schema_version").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  lastVerified: text("last_verified").notNull(),
  sensitivity: text("sensitivity").notNull(),
  volatility: text("volatility").notNull(),
  activation: text("activation").notNull(),
  statement: text("statement").notNull(),
  enforcement: text("enforcement").notNull(),
  domain: text("domain").notNull(),
  cadence: text("cadence"),
  exemptionScope: text("exemption_scope"),
  rationale: text("rationale"),
  metadata: text("metadata"),
});

export const assertions = sqliteTable("assertions", {
  id: text("id")
    .primaryKey()
    .references(() => primitivesRegistry.id, { onDelete: "cascade" }),
  schemaVersion: text("schema_version").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  lastVerified: text("last_verified").notNull(),
  sensitivity: text("sensitivity").notNull(),
  volatility: text("volatility").notNull(),
  activation: text("activation").notNull(),
  claim: text("claim").notNull(),
  evidenceType: text("evidence_type").notNull(),
  type: text("type").notNull(),
  status: text("status"),
  source: text("source"),
  validFrom: text("valid_from"),
  validTo: text("valid_to"),
  metadata: text("metadata"),
});

export const events = sqliteTable("events", {
  id: text("id")
    .primaryKey()
    .references(() => primitivesRegistry.id, { onDelete: "cascade" }),
  schemaVersion: text("schema_version").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  lastVerified: text("last_verified").notNull(),
  sensitivity: text("sensitivity").notNull(),
  volatility: text("volatility").notNull(),
  activation: text("activation").notNull(),
  timestamp: text("timestamp").notNull(),
  summary: text("summary").notNull(),
  type: text("type"),
  impactSummary: text("impact_summary"),
  tags: text("tags"),
  metadata: text("metadata"),
});

export const relations = sqliteTable("relations", {
  id: text("id")
    .primaryKey()
    .references(() => primitivesRegistry.id, { onDelete: "cascade" }),
  schemaVersion: text("schema_version").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  lastVerified: text("last_verified").notNull(),
  sensitivity: text("sensitivity").notNull(),
  volatility: text("volatility").notNull(),
  activation: text("activation").notNull(),
  sourceId: text("source_id")
    .notNull()
    .references(() => primitivesRegistry.id, { onDelete: "cascade" }),
  targetId: text("target_id")
    .notNull()
    .references(() => primitivesRegistry.id, { onDelete: "cascade" }),
  predicate: text("predicate").notNull(),
  validFrom: text("valid_from"),
  validTo: text("valid_to"),
  weight: real("weight"),
  metadata: text("metadata"),
});

export const auditLog = sqliteTable("audit_log", {
  logId: text("log_id").primaryKey(),
  timestamp: text("timestamp").notNull(),
  primitiveId: text("primitive_id")
    .notNull()
    .references(() => primitivesRegistry.id, { onDelete: "cascade" }),
  operationType: text("operation_type").notNull(),
  initiator: text("initiator").notNull(),
  primitiveJcsHash: text("primitive_jcs_hash"),
  previousJcsHash: text("previous_jcs_hash"),
  newJcsHash: text("new_jcs_hash").notNull(),
  chainVersion: integer("chain_version").notNull().default(0),
  chainSequence: integer("chain_sequence").notNull().default(0),
});
