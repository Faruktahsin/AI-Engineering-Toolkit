# `@aiet/config`

Typed configuration loader, environment variable parser, runtime validator, and immutable config engine for the AI Engineering Toolkit (AIET).

## Installation

```bash
pnpm add @aiet/config
```

## Usage

```typescript
import { ConfigLoader } from "@aiet/config";

interface AppConfig extends Record<string, unknown> {
  port: number;
  environment: string;
}

const loader = new ConfigLoader<AppConfig>({
  defaults: { port: 3000, environment: "development" },
  jsonPath: "./app.config.json",
  envPrefix: "AIET",
  validator: (config) => {
    // Perform custom runtime validation
    return config as AppConfig;
  },
});

const { config, sourcesLoaded } = loader.load();
// config is deeply frozen and immutable
```

## License

[MIT](../../LICENSE)
