# `@aiet/core`

Primary public TypeScript SDK for the AI Engineering Toolkit (AIET), providing stable, tree-shakeable re-exports of core schema, domain logic, storage, MCP server, and compiler pipeline capabilities.

## Installation

```bash
pnpm add @aiet/core
```

## Usage

```typescript
import {
  generateULID,
  validateOrThrow,
  PAKBStorageRepository,
  PAKBMCPServer,
  CompilerPipeline,
  BuildOrchestrator
} from "@aiet/core";

// 1. Generate ULID & Validate Primitive
const entityId = generateULID("entity");

// 2. Initialize Storage Engine
const storage = new PAKBStorageRepository({ db_path: "path/to/pakb.db" });

// 3. Run Compiler Pipeline
const pipeline = new CompilerPipeline();
const result = pipeline.run(myPrimitives);
```

## License

[MIT](../../LICENSE)
