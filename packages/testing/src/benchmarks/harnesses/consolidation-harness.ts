import { ContradictionDetector } from "@aiet/consolidation";
import { generateULID } from "@aiet/domain";
import type { AnyPrimitive } from "@aiet/schema";
import type { GroundTruthDatasetSchema } from "../datasets/dataset-types";

export interface ConsolidationBenchmarkSummary {
  totalPrimitivesCount: number;
  totalPairsEvaluated: number;
  groundTruthConflictPairsCount: number;
  detectedContradictionsCount: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  precisionPercent: number;
  recallPercent: number;
  accuracyPercent: number;
  notes: string;
}

export async function runConsolidationHarness(
  _dataset: GroundTruthDatasetSchema,
): Promise<ConsolidationBenchmarkSummary> {
  const detector = new ContradictionDetector();

  const basePrimitive = {
    schema_version: "1.0.0",
    last_verified: "2026-08-08T12:00:00Z",
    sensitivity: "public",
    volatility: "low",
    activation: "always_on",
  };

  const primitives: AnyPrimitive[] = [];
  const groundTruthPairsSet = new Set<string>();

  // 1. Generate 10 Intended Preference Conflict Pairs (20 primitives)
  const prefPairs: Array<[string, string]> = [
    ["User prefers Jest for testing framework.", "User prefers Vitest for testing framework."],
    ["User prefers Webpack for module bundler.", "User prefers tsup for module bundler."],
    ["User prefers ESLint for code linter.", "User prefers Biome for code linter."],
    ["User prefers Prettier for code formatter.", "User prefers Biome for code formatter."],
    ["User prefers npm for package manager.", "User prefers pnpm for package manager."],
    ["User prefers React for UI library.", "User prefers Vanilla JS for UI library."],
    ["User prefers REST for API architecture.", "User prefers GraphQL for API architecture."],
    ["User prefers Docker for container runtime.", "User prefers Podman for container runtime."],
    [
      "User prefers Python for automation scripts.",
      "User prefers TypeScript for automation scripts.",
    ],
    [
      "User prefers Mac OS for development platform.",
      "User prefers Linux for development platform.",
    ],
  ];

  for (let i = 0; i < prefPairs.length; i++) {
    const pair = prefPairs[i];
    if (!pair) continue;
    const pAId = generateULID("directive");
    const pBId = generateULID("directive");

    primitives.push(
      {
        ...basePrimitive,
        id: pAId,
        scope: "global",
        entity_type: "Directive",
        statement: pair[0],
        enforcement: "hard",
        domain: `domain-${i}`,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        version: 1,
      } as AnyPrimitive,
      {
        ...basePrimitive,
        id: pBId,
        scope: "global",
        entity_type: "Directive",
        statement: pair[1],
        enforcement: "hard",
        domain: `domain-${i}`,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
        version: 1,
      } as AnyPrimitive,
    );

    const pairKey = [pAId, pBId].sort().join(":");
    groundTruthPairsSet.add(pairKey);
  }

  // 2. Generate 5 Intended Outdated Assertion Pairs (10 primitives)
  const assertPairs: Array<[string, string]> = [
    [
      "Project runtime target is Node.js 16 environment.",
      "Project runtime target is Node.js 20 LTS environment.",
    ],
    [
      "Database backend engine uses SQLite in DELETE journal mode.",
      "Database backend engine uses SQLite in WAL journal mode.",
    ],
    [
      "Package deployment target is AWS Lambda cloud function.",
      "Package deployment target is Vercel Edge cloud function.",
    ],
    [
      "Build system pipeline uses Gulp legacy task runner.",
      "Build system pipeline uses Turborepo modern build pipeline.",
    ],
    [
      "API transport protocol relies on gRPC protobufs interface.",
      "API transport protocol relies on Model Context Protocol stdio interface.",
    ],
  ];

  for (let i = 0; i < assertPairs.length; i++) {
    const pair = assertPairs[i];
    if (!pair) continue;
    const pAId = generateULID("assertion");
    const pBId = generateULID("assertion");

    primitives.push(
      {
        ...basePrimitive,
        id: pAId,
        scope: "global",
        entity_type: "Assertion",
        claim: pair[0],
        evidence_type: "observed",
        type: "fact",
        status: "accepted",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        version: 1,
      } as AnyPrimitive,
      {
        ...basePrimitive,
        id: pBId,
        scope: "global",
        entity_type: "Assertion",
        claim: pair[1],
        evidence_type: "observed",
        type: "fact",
        status: "accepted",
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
        version: 1,
      } as AnyPrimitive,
    );

    const pairKey = [pAId, pBId].sort().join(":");
    groundTruthPairsSet.add(pairKey);
  }

  // 3. Generate 5 Independent Non-Conflicting Control Primitives (10 primitives)
  for (let i = 1; i <= 5; i++) {
    primitives.push(
      {
        ...basePrimitive,
        id: generateULID("directive"),
        scope: "global",
        entity_type: "Directive",
        statement: `Control directive #${i} enforcing clean decoupled architecture in component alpha.`,
        enforcement: "hard",
        domain: `control-domain-${i}`,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
        version: 1,
      } as AnyPrimitive,
      {
        ...basePrimitive,
        id: generateULID("assertion"),
        scope: "global",
        entity_type: "Assertion",
        claim: `Control assertion #${i} documenting system invariant in component beta.`,
        evidence_type: "observed",
        type: "fact",
        status: "accepted",
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
        version: 1,
      } as AnyPrimitive,
    );
  }

  const totalPrimitivesCount = primitives.length;
  const totalPairsEvaluated = (totalPrimitivesCount * (totalPrimitivesCount - 1)) / 2;
  const detections = detector.findContradictions(primitives);

  let truePositives = 0;
  let falsePositives = 0;

  for (const d of detections) {
    const pairKey = [d.primitive_a.id, d.primitive_b.id].sort().join(":");
    if (groundTruthPairsSet.has(pairKey)) {
      truePositives++;
    } else {
      falsePositives++;
    }
  }

  const falseNegatives = groundTruthPairsSet.size - truePositives;
  const trueNegatives = totalPairsEvaluated - (truePositives + falsePositives + falseNegatives);

  const precisionPercent =
    truePositives + falsePositives > 0
      ? (truePositives / (truePositives + falsePositives)) * 100
      : 0;
  const recallPercent =
    truePositives + falseNegatives > 0
      ? (truePositives / (truePositives + falseNegatives)) * 100
      : 0;
  const accuracyPercent = ((truePositives + trueNegatives) / totalPairsEvaluated) * 100;

  return {
    totalPrimitivesCount,
    totalPairsEvaluated,
    groundTruthConflictPairsCount: groundTruthPairsSet.size,
    detectedContradictionsCount: detections.length,
    truePositives,
    falsePositives,
    falseNegatives,
    trueNegatives,
    precisionPercent: Number(precisionPercent.toFixed(2)),
    recallPercent: Number(recallPercent.toFixed(2)),
    accuracyPercent: Number(accuracyPercent.toFixed(2)),
    notes: `Evaluated ${totalPrimitivesCount} total primitives across ${totalPairsEvaluated} pairwise comparisons against ${groundTruthPairsSet.size} ground-truth conflict pairs.`,
  };
}
