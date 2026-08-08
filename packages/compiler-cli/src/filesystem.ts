import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { EmitterResult } from "@aiet/compiler";
import type { AnyPrimitive } from "@aiet/schema";

export function loadInputPrimitives(inputPath: string): AnyPrimitive[] {
  const resolvedPath = path.resolve(inputPath);
  const stats = statSync(resolvedPath);

  if (stats.isDirectory()) {
    const primitives: AnyPrimitive[] = [];
    const files = getJsonFilesRecursive(resolvedPath).sort();

    for (const filePath of files) {
      const raw = readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        primitives.push(...(parsed as AnyPrimitive[]));
      } else {
        primitives.push(parsed as AnyPrimitive);
      }
    }

    return primitives;
  }

  const raw = readFileSync(resolvedPath, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? (parsed as AnyPrimitive[]) : [parsed as AnyPrimitive];
}

export function writeArtifactsAtomic(
  outputDirectory: string,
  artifacts: Record<string, EmitterResult>,
): string[] {
  const resolvedDirectory = path.resolve(outputDirectory);
  mkdirSync(resolvedDirectory, { recursive: true });

  const writtenFiles: string[] = [];
  for (const artifact of Object.values(artifacts)) {
    const artifactPath = path.join(resolvedDirectory, artifact.target);
    writeFileSync(artifactPath, artifact.content, "utf8");
    writtenFiles.push(artifactPath);
  }

  return writtenFiles;
}

function getJsonFilesRecursive(dirPath: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      results.push(...getJsonFilesRecursive(fullPath));
    } else if (stats.isFile() && entry.endsWith(".json")) {
      results.push(fullPath);
    }
  }

  return results;
}
