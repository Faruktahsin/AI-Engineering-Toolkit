import type { AnyPrimitive } from "@aiet/schema";
import { ulid } from "ulid";
import type { ContradictionDetectionResult } from "./types";

export class ContradictionDetector {
  public findContradictions(primitives: readonly AnyPrimitive[]): ContradictionDetectionResult[] {
    const results: ContradictionDetectionResult[] = [];
    const n = primitives.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const p1 = primitives[i];
        const p2 = primitives[j];
        if (!p1 || !p2 || p1.id === p2.id) continue;

        const c = this.evaluatePairContradiction(p1, p2);
        if (c) {
          results.push(c);
        }
      }
    }

    return results;
  }

  private evaluatePairContradiction(
    p1: AnyPrimitive,
    p2: AnyPrimitive,
  ): ContradictionDetectionResult | null {
    const t1 = this.extractText(p1).toLowerCase();
    const t2 = this.extractText(p2).toLowerCase();

    if (!t1 || !t2) return null;

    // Rule 1: Preference Conflicts ("prefers X" vs "prefers Y")
    const prefRegex = /(?:prefers?|preference for|favorite)\s+([a-z0-9_#-]+)/i;
    const match1 = t1.match(prefRegex);
    const match2 = t2.match(prefRegex);

    if (match1 && match2 && match1[1] && match2[1] && match1[1] !== match2[1]) {
      return {
        contradiction_id: `cnt_${ulid().toUpperCase()}`,
        primitive_a: p1,
        primitive_b: p2,
        conflict_type: "PREFERENCE_CONFLICT",
        reasoning: `Conflicting user preferences detected: '${match1[1]}' vs '${match2[1]}'.`,
      };
    }

    // Rule 2: Subject-attribute contradiction ("uses X" vs "uses Y")
    const useRegex = /([a-z0-9_#-]+)\s+(?:uses|implements|requires|built with)\s+([a-z0-9_#-]+)/i;
    const uMatch1 = t1.match(useRegex);
    const uMatch2 = t2.match(useRegex);

    if (
      uMatch1 &&
      uMatch2 &&
      uMatch1[1] &&
      uMatch2[1] &&
      uMatch1[1] === uMatch2[1] &&
      uMatch1[2] !== uMatch2[2]
    ) {
      return {
        contradiction_id: `cnt_${ulid().toUpperCase()}`,
        primitive_a: p1,
        primitive_b: p2,
        conflict_type: "CONTRADICTING_ASSERTION",
        reasoning: `Subject '${uMatch1[1]}' has contradictory attributes: '${uMatch1[2]}' vs '${uMatch2[2]}'.`,
      };
    }

    // Rule 3: Outdated Fact Check (same subject, different timestamps)
    if ("created_at" in p1 && "created_at" in p2) {
      const time1 = new Date(p1.created_at).getTime();
      const time2 = new Date(p2.created_at).getTime();
      const timeDiffDays = Math.abs(time1 - time2) / (1000 * 3600 * 24);

      if (timeDiffDays > 30 && this.hasOverlappingSubject(t1, t2)) {
        return {
          contradiction_id: `cnt_${ulid().toUpperCase()}`,
          primitive_a: time1 < time2 ? p1 : p2,
          primitive_b: time1 < time2 ? p2 : p1,
          conflict_type: "OUTDATED_FACT",
          reasoning: `Older fact may be outdated by newer assertion created ${timeDiffDays.toFixed(0)} days later.`,
        };
      }
    }

    return null;
  }

  private hasOverlappingSubject(t1: string, t2: string): boolean {
    const tokens1 = new Set(t1.split(/\s+/).filter((w) => w.length > 4));
    const tokens2 = t2.split(/\s+/).filter((w) => w.length > 4);
    return tokens2.some((token) => tokens1.has(token));
  }

  private extractText(primitive: AnyPrimitive): string {
    if ("claim" in primitive && typeof primitive.claim === "string") return primitive.claim;
    if ("statement" in primitive && typeof primitive.statement === "string")
      return primitive.statement;
    if ("name" in primitive && typeof primitive.name === "string") return primitive.name;
    if ("summary" in primitive && typeof primitive.summary === "string") return primitive.summary;
    return "";
  }
}
