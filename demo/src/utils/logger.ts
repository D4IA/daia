type LogLevel = "debug" | "info" | "warn" | "error";

const levelToPrefix: Record<LogLevel, string> = {
  debug: "[DEBUG]",
  info: "[INFO]",
  warn: "[WARN]",
  error: "[ERROR]",
};

export class Logger {
  constructor(private readonly scope: string, private readonly minLevel: LogLevel = "debug") {}

  private shouldLog(level: LogLevel): boolean {
    const order: LogLevel[] = ["debug", "info", "warn", "error"];
    return order.indexOf(level) >= order.indexOf(this.minLevel);
  }

  private emit(level: LogLevel, message: string, meta?: unknown): void {
    if (!this.shouldLog(level)) return;
    const prefix = `${levelToPrefix[level]} ${this.scope}`;
    const line = meta === undefined ? message : `${message} ${JSON.stringify(meta)}`;
    // eslint-disable-next-line no-console
    console.log(`${prefix}: ${line}`);
  }

  debug(message: string, meta?: unknown): void { this.emit("debug", message, meta); }
  info(message: string, meta?: unknown): void { this.emit("info", message, meta); }
  warn(message: string, meta?: unknown): void { this.emit("warn", message, meta); }
  error(message: string, meta?: unknown): void { this.emit("error", message, meta); }
}

export const createLogger = (scope: string, minLevel: LogLevel = "debug"): Logger => new Logger(scope, minLevel);


