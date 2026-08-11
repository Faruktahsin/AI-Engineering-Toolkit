# Security & Privacy Policy for AIET

## Overview

The **AI Engineering Toolkit (AIET)** is built around **privacy-first** and **local-first** core design principles. The default local storage and mock/local embedding paths do not include built-in telemetry or remote reporting.

- **Local Storage**: Persistent memories, vector embeddings, proposals, and audit logs use local SQLite WAL databases (`.aiet/memory.db` or a configured local path).
- **No Built-In Telemetry**: AIET does not include telemetry that reports local memory primitives, search queries, or environment context.
- **Optional Remote Providers**: Selecting an external provider, such as `@aiet/embeddings-openai`, sends the content required for that provider request to its configured endpoint. Configure remote providers only when this data flow is acceptable for your use case.
- **Sensitivity Tiers**: Memory primitives enforce sensitivity boundaries (`PUBLIC`, `INTERNAL`, `RESTRICTED`). Restricted memories are excluded from context outputs unless explicitly approved via `@aiet/governance`; remote-provider use remains an explicit deployment decision.

---

## Reporting a Security Vulnerability

If you discover a security vulnerability or credential leak within AIET, please **do NOT report it in public GitHub issues**.

Instead, report vulnerabilities privately by emailing:
**`security@ai-engineering-toolkit.org`**

Please include:
1. Description of the vulnerability.
2. Steps to reproduce or proof-of-concept script.
3. Impact assessment (e.g. context leakage, SQL injection, bypass of governance approval).

---

## Disclosure Timeline

- **Response Time**: We acknowledge receipt of vulnerability reports within 48 hours.
- **Patch SLA**: Critical security fixes will be released as patch versions within 7 business days.
- **Credit**: Vulnerability reporters will be credited in `RELEASE_NOTES.md` and release announcements (unless anonymity is requested).

---

## Security Best Practices for AIET Developers

1. **Credential Hygiene**: Never commit `.env` files, API keys, or raw SQLite database files (`*.sqlite`, `*.db`) to version control.
2. **Governance Gate**: Always route automated AI agent memory mutations through `@aiet/governance` memory proposals when handling sensitive entities or policy exemptions.
3. **Audit Log Integrity**: Do not clear or alter `audit_log` tables manually. AIET relies on JCS SHA-256 hash chains for tamper verification.
