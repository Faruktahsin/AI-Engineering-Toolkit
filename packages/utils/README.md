# `@aiet/utils`

Pure, reusable utility package for hashing, filesystem, paths, JSON, UTF-8, retries, async handles, and collection operations for the AI Engineering Toolkit (AIET).

## Installation

```bash
pnpm add @aiet/utils
```

## Usage

```typescript
import { sha256, writeJsonFileAtomic, stripZeroWidth, retryWithBackoff } from "@aiet/utils";

// Hashing
const hash = sha256("hello");

// Atomic File Writing
writeJsonFileAtomic("path/to/data.json", { key: "value" });

// UTF-8 & Zero-Width Sanitization
const cleanText = stripZeroWidth("Hello\u200BWorld");

// Retry Backoff
const result = await retryWithBackoff(() => fetch("https://api.example.com"), { retries: 3 });
```

## License

[MIT](../../LICENSE)
