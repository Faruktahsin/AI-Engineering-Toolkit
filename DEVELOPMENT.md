# AI Engineering Toolkit: Development Guide

## Prerequisites
- **Node.js**: `>=22.0.0`
- **pnpm**: `>=9.0.0`
- **Python**: `>=3.11`
- **uv**: `>=0.2.0`
- **SQLite**: `>=3.46.0`

## Initial Setup
```bash
# Clone the repository
git clone https://github.com/faruktahsin/AI-Engineering-Toolkit.git
cd AI-Engineering-Toolkit

# Install TypeScript dependencies
pnpm install

# Setup Python package environment
cd python
uv venv
source .venv/bin/activate
uv pip install -e ".[dev]"
cd ..
```

## Common Development Commands
```bash
# Run linting across all packages
pnpm lint

# Run typecheck across monorepo
pnpm typecheck

# Run unit & integration tests
pnpm test

# Build all packages via Turborepo
pnpm build

# Execute zero-width sanitization check
pnpm check:zero-width

# Execute secret scanning
pnpm check:secrets
```

## Running Local MCP Server
```bash
pnpm --filter @aiet/mcp-server dev
```
