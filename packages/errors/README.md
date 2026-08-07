# `@aiet/errors`

Shared error hierarchy, canonical error codes, cause chaining, and serialization utilities for the AI Engineering Toolkit (AIET).

## Installation

```bash
pnpm add @aiet/errors
```

## Usage

```typescript
import { AIETError, AIETErrorCode, serializeError, deserializeError } from "@aiet/errors";

const err = new AIETError("Failed to resolve entity", {
  code: AIETErrorCode.NOT_FOUND,
  targetId: "ent_01J4X89K9Z1A2B3C4D5E6F7G8H",
  cause: new Error("Database timeout"),
});

const serialized = serializeError(err);
```

## License

[MIT](../../LICENSE)
