import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import winston, { type Logger as WinstonLogger } from "winston";

import { env } from "../../config/env";
import type { LogContext, LoggerDriver, LogLevel } from "../interfaces";

function isProduction(): boolean {
  return env.NODE_ENV === "production";
}

function ensureLogDirectory(): string {
  if (!existsSync(env.LOG_DIRECTORY)) {
    mkdirSync(env.LOG_DIRECTORY, { recursive: true });
  }

  return env.LOG_DIRECTORY;
}

function buildTerminalFormat(): winston.Logform.Format {
  return winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message, ...context }) => {
      const hasContext = Object.keys(context).length > 0;
      const serializedContext = hasContext ? ` ${JSON.stringify(context)}` : "";

      return `${timestamp} ${level}: ${message}${serializedContext}`;
    }),
  );
}

function buildFileFormat(): winston.Logform.Format {
  return winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  );
}

function buildTerminalTransports(): winston.transport[] {
  return [new winston.transports.Console({ format: buildTerminalFormat() })];
}

function buildFileTransports(): winston.transport[] {
  const directory = ensureLogDirectory();

  return [
    new winston.transports.File({
      filename: join(directory, "error.log"),
      level: "error",
      format: buildFileFormat(),
    }),
    new winston.transports.File({
      filename: join(directory, "combined.log"),
      format: buildFileFormat(),
    }),
  ];
}

function buildTransports(): winston.transport[] {
  return isProduction() ? buildFileTransports() : buildTerminalTransports();
}

function createWinstonLogger(): WinstonLogger {
  return winston.createLogger({
    level: env.LOG_LEVEL,
    transports: buildTransports(),
  });
}

export class WinstonLoggerDriver implements LoggerDriver {
  private readonly winstonLogger: WinstonLogger = createWinstonLogger();

  log(level: LogLevel, message: string, context?: LogContext): void {
    this.winstonLogger.log(level, message, context);
  }
}
