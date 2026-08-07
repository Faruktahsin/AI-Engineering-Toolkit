import { describe, expect, it } from "vitest";
import { containsSecrets, containsZeroWidth, sanitizeText, stripZeroWidth } from "../src/index";

describe("Text Sanitization & Secret Scanning Engine (ETB Task 2.2.2)", () => {
  describe("Zero-Width Character Sanitization", () => {
    it("should detect zero-width characters", () => {
      expect(containsZeroWidth("Hello\u200BWorld")).toBe(true);
      expect(containsZeroWidth("Hello\u200CWorld")).toBe(true);
      expect(containsZeroWidth("Hello\u200DWorld")).toBe(true);
      expect(containsZeroWidth("Hello\u2060World")).toBe(true);
      expect(containsZeroWidth("Hello\uFEFFWorld")).toBe(true);
      expect(containsZeroWidth("Hello\u202EWorld")).toBe(true);
      expect(containsZeroWidth("Clean text")).toBe(false);
      expect(containsZeroWidth("")).toBe(false);
    });

    it("should strip all specified Unicode Cf characters", () => {
      const input =
        "A\u200BB\u200CC\u200DD\u2060E\uFEFFF\u202AG\u202BH\u202DI\u202EJ\u2066K\u2067L\u2068M\u2069N";
      const expected = "ABCDEFGHIJKLMN";
      expect(stripZeroWidth(input)).toBe(expected);
    });

    it("should return detailed SanitizationResult with unique removed codepoints", () => {
      const input = "Hello\u200BWorld\u200BTest\uFEFF";
      const result = sanitizeText(input);

      expect(result.original).toBe(input);
      expect(result.sanitized).toBe("HelloWorldTest");
      expect(result.modified).toBe(true);
      expect(result.removedCodepoints).toEqual(["U+200B", "U+FEFF"]);
    });

    it("should be idempotent", () => {
      const input = "Hello\u200BWorld\uFEFF";
      const firstPass = sanitizeText(input);
      const secondPass = sanitizeText(firstPass.sanitized);

      expect(secondPass.original).toBe(firstPass.sanitized);
      expect(secondPass.sanitized).toBe(firstPass.sanitized);
      expect(secondPass.modified).toBe(false);
      expect(secondPass.removedCodepoints).toEqual([]);
    });

    it("should handle clean text without modifications", () => {
      const input = "Regular English text 123 !@#$%^&*()";
      const result = sanitizeText(input);

      expect(result.original).toBe(input);
      expect(result.sanitized).toBe(input);
      expect(result.modified).toBe(false);
      expect(result.removedCodepoints).toEqual([]);
    });

    it("should handle empty strings and multiline text", () => {
      expect(sanitizeText("")).toEqual({
        original: "",
        sanitized: "",
        modified: false,
        removedCodepoints: [],
      });

      const multiline = "Line 1\u200B\nLine 2\uFEFF\nLine 3";
      const result = sanitizeText(multiline);
      expect(result.sanitized).toBe("Line 1\nLine 2\nLine 3");
      expect(result.modified).toBe(true);
    });
  });

  describe("Secret Scanning Engine", () => {
    it("should detect AWS Access Keys", () => {
      const mockAwsKey = ["AK", "IAIOSFODNN7EXAMPLE"].join("");
      const text = `Key: ${mockAwsKey} in config`;
      const result = containsSecrets(text);

      expect(result.detected).toBe(true);
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]?.type).toBe("AWS Access Key");
      expect(result.findings[0]?.match).toBe(mockAwsKey);
      expect(result.findings[0]?.start).toBe(5);
      expect(result.findings[0]?.end).toBe(25);
    });

    it("should detect GitHub Personal Access Tokens", () => {
      const mockGhp = ["gh", "p_1234567890abcdefghijklmnopqrstuvwxyz"].join("");
      const text = `Token ${mockGhp}`;
      const result = containsSecrets(text);

      expect(result.detected).toBe(true);
      expect(result.findings[0]?.type).toBe("GitHub PAT");
      expect(result.findings[0]?.match).toBe(mockGhp);
    });

    it("should detect OpenAI and Anthropic API keys", () => {
      const openAiText = ["sk-", "1234567890abcdefghijklmnopqrstuvwxyz123456"].join("");
      expect(containsSecrets(openAiText).detected).toBe(true);

      const anthropicText = ["sk-ant-", "1234567890abcdefghijklmnopqrstuvwxyz123456"].join("");
      expect(containsSecrets(anthropicText).detected).toBe(true);
    });

    it("should detect Google API keys, Slack tokens, and JWTs", () => {
      const googleKey = ["AIza", "Sy1234567890abcdefghijklmnopqrstuvwxyz123"].join("");
      expect(containsSecrets(googleKey).detected).toBe(true);

      const slackToken = ["xox", "b-123456789012-1234567890123-abcdefghijklmnopqrstuvwx"].join("");
      expect(containsSecrets(slackToken).detected).toBe(true);

      const jwt = [
        "ey",
        "JhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
      ].join("");
      expect(containsSecrets(jwt).detected).toBe(true);
    });

    it("should detect PEM Private Keys across lines", () => {
      const pemKey = `-----BEGIN ${"PRIVATE"} KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC\n-----END ${"PRIVATE"} KEY-----`;
      const result = containsSecrets(pemKey);

      expect(result.detected).toBe(true);
      expect(result.findings[0]?.type).toBe("PEM Private Key");
    });

    it("should return no findings for ordinary English text and non-secret strings", () => {
      const plainText = "This is a normal sentence about software engineering and architecture.";
      const result = containsSecrets(plainText);

      expect(result.detected).toBe(false);
      expect(result.findings).toHaveLength(0);
    });

    it("should return exact character offsets for multiple secrets in one string", () => {
      const mockAwsKey = ["AK", "IAIOSFODNN7EXAMPLE"].join("");
      const mockGhp = ["gh", "p_1234567890abcdefghijklmnopqrstuvwxyz"].join("");
      const text = `AWS: ${mockAwsKey} and GH: ${mockGhp}`;
      const result = containsSecrets(text);

      expect(result.detected).toBe(true);
      expect(result.findings).toHaveLength(2);
      expect(result.findings[0]?.start).toBe(5);
      expect(result.findings[1]?.start).toBe(34);
    });
  });
});
