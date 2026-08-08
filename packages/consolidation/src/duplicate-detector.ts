import { cosineSimilarity } from "@aiet/embeddings";
import type { AnyPrimitive } from "@aiet/schema";
import { calculateJCSHash } from "@aiet/storage";
import { ulid } from "ulid";
import type { DuplicateDetectionResult } from "./types";

export class DuplicateDetector {
  public findDuplicates(
    primitives: readonly AnyPrimitive[],
    embeddings?: Map<string, number[]>,
  ): DuplicateDetectionResult[] {
    const results: DuplicateDetectionResult[] = [];
    const n = primitives.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const p1 = primitives[i];
        const p2 = primitives[j];
        if (!p1 || !p2 || p1.id === p2.id) continue;

        // 1. Exact JCS Hash Match
        const hash1 = calculateJCSHash(p1);
        const hash2 = calculateJCSHash(p2);
        if (hash1 === hash2) {
          results.push({
            duplicate_id: `dup_${ulid().toUpperCase()}`,
            primitive_a: p1,
            primitive_b: p2,
            match_type: "jcs_hash_exact",
            similarity_score: 1.0,
          });
          continue;
        }

        // 2. Vector Embedding Similarity
        if (embeddings?.has(p1.id) && embeddings?.has(p2.id)) {
          const v1 = embeddings.get(p1.id);
          const v2 = embeddings.get(p2.id);
          if (v1 && v2) {
            const sim = cosineSimilarity(new Float32Array(v1), new Float32Array(v2));
            if (sim >= 0.88) {
              results.push({
                duplicate_id: `dup_${ulid().toUpperCase()}`,
                primitive_a: p1,
                primitive_b: p2,
                match_type: "vector_similarity",
                similarity_score: sim,
              });
              continue;
            }
          }
        }

        // 3. Normalized Text Match
        const text1 = this.extractSearchableText(p1).toLowerCase().trim();
        const text2 = this.extractSearchableText(p2).toLowerCase().trim();

        if (text1 && text2 && text1 === text2) {
          results.push({
            duplicate_id: `dup_${ulid().toUpperCase()}`,
            primitive_a: p1,
            primitive_b: p2,
            match_type: "text_exact",
            similarity_score: 0.95,
          });
        }
      }
    }

    return results;
  }

  private extractSearchableText(primitive: AnyPrimitive): string {
    if ("name" in primitive && typeof primitive.name === "string") {
      return primitive.name;
    }
    if ("claim" in primitive && typeof primitive.claim === "string") {
      return primitive.claim;
    }
    if ("statement" in primitive && typeof primitive.statement === "string") {
      return primitive.statement;
    }
    if ("summary" in primitive && typeof primitive.summary === "string") {
      return primitive.summary;
    }
    return "";
  }
}
