# AIET v0.1.0 Empirical Baseline Benchmark Report

## 1. Environment Metadata & Benchmark Configuration

- **Benchmark Infrastructure Version**: `0.1.0-alpha`
- **AIET Commit SHA**: `8ff192e`
- **Node.js Version**: `v22.23.2`
- **pnpm Version**: `11.20.0`
- **Platform / Architecture**: `darwin (arm64)`
- **Benchmark Timestamp**: `2026-08-09T11:01:44.734Z`
- **Dataset Version**: `1.1.0`
- **Seeded Corpus Size**: `100` primitives
- **Evaluated Query Count**: `13` ground-truth queries

---

## 2. OBSERVED BENCHMARK RESULTS

### A. Retrieval Strategy Evaluation

> **Methodology Note**: Measurements strictly isolate ranking algorithm execution time from network/API latency.
> Mock/synthetic vectors are explicitly labeled as **Structural Mechanics Only** and are **NOT** used to make semantic quality claims.

| Strategy | Model / Provider Info | Precision@1 | Precision@3 | Recall@3 | MRR | nDCG@3 | Mean Latency | p95 Latency | Quality Claim Valid? |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **BM25_Lexical** | SQLite FTS5 (Lexical Only) | `0.0769` | `0.0256` | `0.0769` | `0.0769` | `0.0769` | `0.074ms` | `0.193ms` | ✅ YES |
| **Mock_Vector_Structural_Only** | Deterministic Seed Vector (Structural Mechanics Only) | `0` | `0` | `0` | `0` | `0` | `0.013ms` | `0.06ms` | ⚠️ NO (Structural Only) |
| **Hybrid_RRF** | Reciprocal Rank Fusion (k=60) | `0.0769` | `0.0256` | `0.0769` | `0.0769` | `0.0769` | `0.074ms` | `0.223ms` | ✅ YES |

### B. Context Compiler Token Efficiency & Budget Matrix

Workload Stress Scale: **~6,500 raw input tokens** evaluated against 500, 1000, 2000, and 4000 token limit targets.

| Token Budget Limit | Raw Input Tokens (Est.) | Candidate Primitives | Selected Primitives | Compiled Tokens | Token Efficiency (%) | Budget Compliance (%) | Budget Binding? | Compliance Status |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **500 tokens** | `6167` | `200` | `25` | `492` | `92.02%` | `100%` | YES (Binding) | ✅ PASSED |
| **1000 tokens** | `6167` | `200` | `47` | `1000` | `83.78%` | `100%` | YES (Binding) | ✅ PASSED |
| **2000 tokens** | `6167` | `200` | `79` | `1992` | `67.7%` | `100%` | YES (Binding) | ✅ PASSED |
| **4000 tokens** | `6167` | `200` | `162` | `3979` | `35.48%` | `100%` | YES (Binding) | ✅ PASSED |

### C. Determinism & Reproducibility Verification

| Test Scope | Executions | Identical SHA-256 Hashes | Match Rate (%) | Aggregate Output Fingerprint |
| :--- | :---: | :---: | :---: | :--- |
| **In-Process Sequential** | `25` | `25` | `100%` | `949795772732559dfefca14443814e08a6aee7002f35548a56dba69613d4d69a` |
| **Cross-Instance Isolated (In-Memory Pipeline)** | `10` | `10` | `100%` | `949795772732559dfefca14443814e08a6aee7002f35548a56dba69613d4d69a` |

*Observed Determinism*: **100% observed reproducibility across 25 in-process and 10 cross-process executions under identical input state and compiler configuration.**

### D. Memory Consolidation & Contradiction Resolution

| Metric | Measured Value | Benchmark Scope / Standard | Evaluation Status |
| :--- | :---: | :---: | :---: |
| **Total Workload Primitives** | `40` | N/A | Completed |
| **Evaluated Pairwise Comparisons** | `780` | $\frac{N(N-1)}{2}$ | Completed |
| **Ground-Truth Conflict Pairs** | `15` | Intended Contradiction Pairs | Ground Truth |
| **True Positives (TP)** | `15` | Detected Ground-Truth Pairs | Correct Detection |
| **False Positives (FP)** | `188` | Cross-Domain Regex Matches | Over-Detection |
| **False Negatives (FN)** | `0` | Missed Ground-Truth Pairs | None Missed |
| **True Negatives (TN)** | `577` | Correct Unflagged Control Pairs | Correct Non-Match |
| **Supersession Recall** | `100%` | $\frac{TP}{TP + FN}$ | ✅ 100% Coverage |
| **Supersession Precision** | `7.39%` | $\frac{TP}{TP + FP}$ | ⚠️ Unconstrained Regex Scope |
| **Pairwise Accuracy** | `75.9%` | $\frac{TP + TN}{\text{Total Pairs}}$ | Completed |

---

## 3. METHODOLOGY & LIMITATIONS

1. **Synthetic Vector Scope**: Mock vector embeddings test SQLite vector index storage mechanics and RRF score calculation, but do not measure real semantic embedding recall. Real vector quality benchmarks require precomputed semantic embeddings or local ONNX embedding models.
2. **Ranking vs Network Latency**: Benchmark metrics strictly capture SQLite query execution and in-memory scoring latency. Network latency from remote embedding providers (e.g. OpenAI API) is intentionally excluded from ranking algorithm latency metrics.
3. **Determinism Boundary**: Bit-for-bit determinism applies strictly to the 7-stage context compiler pipeline and fitted Tier 0 primitives. External non-deterministic LLM text generation is outside the deterministic compiler boundary.
4. **Consolidation Precision Boundary**: In this benchmark scope, the rule-based preference detector matches `"prefers X"` vs `"prefers Y"` patterns across all pairs in the dataset, producing pairwise false positives across independent domains. Ground-truth recall remains 100% ($TP = 15, FN = 0$).

---

## 4. FUTURE BENCHMARK ROADMAP

1. **Local ONNX Semantic Embedding Benchmark**: Evaluate local embedding model inference latency (e.g. `all-MiniLM-L6-v2`) alongside SQLite vector retrieval precision.
2. **Domain-Scoped Contradiction Filtering**: Enhance consolidation detector rules to filter cross-domain preference pairs before evaluation.
3. **Multi-Agent Concurrent Query Benchmark**: Measure SQLite WAL mode concurrency and lock contention under multi-agent parallel read/write workloads.
