# PAKB Security Policy & Vulnerability Disclosure

## Security Model & Guarantees

The Personal AI Knowledge Base (PAKB) adheres to a strict local-first security architecture:

1. **Zero External Egress by Default**: PAKB runs locally over `stdio` or loopback `127.0.0.1` transport interfaces.
2. **Strict Sensitivity Boundaries (ADR-002)**: Primitives classified as `sensitivity: restricted` (credentials, private PII, medical records, financial keys) are permanently excluded from LLM context windows and prompt emissions.
3. **Pre-Commit Zero-Width Character Sanitization**: Pre-commit hooks strip Unicode format characters (`\p{Cf}`) to prevent prompt injection via invisible characters.
4. **Credential Scanning**: Automated scanning blocks hardcoded API keys and PEM private keys prior to commit and compilation.

## Reporting a Vulnerability

If you discover a security vulnerability or prompt injection vector in PAKB, please **do NOT report it publicly** via GitHub Issues.

Instead, please report security issues directly to the security maintainers:

* **Primary Security Contact:** Faruk Tahsin (`faruktahsin@gmail.com`)
* **Security Response SLA:** We aim to acknowledge reports within **24 hours** and provide an initial assessment or patch plan within **72 hours**.

Please include in your report:
- Type of vulnerability (e.g., prompt injection, credential disclosure, zero-width smuggling, path traversal).
- Affected package (`@aiet/schema`, `@aiet/domain`, `@aiet/storage`, `@aiet/mcp-server`, `@aiet/compiler`, `@aiet/cli`).
- Step-by-step reproduction code or primitive payload.
- Potential impact.

## Security Updates

Security fixes are released as patch updates to the stable `1.0.x` release series and published to npm with cryptographic OIDC build provenance attestations.
