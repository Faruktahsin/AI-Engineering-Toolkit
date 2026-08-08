# `@aiet/compiler`

> Deterministic context compiler and token budgeting engine for **AIET**.

---

## Features

- **Multi-Stage Pipeline**: Filtering, priority scoring, budget fitting, and format output stages.
- **Token Budget Enforcement**: Fits system instructions within tight token windows (e.g. $\le 500$ tokens) using exact tokenizers (`cl100k_base`).
- **Reproducible Artifacts**: SHA-256 JCS canonical hash generation for bit-for-bit identical preamble output builds.
