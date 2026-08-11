import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tag = process.env["GITHUB_REF_NAME"];

if (!tag?.startsWith("v")) {
  console.error(
    "[ERROR] Release verification requires GITHUB_REF_NAME in the form vMAJOR.MINOR.PATCH.",
  );
  process.exit(1);
}

const expectedVersion = tag.slice(1);
const packageDirectory = path.join(repositoryRoot, "packages");
const mismatches = [];
const rootManifest = JSON.parse(readFileSync(path.join(repositoryRoot, "package.json"), "utf8"));

if (rootManifest.version !== expectedVersion) {
  mismatches.push(`root package: expected ${expectedVersion}, found ${rootManifest.version}`);
}

for (const entry of readdirSync(packageDirectory, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const manifestPath = path.join(packageDirectory, entry.name, "package.json");
  if (!existsSync(manifestPath)) continue;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.private === true) continue;

  if (manifest.version !== expectedVersion) {
    mismatches.push(`${manifest.name}: expected ${expectedVersion}, found ${manifest.version}`);
  }
}

if (mismatches.length > 0) {
  console.error(
    `[ERROR] Release tag ${tag} does not match public package versions:\n${mismatches.join("\n")}`,
  );
  process.exit(1);
}

console.log(`[OK] Release tag ${tag} matches all public package versions.`);
