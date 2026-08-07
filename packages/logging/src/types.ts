export enum LogLevel {
  TRACE = 10,
  DEBUG = 20,
  INFO = 30,
  WARN = 40,
  ERROR = 50,
  FATAL = 60,
  OFF = 100,
}

export type LogLevelName = "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "off";

export interface LogRecord {
  readonly timestamp: string; // ISO 8601 UTC
  readonly level: LogLevelName;
  readonly level_value: LogLevel;
  readonly message: string;
  readonly context: Record<string, unknown>;
}

export type LogFormatter = (record: LogRecord) => string;

export type LogDestination = (formattedMessage: string, record: LogRecord) => void;

export interface LoggerOptions {
  readonly name?: string;
  readonly level?: LogLevel | LogLevelName;
  readonly formatter?: "json" | "human" | LogFormatter;
  readonly destination?: LogDestination;
  readonly context?: Record<string, unknown>;
  readonly includeTimestamp?: boolean; // Default: true (can be disabled for deterministic tests)
}
