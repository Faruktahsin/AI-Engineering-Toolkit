import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PAKBConfigSchema, initializeProject, loadConfig, startWatchMode } from "../src";

const TEST_DIR = path.join(os.tmpdir(), "test-cli-init-fixture");

describe("CLI DX Features (Init, Watch, Zod Config)", () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("should initialize a new PAKB project structure with sample primitives and config", () => {
    const rootPath = initializeProject(TEST_DIR);

    expect(fs.existsSync(path.join(rootPath, "pakb.config.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootPath, "primitives/entities/system.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootPath, "primitives/directives/rules.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootPath, "primitives/assertions/facts.json"))).toBe(true);

    const loaded = loadConfig(path.join(rootPath, "pakb.config.json"));
    expect(loaded.input).toBe("./primitives");
    expect(loaded.budget).toBe(500);
  });

  it("should validate configuration using Zod schema", () => {
    const validConfig = {
      input: "./primitives",
      output: "./dist",
      budget: 1000,
      strict_mode: true,
    };
    const parsed = PAKBConfigSchema.parse(validConfig);
    expect(parsed.budget).toBe(1000);

    expect(() => PAKBConfigSchema.parse({ budget: -50 })).toThrow();
  });

  it("should initialize watch mode without crashing", () => {
    const rootPath = initializeProject(TEST_DIR);
    const config = loadConfig(path.join(rootPath, "pakb.config.json"));

    const watcher = startWatchMode(config, { input: config.input });
    expect(watcher).toBeDefined();
    watcher.close();
  });
});
