import { humanLogFormatter, jsonLogFormatter } from "./formatters";
import { LogLevel, type LogLevelName, type LogRecord, type LoggerOptions } from "./types";

const LEVEL_NAME_MAP: Record<LogLevelName, LogLevel> = {
  trace: LogLevel.TRACE,
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
  fatal: LogLevel.FATAL,
  off: LogLevel.OFF,
};

const NAME_LEVEL_MAP: Record<LogLevel, LogLevelName> = {
  [LogLevel.TRACE]: "trace",
  [LogLevel.DEBUG]: "debug",
  [LogLevel.INFO]: "info",
  [LogLevel.WARN]: "warn",
  [LogLevel.ERROR]: "error",
  [LogLevel.FATAL]: "fatal",
  [LogLevel.OFF]: "off",
};

export class Logger {
  public readonly name: string;
  private levelValue: LogLevel;
  private readonly formatter: (record: LogRecord) => string;
  private readonly destination: (formatted: string, record: LogRecord) => void;
  private readonly context: Record<string, unknown>;
  private readonly includeTimestamp: boolean;

  constructor(options?: LoggerOptions) {
    this.name = options?.name ?? "aiet";
    this.levelValue = this.parseLogLevel(options?.level ?? LogLevel.INFO);
    this.context = { ...(options?.context ?? {}) };
    this.includeTimestamp = options?.includeTimestamp ?? true;

    if (typeof options?.formatter === "function") {
      this.formatter = options.formatter;
    } else if (options?.formatter === "human") {
      this.formatter = humanLogFormatter;
    } else {
      this.formatter = jsonLogFormatter;
    }

    this.destination =
      options?.destination ??
      ((formatted) => {
        console.log(formatted);
      });
  }

  private parseLogLevel(level: LogLevel | LogLevelName): LogLevel {
    if (typeof level === "number") {
      return level;
    }
    return LEVEL_NAME_MAP[level.toLowerCase() as LogLevelName] ?? LogLevel.INFO;
  }

  public getLevel(): LogLevelName {
    return NAME_LEVEL_MAP[this.levelValue] ?? "info";
  }

  public setLevel(level: LogLevel | LogLevelName): void {
    this.levelValue = this.parseLogLevel(level);
  }

  public isLevelEnabled(level: LogLevel | LogLevelName): boolean {
    const numericLevel = this.parseLogLevel(level);
    return numericLevel >= this.levelValue && this.levelValue !== LogLevel.OFF;
  }

  /**
   * Creates a child logger inheriting context and options from parent.
   */
  public child(childContext: Record<string, unknown>, childName?: string): Logger {
    return new Logger({
      name: childName ?? this.name,
      level: this.levelValue,
      formatter: this.formatter,
      destination: this.destination,
      context: { ...this.context, ...childContext },
      includeTimestamp: this.includeTimestamp,
    });
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!this.isLevelEnabled(level)) {
      return;
    }

    const levelName = NAME_LEVEL_MAP[level] ?? "info";
    const timestamp = this.includeTimestamp
      ? new Date().toISOString().replace(/\.\d{3}Z$/, "Z")
      : "";

    const combinedContext = {
      name: this.name,
      ...this.context,
      ...(meta ?? {}),
    };

    const record: LogRecord = {
      timestamp,
      level: levelName,
      level_value: level,
      message,
      context: combinedContext,
    };

    const formatted = this.formatter(record);
    this.destination(formatted, record);
  }

  public trace(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.TRACE, message, meta);
  }

  public debug(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  public info(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, meta);
  }

  public warn(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, meta);
  }

  public error(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, meta);
  }

  public fatal(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, message, meta);
  }
}
