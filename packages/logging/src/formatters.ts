import type { LogRecord } from "./types";

/**
 * Formats a LogRecord as a deterministic JSON string.
 */
export function jsonLogFormatter(record: LogRecord): string {
  const payload: Record<string, unknown> = {
    timestamp: record.timestamp,
    level: record.level,
    message: record.message,
    ...record.context,
  };
  return JSON.stringify(payload);
}

/**
 * Formats a LogRecord into a human-readable text string.
 */
export function humanLogFormatter(record: LogRecord): string {
  const levelStr = record.level.toUpperCase().padEnd(5, " ");
  const timeStr = record.timestamp ? `[${record.timestamp}] ` : "";

  const contextKeys = Object.keys(record.context).sort();
  let ctxStr = "";

  if (contextKeys.length > 0) {
    const ctxObj: Record<string, unknown> = {};
    for (const key of contextKeys) {
      ctxObj[key] = record.context[key];
    }
    ctxStr = ` ${JSON.stringify(ctxObj)}`;
  }

  return `${timeStr}${levelStr} ${record.message}${ctxStr}`;
}
