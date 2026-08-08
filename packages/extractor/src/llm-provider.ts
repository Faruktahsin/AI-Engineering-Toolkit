import { generateULID, validateOrThrow } from "@aiet/domain";
import type { AnyPrimitive } from "@aiet/schema";
import { classifySensitivity, isConversationalFiller } from "./classifier";
import type {
  ConversationInput,
  ExtractionResult,
  ExtractorProvider,
  MemoryCandidate,
} from "./types";

export interface LLMExtractorOptions {
  readonly name?: string | undefined;
  readonly llmCompletionFn: (prompt: string) => Promise<string>;
}

export class LLMExtractorProvider implements ExtractorProvider {
  public readonly name: string;
  private readonly llmCompletionFn: (prompt: string) => Promise<string>;

  constructor(options: LLMExtractorOptions) {
    this.name = options.name ?? "llm-provider-extractor";
    this.llmCompletionFn = options.llmCompletionFn;
  }

  public async extract(input: ConversationInput): Promise<ExtractionResult> {
    let skippedTurns = 0;
    const activeMessages = input.messages.filter((msg) => {
      if (isConversationalFiller(msg.content)) {
        skippedTurns++;
        return false;
      }
      return true;
    });

    if (activeMessages.length === 0) {
      return { total_candidates: 0, candidates: [], skipped_turns: skippedTurns };
    }

    const prompt = `Extract all memory primitives (entities, directives, assertions, events, relations) from the following conversation transcript. Return a JSON array of objects with keys: "primitive_type", "candidate", "confidence_score", "rationale".

Transcript:
${activeMessages.map((m) => `[${m.role.toUpperCase()}]: ${m.content}`).join("\n")}
`;

    const rawResponse = await this.llmCompletionFn(prompt);
    let rawItems: Array<{
      primitive_type: "entity" | "directive" | "assertion" | "event" | "relation";
      candidate: AnyPrimitive;
      confidence_score?: number;
      rationale?: string;
    }> = [];

    try {
      const jsonText = rawResponse.substring(
        rawResponse.indexOf("["),
        rawResponse.lastIndexOf("]") + 1,
      );
      rawItems = JSON.parse(jsonText);
    } catch {
      return { total_candidates: 0, candidates: [], skipped_turns: skippedTurns };
    }

    const candidates: MemoryCandidate[] = [];
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

    for (const item of rawItems) {
      try {
        const prim = { ...(item.candidate as unknown as Record<string, unknown>) };
        if (!prim["id"]) prim["id"] = generateULID(item.primitive_type);
        if (!prim["schema_version"]) prim["schema_version"] = "1.0.0";
        if (!prim["created_at"]) prim["created_at"] = now;
        if (!prim["updated_at"]) prim["updated_at"] = now;
        if (!prim["last_verified"]) prim["last_verified"] = now;

        const contentToClassify = JSON.stringify(prim);
        prim["sensitivity"] = classifySensitivity(contentToClassify);

        validateOrThrow(prim as unknown as AnyPrimitive);

        candidates.push({
          primitive_type: item.primitive_type,
          candidate: prim as unknown as AnyPrimitive,
          confidence_score: item.confidence_score ?? 0.8,
          rationale: item.rationale ?? "LLM extracted memory primitive.",
        });
      } catch {
        // Skip invalid primitives that fail Ajv Draft 2020-12 validation
      }
    }

    return {
      total_candidates: candidates.length,
      candidates,
      skipped_turns: skippedTurns,
    };
  }
}
