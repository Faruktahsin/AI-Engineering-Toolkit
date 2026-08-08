# `@aiet/cli`

> Command Line Interface (CLI) tooling for **AI Engineering Toolkit (AIET)**.

---

## Installation

```bash
npm install -g @aiet/cli
# or
pnpm add -g @aiet/cli
```

---

## Basic Usage

```bash
# Initialize a new AIET project
aiet init

# Run system health diagnostics
aiet doctor

# Connect AIET MCP server to local AI agents
aiet connect claude
aiet connect cursor

# Compile prompt preamble
aiet compile --format CLAUDE.md --budget 500
```
