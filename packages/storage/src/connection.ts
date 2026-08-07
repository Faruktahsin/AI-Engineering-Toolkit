import Database from "better-sqlite3";

export interface PAKBStorageOptions {
  readonly db_path: string;
  readonly read_only?: boolean;
  readonly busy_timeout_ms?: number;
}

/**
 * Creates and configures SQLite database connection enforcing mandatory PRAGMAs.
 * PAKB-SQLite-Storage-Architecture-v1.0.md §2.
 */
export function createDatabaseConnection(options: PAKBStorageOptions): Database.Database {
  const db = new Database(options.db_path, {
    readonly: options.read_only ?? false,
  });

  const busyTimeout = options.busy_timeout_ms ?? 5000;

  // Execute mandatory PRAGMAs per PAKB-SQLite-Storage-Architecture-v1.0.md §2
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = NORMAL");
  db.pragma(`busy_timeout = ${busyTimeout}`);
  db.pragma("cache_size = -20000"); // 20 MB memory cache
  db.pragma("temp_store = MEMORY");
  db.pragma("encoding = 'UTF-8'");

  return db;
}
