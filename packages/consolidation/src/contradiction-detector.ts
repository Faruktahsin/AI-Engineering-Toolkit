import type { AnyPrimitive } from "@aiet/schema";
import { ulid } from "ulid";
import type { ContradictionDetectionResult } from "./types";

interface PreferenceStatement {
  readonly subject: string;
  readonly value: string;
  readonly context: string | null;
}

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

    // Rule 1: Preference conflicts must refer to the same subject and decision scope.
    // A user can prefer different tools for different jobs without a contradiction.
    const preference1 = this.parsePreference(t1);
    const preference2 = this.parsePreference(t2);

    if (
      preference1 &&
      preference2 &&
      preference1.subject === preference2.subject &&
      preference1.value !== preference2.value &&
      this.hasSharedPreferenceScope(p1, p2, preference1, preference2)
    ) {
      return {
        contradiction_id: `cnt_${ulid().toUpperCase()}`,
        primitive_a: p1,
        primitive_b: p2,
        conflict_type: "PREFERENCE_CONFLICT",
        reasoning: `Conflicting ${preference1.subject} preferences detected in the same scope: '${preference1.value}' vs '${preference2.value}'.`,
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
    const tokens1 = this.subjectTokens(t1);
    const tokens2 = this.subjectTokens(t2);
    let sharedTokens = 0;

    for (const token of tokens2) {
      if (tokens1.has(token)) sharedTokens++;
      if (sharedTokens >= 2) return true;
    }

    return false;
  }

  private subjectTokens(text: string): Set<string> {
    const genericTokens = new Set([
      "assertion",
      "claim",
      "current",
      "fact",
      "implementation",
      "prefers",
      "preference",
      "setting",
      "system",
      "user",
    ]);

    return new Set(
      text
        .split(/[^a-z0-9_#-]+/i)
        .map((token) => token.toLowerCase())
        .filter((token) => token.length > 3 && !genericTokens.has(token)),
    );
  }

  private parsePreference(text: string): PreferenceStatement | null {
    const normalizedText = this.stripTerminalPunctuation(this.normalizeScope(text));
    const marker = this.findPreferenceMarker(normalizedText);
    if (!marker) return null;

    const subject = normalizedText.slice(0, marker.index).trim();
    const remainder = normalizedText.slice(marker.index + marker.value.length).trim();
    if (!subject || !remainder) return null;

    const contextIndex = remainder.indexOf(" for ");
    const value = contextIndex === -1 ? remainder : remainder.slice(0, contextIndex);
    const context = contextIndex === -1 ? null : remainder.slice(contextIndex + " for ".length);
    if (!value || (contextIndex !== -1 && !context)) return null;

    return {
      subject,
      value: this.normalizeScope(value),
      context: context ? this.normalizeScope(context) : null,
    };
  }

  private findPreferenceMarker(text: string): { index: number; value: string } | null {
    const markers = [" preference for ", " prefers ", " prefer ", " favorite "];

    for (const marker of markers) {
      const index = text.indexOf(marker);
      if (index > 0) return { index, value: marker };
    }

    return null;
  }

  private stripTerminalPunctuation(text: string): string {
    let end = text.length;

    while (end > 0 && ".!?".includes(text[end - 1] ?? "")) end--;

    return text.slice(0, end);
  }

  private hasSharedPreferenceScope(
    p1: AnyPrimitive,
    p2: AnyPrimitive,
    preference1: PreferenceStatement,
    preference2: PreferenceStatement,
  ): boolean {
    if (preference1.context && preference1.context === preference2.context) return true;

    const domain1 = "domain" in p1 && typeof p1.domain === "string" ? p1.domain : null;
    const domain2 = "domain" in p2 && typeof p2.domain === "string" ? p2.domain : null;
    if (domain1 !== null || domain2 !== null) return domain1 !== null && domain1 === domain2;

    // Preferences without a narrower context are global preferences. Treat two such
    // statements about the same subject as sharing the implicit global scope.
    return preference1.context === null && preference2.context === null;
  }

  private normalizeScope(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
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
