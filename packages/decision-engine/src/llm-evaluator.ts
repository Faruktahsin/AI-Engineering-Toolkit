import type {
  DecisionEngineEvaluator,
  DecisionInput,
  DecisionResult,
  MemoryDecision,
} from "./types";

export interface LLMDecisionEvaluatorOptions {
  readonly name?: string | undefined;
  readonly llmCompletionFn: (prompt: string) => Promise<string>;
}

export class LLMDecisionEvaluator implements DecisionEngineEvaluator {
  public readonly name: string;
  private readonly llmCompletionFn: (prompt: string) => Promise<string>;

  constructor(options: LLMDecisionEvaluatorOptions) {
    this.name = options.name ?? "llm-decision-evaluator";
    this.llmCompletionFn = options.llmCompletionFn;
  }

  public async evaluate(input: DecisionInput): Promise<DecisionResult> {
    const prompt = `Evaluate the following memory candidate for an AI agent.
Candidate Type: ${input.candidate.primitive_type}
Candidate Data: ${JSON.stringify(input.candidate.candidate)}

Existing Related Memories:
${JSON.stringify(input.existing_memories ?? [])}

Determine if this memory should be "IGNORE", "CREATE", "UPDATE", or "MERGE".
Return a JSON object with:
"decision": ("IGNORE" | "CREATE" | "UPDATE" | "MERGE"),
"target_primitive_id": (optional string if UPDATE or MERGE),
"importance_score": (number 0.0 to 1.0),
"confidence_score": (number 0.0 to 1.0),
"novelty_score": (number 0.0 to 1.0),
"usefulness_score": (number 0.0 to 1.0),
"rationale": (string explanation)
`;

    const rawResponse = await this.llmCompletionFn(prompt);
    try {
      const jsonText = rawResponse.substring(
        rawResponse.indexOf("{"),
        rawResponse.lastIndexOf("}") + 1,
      );
      const parsed = JSON.parse(jsonText) as {
        decision: MemoryDecision;
        target_primitive_id?: string;
        importance_score?: number;
        confidence_score?: number;
        novelty_score?: number;
        usefulness_score?: number;
        rationale?: string;
      };

      return {
        decision: parsed.decision ?? "IGNORE",
        target_primitive_id: parsed.target_primitive_id,
        importance_score: parsed.importance_score ?? 0.5,
        confidence_score: parsed.confidence_score ?? input.candidate.confidence_score,
        novelty_score: parsed.novelty_score ?? 0.5,
        usefulness_score: parsed.usefulness_score ?? 0.5,
        rationale: parsed.rationale ?? "LLM evaluated memory decision.",
      };
    } catch {
      return {
        decision: "IGNORE",
        importance_score: 0.1,
        confidence_score: input.candidate.confidence_score,
        novelty_score: 0.0,
        usefulness_score: 0.0,
        rationale: "Failed to parse LLM evaluation response JSON.",
      };
    }
  }
}
