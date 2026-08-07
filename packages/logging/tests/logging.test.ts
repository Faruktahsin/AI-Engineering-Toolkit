import { describe, expect, it } from "vitest";
import { LogLevel, type LogRecord, Logger } from "../src/index";

describe("@aiet/logging Package Unit Tests", () => {
  it("should format logs as JSON deterministically", () => {
    const logs: string[] = [];
    const logger = new Logger({
      name: "test-logger",
      level: LogLevel.DEBUG,
      formatter: "json",
      includeTimestamp: false,
      destination: (formatted) => logs.push(formatted),
    });

    logger.info("Server started", { port: 8080 });

    expect(logs).toHaveLength(1);
    const logItem = logs[0];
    expect(logItem).toBeDefined();
    const parsed = JSON.parse(logItem ?? "{}");
    expect(parsed).toEqual({
      timestamp: "",
      level: "info",
      message: "Server started",
      name: "test-logger",
      port: 8080,
    });
  });

  it("should format logs in human-readable format", () => {
    const logs: string[] = [];
    const logger = new Logger({
      name: "test-logger",
      level: LogLevel.INFO,
      formatter: "human",
      includeTimestamp: false,
      destination: (formatted) => logs.push(formatted),
    });

    logger.warn("Low memory warning", { availableMb: 128 });

    expect(logs[0]).toBe('WARN  Low memory warning {"availableMb":128,"name":"test-logger"}');
  });

  it("should respect log level filtering and OFF mode", () => {
    const records: LogRecord[] = [];
    const logger = new Logger({
      level: "warn",
      includeTimestamp: false,
      destination: (_, record) => records.push(record),
    });

    logger.debug("Debug msg"); // Filtered out
    logger.info("Info msg"); // Filtered out
    logger.warn("Warn msg"); // Passed
    logger.error("Error msg"); // Passed

    expect(records).toHaveLength(2);
    expect(records[0]?.message).toBe("Warn msg");
    expect(records[1]?.message).toBe("Error msg");

    logger.setLevel("off");
    logger.fatal("Fatal msg"); // Filtered out in OFF mode
    expect(records).toHaveLength(2);
  });

  it("should create child loggers inheriting parent level, format, and context", () => {
    const records: LogRecord[] = [];
    const parentLogger = new Logger({
      name: "parent",
      level: LogLevel.INFO,
      includeTimestamp: false,
      context: { service: "auth" },
      destination: (_, record) => records.push(record),
    });

    const childLogger = parentLogger.child({ component: "mfa" }, "child-auth");

    childLogger.info("MFA code requested", { userId: "usr_123" });

    expect(records).toHaveLength(1);
    expect(records[0]?.context).toEqual({
      name: "child-auth",
      service: "auth",
      component: "mfa",
      userId: "usr_123",
    });
  });
});
