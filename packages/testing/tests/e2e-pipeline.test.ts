import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PAKBCLI } from "@aiet/cli";
import { describe, expect, it } from "vitest";
import { getMediumProjectFixture } from "../src/index";

describe("E2E Pipeline Integration Suite (ETB Task 5.2.3)", () => {
  it("should execute complete compiler pipeline from JSON input to verified filesystem artifacts", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-pipeline-test-"));
    const inputDir = path.join(tmpDir, "primitives");
    const outputDir = path.join(tmpDir, "dist");

    fs.mkdirSync(inputDir, { recursive: true });

    const mediumFixture = getMediumProjectFixture();
    for (let i = 0; i < mediumFixture.length; i++) {
      const filePath = path.join(inputDir, `prim_${i.toString().padStart(2, "0")}.json`);
      fs.writeFileSync(filePath, JSON.stringify(mediumFixture[i]), "utf8");
    }

    const cli = new PAKBCLI();

    // 1. Initial Compilation
    const build1 = await cli.compile({
      input: inputDir,
      output: outputDir,
      verbose: false,
    });

    expect(build1.exitCode).toBe(0);
    expect(build1.primitivesProcessed).toBe(mediumFixture.length);

    // Verify all 4 target files exist on disk
    expect(fs.existsSync(path.join(outputDir, "AGENTS.md"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "CLAUDE.md"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, ".cursorrules"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "manifest.json"))).toBe(true);

    const agents1 = fs.readFileSync(path.join(outputDir, "AGENTS.md"), "utf8");
    const manifest1 = fs.readFileSync(path.join(outputDir, "manifest.json"), "utf8");

    // 2. Rebuild on identical filesystem inputs
    const build2 = await cli.compile({
      input: inputDir,
      output: outputDir,
      verbose: false,
    });

    expect(build2.exitCode).toBe(0);

    const agents2 = fs.readFileSync(path.join(outputDir, "AGENTS.md"), "utf8");
    const manifest2 = fs.readFileSync(path.join(outputDir, "manifest.json"), "utf8");

    // 3. Verify Artifact Equality Verification across rebuilds
    expect(agents1).toBe(agents2);
    expect(manifest1).toBe(manifest2);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
