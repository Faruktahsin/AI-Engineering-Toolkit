export interface SanitizationResult {
  readonly original: string;
  readonly sanitized: string;
  readonly modified: boolean;
  readonly removedCodepoints: readonly string[];
}

export interface SecretFinding {
  readonly type: string;
  readonly match: string;
  readonly start: number;
  readonly end: number;
}

export interface SecretScanResult {
  readonly detected: boolean;
  readonly findings: readonly SecretFinding[];
}

// Regex for Unicode Cf (Other, format) category characters
// Unicode Cf category covers U+200B, U+200C, U+200D, U+2060, U+FEFF,
// U+202A, U+202B, U+202D, U+202E, U+2066, U+2067, U+2068, U+2069, etc.
export const UNICODE_CF_REGEX = /\p{Cf}/gu;

export const SECRET_PATTERNS: ReadonlyArray<{ readonly type: string; readonly regex: RegExp }> = [
  { type: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/g },
  { type: "GitHub PAT", regex: /ghp_[a-zA-Z0-9]{36}/g },
  { type: "Anthropic API Key", regex: /sk-ant-[a-zA-Z0-9_\-]{32,}/g },
  { type: "OpenAI API Key", regex: /sk-(?!ant-)[a-zA-Z0-9_\-]{32,}/g },
  { type: "Google API Key", regex: /AIzaSy[a-zA-Z0-9_\-]{35}/g },
  { type: "Slack Token", regex: /xox[baprs]-[0-9a-zA-Z]{10,48}/g },
  { type: "JWT Token", regex: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g },
  {
    type: "PEM Private Key",
    regex:
      /-----BEGIN\s+(?:RSA|EC|DSA|OPENSSH|PRIVATE)\s+KEY-----[\s\S]*?-----END\s+(?:RSA|EC|DSA|OPENSSH|PRIVATE)\s+KEY-----/g,
  },
];

/**
 * Checks if the text contains any zero-width or formatting Unicode Cf characters.
 */
export function containsZeroWidth(text: string): boolean {
  if (typeof text !== "string" || text.length === 0) {
    return false;
  }
  return /\p{Cf}/u.test(text);
}

/**
 * Strips all zero-width and formatting Unicode Cf characters from the text.
 */
export function stripZeroWidth(text: string): string {
  if (typeof text !== "string" || text.length === 0) {
    return text ?? "";
  }
  return text.replace(/\p{Cf}/gu, "");
}

/**
 * Sanitizes the text by removing Unicode Cf characters, returning metadata and unique removed codepoints.
 */
export function sanitizeText(text: string): SanitizationResult {
  if (typeof text !== "string") {
    return {
      original: "",
      sanitized: "",
      modified: false,
      removedCodepoints: [],
    };
  }

  const removedCodepointsSet = new Set<string>();
  const matches = text.match(/\p{Cf}/gu);

  if (matches) {
    for (const match of matches) {
      const codePointHex = `U+${match.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0")}`;
      removedCodepointsSet.add(codePointHex);
    }
  }

  const sanitized = text.replace(/\p{Cf}/gu, "");
  const modified = sanitized !== text;

  return {
    original: text,
    sanitized,
    modified,
    removedCodepoints: Array.from(removedCodepointsSet).sort(),
  };
}

/**
 * Scans text for credentials and secret patterns, returning detected findings with character offsets.
 */
export function containsSecrets(text: string): SecretScanResult {
  if (typeof text !== "string" || text.length === 0) {
    return {
      detected: false,
      findings: [],
    };
  }

  const rawFindings: SecretFinding[] = [];

  for (const pattern of SECRET_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;

    while (true) {
      match = regex.exec(text);
      if (match === null) break;
      rawFindings.push({
        type: pattern.type,
        match: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  // Sort raw findings by start offset ascending, then by match length descending
  rawFindings.sort((a, b) => a.start - b.start || b.match.length - a.match.length);

  // Filter out overlapping sub-matches
  const findings: SecretFinding[] = [];
  let lastEnd = -1;

  for (const finding of rawFindings) {
    if (finding.start >= lastEnd) {
      findings.push(finding);
      lastEnd = finding.end;
    }
  }

  return {
    detected: findings.length > 0,
    findings,
  };
}
