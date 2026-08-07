# AI Engineering Toolkit: Code & Documentation Style Guide

## TypeScript Conventions
- Monorepo tooling enforced via **Biome** (`biome.json`).
- Strict typing enabled (`"strict": true`, `"noImplicitAny": true`). Zero usage of `any`.
- Files named in `kebab-case.ts`. Classes in `PascalCase`, functions/variables in `camelCase`.
- Dual CJS/ESM bundling via `tsup`.

## Python Conventions
- Formatted via **Ruff**. Type checked via **Pyright** / **Mypy**.
- Snake_case module and function names (`context_compiler.py`).
- Strict PEP 8 and PEP 484 type hints mandatory on all public APIs.

## Markdown & Prompt Schema Standards
- Line length <= 120 characters where applicable.
- Prompt files formatted in valid XML / JSON schema with version identifiers (`.v1.json`).
