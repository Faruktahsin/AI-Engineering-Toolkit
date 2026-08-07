import { execSync } from "node:child_process";
import fs from "node:fs";
import process from "node:process";

const SECRET_PATTERNS = [
  { name: "Generic API Key", regex: /api[_-]?key\s*[:=]\s*['"]?[a-zA-Z0-9_\-]{16,}['"]?/i },
  { name: "Generic Secret", regex: /secret[_-]?key\s*[:=]\s*['"]?[a-zA-Z0-9_\-]{16,}['"]?/i },
  { name: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/ },
  { name: "Private Key Header", regex: /-----BEGIN\s+(RSA|EC|DSA|OPENSSH|PRIVATE)\s+KEY-----/ },
  { name: "GitHub Personal Token", regex: /ghp_[a-zA-Z0-9]{36}/ },
  { name: "Slack Token", regex: /xox[baprs]-[0-9a-zA-Z]{10,48}/ },
  { name: "JWT Token", regex: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/ },
];

function getStagedFiles() {
  try {
    const output = execSync("git diff --cached --name-only --diff-filter=ACMR", {
      encoding: "utf8",
    });
    return output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

function isBinary(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    for (let i = 0; i < Math.min(buffer.length, 512); i++) {
      if (buffer[i] === 0) return true;
    }
    return false;
  } catch {
    return false;
  }
}

const stagedFiles = getStagedFiles();
let secretCount = 0;

for (const filePath of stagedFiles) {
  if (
    !fs.existsSync(filePath) ||
    isBinary(filePath) ||
    filePath.includes("/tests/") ||
    filePath.includes("/test/") ||
    filePath.endsWith(".test.ts") ||
    filePath.endsWith(".spec.ts") ||
    filePath.endsWith(".md")
  ) {
    continue;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.regex.test(line)) {
        secretCount++;
        console.error(
          `\x1b[31m[SECRET DETECTED] File: ${filePath}:${lineIndex + 1} | Pattern: ${pattern.name}\x1b[0m`,
        );
      }
    }
  }
}

if (secretCount > 0) {
  console.error(
    `\x1b[31m\n[FAILED] Found ${secretCount} potential secret(s) in staged files.\x1b[0m`,
  );
  process.exit(1);
}

console.log("\x1b[32m[OK] Secret scan passed. No secrets detected.\x1b[0m");
process.exit(0);
