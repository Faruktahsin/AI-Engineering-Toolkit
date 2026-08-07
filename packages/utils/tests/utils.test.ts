import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  canonicalizeJson,
  chunkArray,
  deferredPromise,
  fromUtf8Bytes,
  groupBy,
  hasZeroWidth,
  hashCanonicalJson,
  joinPaths,
  md5,
  normalizePath,
  readJsonFile,
  removeDir,
  retryWithBackoff,
  sha256,
  sleep,
  stripZeroWidth,
  timeoutPromise,
  toUtf8Bytes,
  uniqueArray,
  writeJsonFileAtomic,
} from "../src/index";

describe("@aiet/utils Package Unit Tests", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aiet-utils-test-"));
  });

  afterEach(() => {
    removeDir(tmpDir);
  });

  describe("1. Hashing & Canonical JSON", () => {
    it("should compute exact sha256 and md5 hashes", () => {
      expect(sha256("hello")).toBe(
        "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
      );
      expect(md5("hello")).toBe("5d41402abc4b2a76b9719d911017c592");
    });

    it("should compute deterministic JCS canonical json and hash regardless of key order", () => {
      const obj1 = { b: 2, a: 1 };
      const obj2 = { a: 1, b: 2 };

      expect(canonicalizeJson(obj1)).toBe('{"a":1,"b":2}');
      expect(hashCanonicalJson(obj1)).toBe(hashCanonicalJson(obj2));
    });
  });

  describe("2. Filesystem & Path Utilities", () => {
    it("should normalize paths to forward slashes", () => {
      expect(normalizePath("foo\\bar\\baz")).toBe("foo/bar/baz");
      expect(joinPaths("foo", "bar", "baz")).toBe("foo/bar/baz");
    });

    it("should write JSON file atomically and read it back", () => {
      const filePath = path.join(tmpDir, "sub", "data.json");
      const data = { name: "AIET", version: "1.0.0" };

      writeJsonFileAtomic(filePath, data);
      expect(fs.existsSync(filePath)).toBe(true);

      const readBack = readJsonFile<typeof data>(filePath);
      expect(readBack).toEqual(data);
    });
  });

  describe("3. UTF-8 & Zero-Width Utilities", () => {
    it("should encode and decode UTF-8 bytes cleanly", () => {
      const text = "AI Engineering Toolkit 🚀";
      const bytes = toUtf8Bytes(text);
      expect(fromUtf8Bytes(bytes)).toBe(text);
    });

    it("should detect and strip zero-width characters", () => {
      const text = "Hello\u200BWorld\uFEFF";
      expect(hasZeroWidth(text)).toBe(true);
      expect(stripZeroWidth(text)).toBe("HelloWorld");
    });
  });

  describe("4. Async & Retry Utilities", () => {
    it("should sleep asynchronously", async () => {
      const start = Date.now();
      await sleep(50);
      expect(Date.now() - start).toBeGreaterThanOrEqual(45);
    });

    it("should reject on timeout or resolve before timeout", async () => {
      await expect(timeoutPromise(sleep(200), 50)).rejects.toThrow("Operation timed out");
      await expect(timeoutPromise(Promise.resolve("ok"), 50)).resolves.toBe("ok");
    });

    it("should resolve deferredPromise handles", async () => {
      const deferred = deferredPromise<string>();
      deferred.resolve("deferred_value");
      await expect(deferred.promise).resolves.toBe("deferred_value");
    });

    it("should retry function with backoff until success", async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("Temporary failure");
        }
        return "success";
      };

      const result = await retryWithBackoff(fn, { retries: 3, minTimeoutMs: 10 });
      expect(result).toBe("success");
      expect(attempts).toBe(3);
    });
  });

  describe("5. Collection Utilities", () => {
    it("should chunk array, filter unique items, and group items", () => {
      expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
      expect(uniqueArray([1, 1, 2, 3, 2, 3])).toEqual([1, 2, 3]);

      const items = [
        { category: "A", val: 1 },
        { category: "B", val: 2 },
        { category: "A", val: 3 },
      ];

      const grouped = groupBy(items, (i) => i.category);
      expect(grouped.A).toHaveLength(2);
      expect(grouped.B).toHaveLength(1);
    });
  });
});
