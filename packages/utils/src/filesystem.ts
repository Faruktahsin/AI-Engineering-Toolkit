import fs from "node:fs";
import path from "node:path";

/**
 * Ensures directory exists synchronously.
 */
export function ensureDir(dirPath: string): void {
  const resolved = path.resolve(dirPath);
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
  }
}

/**
 * Reads and parses a JSON file synchronously.
 */
export function readJsonFile<T = unknown>(filePath: string): T {
  const resolved = path.resolve(filePath);
  const content = fs.readFileSync(resolved, "utf8");
  return JSON.parse(content) as T;
}

/**
 * Writes data as JSON atomically using a staging temporary file.
 */
export function writeJsonFileAtomic(filePath: string, data: unknown): void {
  const resolved = path.resolve(filePath);
  const parentDir = path.dirname(resolved);
  ensureDir(parentDir);

  const tmpPath = `${resolved}.tmp_${process.pid}_${Date.now()}`;
  const content = `${JSON.stringify(data, null, 2)}
`;

  try {
    fs.writeFileSync(tmpPath, content, "utf8");
    fs.renameSync(tmpPath, resolved);
  } catch (err) {
    if (fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // ignore cleanup error
      }
    }
    throw err;
  }
}

/**
 * Removes a directory synchronously if it exists.
 */
export function removeDir(dirPath: string): void {
  const resolved = path.resolve(dirPath);
  if (fs.existsSync(resolved)) {
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
