# Security & Privacy Policy for AIET

## Overview

The **AI Engineering Toolkit (AIET)** is built around strict **privacy-first**, **local-first**, and **zero-egress** core design principles.

- **Local Storage**: All persistent memories, vector embeddings, proposals, and audit logs remain strictly within local SQLite WAL databases (`.aiet/memory.db` or configured local path).
- **Zero Egress**: AIET does not transmit or report local memory primitives, search queries, or environment context to any remote telemetry or third-party server.
- **Sensitivity Tiers**: Memory primitives enforce sensitivity boundaries (`PUBLIC`, `INTERNAL`, `RESTRICTED`). Restricted memories are never compiled into context outputs or transmitted unless explicitly approved via `@aiet/governance`.

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
