import type {
  LogContext,
  LoggerDriver,
  LogLevel,
} from "../../src/common/interfaces";
import { AppLogger } from "../../src/common/logger/appLogger";

export interface RecordedLog {
  level: LogLevel;
  message: string;
  context?: LogContext;
}

export class RecordingLoggerDriver implements LoggerDriver {
  readonly records: RecordedLog[] = [];

  log(level: LogLevel, message: string, context?: LogContext): void {
    this.records.push({ level, message, context });
  }

  messagesAt(level: LogLevel): string[] {
    return this.records
      .filter((record) => record.level === level)
      .map((record) => record.message);
  }
}

export function buildRecordingLogger(): {
  driver: RecordingLoggerDriver;
  logger: AppLogger;
} {
  const driver = new RecordingLoggerDriver();

  return { driver, logger: new AppLogger(driver) };
}
