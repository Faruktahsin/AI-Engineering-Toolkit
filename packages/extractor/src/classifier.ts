import { SensitivityTier } from "@aiet/schema";

const SENSITIVE_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/i, // OpenAI API Key
  /AKIA[0-9A-Z]{16}/, // AWS Access Key ID
  /ghp_[a-zA-Z0-9]{36}/, // GitHub Personal Access Token
  /bearer\s+[a-zA-Z0-9_\-\.]{20,}/i, // Bearer Token
  /password\s*[:=]\s*\S+/i, // Password assignments
  /secret\s*[:=]\s*\S+/i, // Secret assignments
  /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\b/, // Visa/Mastercard credit cards
];

const FILLER_PATTERNS = [
  /^(thanks?|thank\s+you|thx|ok|okay|cool|awesome|got\s+it|sounds\s+good|hi|hello|hey|test)\b[!\.\?]*$/i,
  /^(ok|okay)\s+(cool|thanks?|awesome|got\s+it|sounds\s+good)[!\.\?]*$/i,
  /^(can\s+you\s+hear\s+me|are\s+you\s+there|testing\s+123)[!\.\?]*$/i,
];

export function isConversationalFiller(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length === 0 || trimmed.length > 200) {
    return false;
  }
  return FILLER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function classifySensitivity(text: string): SensitivityTier {
  const isSensitive = SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
  return isSensitive ? SensitivityTier.RESTRICTED : SensitivityTier.PUBLIC;
}
