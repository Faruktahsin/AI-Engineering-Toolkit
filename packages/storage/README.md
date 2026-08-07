# `@aiet/storage`

Canonical SQLite storage engine, DDL migrations, Drizzle ORM, JCS hashing, FTS5 search, and recursive graph query engine for the Personal AI Knowledge Base (PAKB).

## Installation

```bash
pnpm add @aiet/storage
```

## Usage

```typescript
import { PAKBStorageRepository } from "@aiet/storage";

const repo = new PAKBStorageRepository({ db_path: "path/to/pakb.db" });

// 1. Insert Primitive
repo.insertPrimitive(myEntity);

// 2. Search FTS5
const searchResults = repo.searchFTS5("architecture");

// 3. Graph Traversal (MAX_DEPTH <= 3)
const graph = repo.traverseGraph(entityId, 2);
```

## License

[MIT](../../LICENSE)
