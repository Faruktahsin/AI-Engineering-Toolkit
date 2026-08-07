import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { AIETError } from "@aiet/errors";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConfigLoader, parseEnvVariables } from "../src/index";

interface AppConfig extends Record<string, unknown> {
  port: number;
  host: string;
  debug: boolean;
}

describe("@aiet/config Package Unit Tests", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aiet-config-test-"));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("should parse environment variables with prefix or key mapping", () => {
    const env = {
      AIET_APP_PORT: "8080",
      AIET_APP_DEBUG: "true",
      CUSTOM_HOST: "localhost",
    };

    const parsed = parseEnvVariables<AppConfig>(env, "AIET_APP", {
      CUSTOM_HOST: "host",
    });

    expect(parsed.port).toBe(8080);
    expect(parsed.debug).toBe(true);
    expect(parsed.host).toBe("localhost");
  });

  it("should merge defaults, JSON file, and environment variables into immutable config", () => {
    const jsonPath = path.join(tmpDir, "app.config.json");
    fs.writeFileSync(jsonPath, JSON.stringify({ port: 9000, host: "127.0.0.1" }), "utf8");

    const loader = new ConfigLoader<AppConfig>({
      defaults: { port: 3000, host: "0.0.0.0", debug: false },
      jsonPath,
      envMap: { APP_PORT: "port" },
      validator: (raw) => {
        const obj = raw as AppConfig;
        if (obj.port < 1024) throw new Error("Port must be >= 1024");
        return obj;
      },
    });

    const result = loader.load({ APP_PORT: "9090" });

    expect(result.config.port).toBe(9090); // Env override
    expect(result.config.host).toBe("127.0.0.1"); // JSON override
    expect(result.config.debug).toBe(false); // Default
    expect(Object.isFrozen(result.config)).toBe(true); // Immutable
  });

  it("should throw AIETError on runtime validation failure", () => {
    const loader = new ConfigLoader<AppConfig>({
      defaults: { port: 80, host: "0.0.0.0", debug: false },
      validator: (raw) => {
        const obj = raw as AppConfig;
        if (obj.port < 1024) throw new Error("Port must be >= 1024");
        return obj;
      },
    });

    expect(() => loader.load({})).toThrow(AIETError);
  });
});
