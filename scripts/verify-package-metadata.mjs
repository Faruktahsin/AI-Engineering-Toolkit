import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDirectory = path.join(repositoryRoot, "packages");
const expected = {
  license: "Apache-2.0",
  author: "Faruk Tahsin <faruktahsin@gmail.com>",
  homepage: "https://github.com/Faruktahsin/AI-Engineering-Toolkit#readme",
  repository: "git+https://github.com/Faruktahsin/AI-Engineering-Toolkit.git",
  bugs: "https://github.com/Faruktahsin/AI-Engineering-Toolkit/issues",
};
const failures = [];

for (const entry of readdirSync(packageDirectory, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const manifestPath = path.join(packageDirectory, entry.name, "package.json");
  if (!existsSync(manifestPath)) continue;

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.private === true) continue;

  const prefix = manifest.name ?? entry.name;
  if (manifest.license !== expected.license) {
    failures.push(`${prefix}: license must be ${expected.license}`);
  }
  if (manifest.author !== expected.author) {
    failures.push(`${prefix}: author metadata is missing or incorrect`);
  }
  if (manifest.homepage !== expected.homepage) {
    failures.push(`${prefix}: homepage metadata is missing or incorrect`);
  }
  if (manifest.repository?.type !== "git" || manifest.repository?.url !== expected.repository) {
    failures.push(`${prefix}: repository metadata is missing or incorrect`);
  }
  if (manifest.bugs?.url !== expected.bugs) {
    failures.push(`${prefix}: bugs metadata is missing or incorrect`);
  }
}

if (failures.length > 0) {
  console.error(`[ERROR] Package metadata validation failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("[OK] All public package manifests contain required npm metadata.");
