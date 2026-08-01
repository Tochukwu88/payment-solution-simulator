import { isHttpException } from "../../exceptions";
import type { LogContext, LoggerDriver } from "../interfaces";

function describeError(error: unknown): LogContext {
  if (error === undefined || error === null) {
    return {};
  }

  if (!(error instanceof Error)) {
    return { errorMessage: String(error) };
  }

  const description: LogContext = {
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack,
  };

  if (isHttpException(error)) {
    description.statusCode = error.statusCode;
    description.isOperational = error.isOperational;
  }

  return description;
}

export class AppLogger {
  constructor(
    private readonly driver: LoggerDriver,
    private readonly scope?: string,
  ) {}

  forScope(scope: string): AppLogger {
    return new AppLogger(this.driver, scope);
  }

  debug(message: string, context?: LogContext): void {
    this.driver.log("debug", message, this.withScope(context));
  }

  info(message: string, context?: LogContext): void {
    this.driver.log("info", message, this.withScope(context));
  }

  warn(message: string, context?: LogContext): void {
    this.driver.log("warn", message, this.withScope(context));
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    this.driver.log("error", message, {
      ...this.withScope(context),
      ...describeError(error),
    });
  }

  private withScope(context?: LogContext): LogContext {
    if (this.scope === undefined) {
      return { ...context };
    }

    return { scope: this.scope, ...context };
  }
}
