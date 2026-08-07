# `@aiet/logging`

Structured logger, JSON and human-readable log formatters, child loggers, and deterministic log formatting for the AI Engineering Toolkit (AIET).

## Installation

```bash
pnpm add @aiet/logging
```

## Usage

```typescript
import { Logger, LogLevel } from "@aiet/logging";

const logger = new Logger({
  name: "storage-service",
  level: LogLevel.INFO,
  formatter: "json", // or "human"
});

logger.info("Database connected", { host: "localhost", port: 5432 });

// Create child logger with bound context
const childLogger = logger.child({ component: "sqlite-migration" });
childLogger.warn("Migration pending", { version: 1 });
```

## License

[MIT](../../LICENSE)
