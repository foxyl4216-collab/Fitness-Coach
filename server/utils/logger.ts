type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

function formatEntry(entry: LogEntry): string {
  const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
  return `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.message}${ctx}`;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };

  const formatted = formatEntry(entry);

  if (level === "error") {
    console.error(formatted);
  } else if (level === "warn") {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => log("error", message, context),
  debug: (message: string, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") {
      log("debug", message, context);
    }
  },
};

export function logServerError(route: string, err: unknown, userId?: string): void {
  const error = err as { message?: string; stack?: string; code?: string };
  logger.error(`Route error: ${route}`, {
    message: error?.message || "Unknown error",
    code: error?.code,
    userId,
    stack: process.env.NODE_ENV !== "production" ? error?.stack?.split("\n")[0] : undefined,
  });
}

export function logAnalytics(event: string, userId?: string, meta?: Record<string, unknown>): void {
  logger.info(`[ANALYTICS] ${event}`, { userId, ...meta });
}
