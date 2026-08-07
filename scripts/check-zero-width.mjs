import { execSync } from "node:child_process";
import fs from "node:fs";
import process from "node:process";

// Unicode Cf (Other, format) category regex covering invisible/zero-width formatting characters
// e.g. U+200B (Zero Width Space), U+200C (Zero Width Non-Joiner), U+200D (Zero Width Joiner),
// U+202E (Right-to-Left Override), U+FEFF (BOM/Zero Width No-Break Space)
const UNICODE_CF_REGEX = /\p{Cf}/u;

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
    // If not in a git repo or no staged files, fall back to checking tracked files or returning empty
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
let violationCount = 0;

for (const filePath of stagedFiles) {
  if (!fs.existsSync(filePath) || isBinary(filePath)) {
    continue;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    if (UNICODE_CF_REGEX.test(line)) {
      violationCount++;
      const match = line.match(/\p{Cf}/u);
      const codePoint = match
        ? `U+${match[0].codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`
        : "Unknown";
      console.error(
        `\x1b[31m[ZERO-WIDTH DETECTED] File: ${filePath}:${lineIndex + 1} | Character: ${codePoint}\x1b[0m`,
      );
    }
  }
}

if (violationCount > 0) {
  console.error(
    `\x1b[31m\n[FAILED] Found ${violationCount} Unicode Cf (format/zero-width) character violation(s).\x1b[0m`,
  );
  process.exit(1);
}

console.log(
  "\x1b[32m[OK] Zero-width character scan passed. No formatting characters detected.\x1b[0m",
);
process.exit(0);
