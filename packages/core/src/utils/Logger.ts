export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}

export class Logger {
  private static level: LogLevel = LogLevel.INFO;
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = `[${prefix}]`;
  }

  static setLevel(level: LogLevel): void {
    Logger.level = level;
  }

  debug(...args: unknown[]): void {
    if (Logger.level >= LogLevel.DEBUG) {
      console.debug(this.prefix, ...args);
    }
  }

  info(...args: unknown[]): void {
    if (Logger.level >= LogLevel.INFO) {
      console.info(this.prefix, ...args);
    }
  }

  warn(...args: unknown[]): void {
    if (Logger.level >= LogLevel.WARN) {
      console.warn(this.prefix, ...args);
    }
  }

  error(...args: unknown[]): void {
    if (Logger.level >= LogLevel.ERROR) {
      console.error(this.prefix, ...args);
    }
  }
}
