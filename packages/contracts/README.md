# `@aiet/contracts`

Shared contract interfaces, types, JSON schemas, and typed registries for the AI Engineering Toolkit (AIET).

## Installation

```bash
pnpm add @aiet/contracts
```

## Usage

```typescript
import {
  AIProvider,
  ChatProvider,
  Tool,
  ToolRegistryImpl,
  ProviderRegistry,
  ILifecycle
} from "@aiet/contracts";

// Typed Provider Registry
const providerRegistry = new ProviderRegistry();

// Typed Tool Registry
const toolRegistry = new ToolRegistryImpl();
```

## License

[MIT](../../LICENSE)
