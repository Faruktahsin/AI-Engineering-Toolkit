# `@aiet/domain`

Canonical domain logic layer for the Personal AI Knowledge Base (PAKB), including Base32 ULID generation, text sanitization, secret scanning, and Ajv Draft 2020-12 schema validation per ADR-001 through ADR-005.

## Installation

```bash
pnpm add @aiet/domain
```

## Usage

```typescript
import {
  generateULID,
  validateULID,
  sanitizeText,
  containsSecrets,
  validatePrimitive,
  validateOrThrow
} from "@aiet/domain";

// 1. ULID Generation
const entityId = generateULID("entity"); // "ent_01J4X89K9Z1A2B3C4D5E6F7G8H"

// 2. Text Sanitization
const sanitized = sanitizeText("Hello\u200BWorld"); // "HelloWorld"

// 3. Secret Scanning
const secretScan = containsSecrets("Text containing API credentials");

// 4. Schema Validation
const validation = validatePrimitive(myEntityPayload);
if (validation.valid) {
  // Safe to persist
}
```

## License

[MIT](../../LICENSE)
