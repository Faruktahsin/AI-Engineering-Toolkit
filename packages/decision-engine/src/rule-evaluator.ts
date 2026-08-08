import type {
  DecisionEngineEvaluator,
  DecisionInput,
  DecisionResult,
  MemoryDecision,
} from "./types";

const TRANSIENT_KEYWORDS = [
  /drinking\s+(coffee|tea|water)/i,
  /eating\s+(lunch|dinner|breakfast|snack)/i,
  /weather\s+is/i,
  /feeling\s+(tired|sleepy|happy)/i,
  /going\s+to\s+(sleep|bed)/i,
];

export class RuleBasedDecisionEvaluator implements DecisionEngineEvaluator {
  public readonly name = "rule-based-decision-evaluator";

  public async evaluate(input: DecisionInput): Promise<DecisionResult> {
    const { candidate, existing_memories } = input;
    const prim = candidate.candidate as unknown as Record<string, unknown>;

    const textToEvaluate =
      typeof prim["statement"] === "string"
        ? prim["statement"]
        : typeof prim["claim"] === "string"
          ? prim["claim"]
          : typeof prim["name"] === "string"
            ? prim["name"]
            : JSON.stringify(prim);

    // 1. Transient Context Filter -> IGNORE
    const isTransient = TRANSIENT_KEYWORDS.some((re) => re.test(textToEvaluate));
    if (isTransient) {
      return {
        decision: "IGNORE",
        importance_score: 0.1,
        confidence_score: candidate.confidence_score,
        novelty_score: 0.5,
        usefulness_score: 0.1,
        rationale: "Candidate identified as transient state / low future usefulness context.",
      };
    }

    // 2. Low Confidence Filter -> IGNORE
    if (candidate.confidence_score < 0.6) {
      return {
        decision: "IGNORE",
        importance_score: 0.3,
        confidence_score: candidate.confidence_score,
        novelty_score: 0.5,
        usefulness_score: 0.2,
        rationale: `Candidate confidence score (${candidate.confidence_score.toFixed(2)}) is below 0.6 threshold.`,
      };
    }

    // 3. Existing Memory Match Evaluation (Novelty & Repetition)
    let highestMatchId: string | undefined;
    let highestRrfScore = 0;

    if (existing_memories && existing_memories.length > 0) {
      const topMatch = existing_memories[0];
      if (topMatch) {
        highestMatchId = topMatch.primitive_id;
        highestRrfScore = topMatch.rrf_score;
      }
    }

    const noveltyScore = Math.max(0, 1 - highestRrfScore);

    // 4. Repetition or Existing Memory Conflict -> UPDATE or MERGE
    if (highestRrfScore > 0.85 && highestMatchId) {
      const decision: MemoryDecision = highestRrfScore > 0.95 ? "MERGE" : "UPDATE";
      return {
        decision,
        target_primitive_id: highestMatchId,
        importance_score: 0.75,
        confidence_score: candidate.confidence_score,
        novelty_score: noveltyScore,
        usefulness_score: 0.8,
        rationale: `High match score (${highestRrfScore.toFixed(2)}) against existing primitive '${highestMatchId}'. Decision: ${decision}.`,
      };
    }

    // 5. Importance & Usefulness Calculation
    let importanceScore = 0.5;
    let usefulnessScore = 0.6;

    if (candidate.primitive_type === "directive") {
      importanceScore = 0.9;
      usefulnessScore = 0.95;
    } else if (candidate.primitive_type === "entity") {
      importanceScore = 0.8;
      usefulnessScore = 0.85;
    } else if (candidate.primitive_type === "assertion") {
      importanceScore = 0.7;
      usefulnessScore = 0.75;
    }

    return {
      decision: "CREATE",
      importance_score: importanceScore,
      confidence_score: candidate.confidence_score,
      novelty_score: noveltyScore,
      usefulness_score: usefulnessScore,
      rationale: `Valid new memory candidate with high novelty (${noveltyScore.toFixed(2)}) and usefulness. Decision: CREATE.`,
    };
  }
}
