# `@aiet/cli`

Production Command Line Interface (CLI) for compiling Personal AI Knowledge Base (PAKB) primitive JSON files into deterministic AI context artifacts (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `manifest.json`).

## Installation

```bash
pnpm add -g @aiet/cli
```

## Usage

```bash
# Compile primitives using default pakb.config.json
pakb compile

# Specify custom input and output directories
pakb compile --input ./primitives --output ./dist

# Execute in-memory dry run without writing to disk
pakb compile --dry-run --verbose

# Specify custom configuration file
pakb compile --config ./my-pakb.config.json
```

## Configuration (`pakb.config.json`)

```json
{
  "input": "./primitives",
  "output": "./dist",
  "targets": ["AGENTS.md", "CLAUDE.md", ".cursorrules", "manifest.json"],
  "budget": 500,
  "strict_mode": true
}
```

## Exit Codes

- `0`: Successful compilation
- `1`: Validation failure (`SchemaValidationError`, `IDCollisionError`, `PreambleBudgetExceededError`)
- `2`: Configuration failure (`ConfigurationError`)
- `3`: Filesystem failure (`FilesystemError`)
- `4`: Unexpected compiler failure

## License

[MIT](../../LICENSE)
