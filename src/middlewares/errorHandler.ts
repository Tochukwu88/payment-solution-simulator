import { type NextFunction, type Request, type Response } from "express";

import { sendError } from "../common/httpResponse";
import { logger } from "../common/logger";
import {
  isServerErrorStatus,
  normalizeToHttpException,
} from "../common/normalizeError";
import type { LogContext } from "../common/interfaces";
import { ResponseMessage } from "../constants/responseMessages";
import { HttpException, NotFoundException } from "../exceptions";

const errorLogger = logger.forScope("ErrorHandler");

function describeRequest(req: Request): LogContext {
  return {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
  };
}

function buildLogContext(req: Request, exception: HttpException): LogContext {
  const context: LogContext = {
    ...describeRequest(req),
    statusCode: exception.statusCode,
  };

  if (exception.hasDetails()) {
    context.details = exception.details;
  }

  return context;
}

function logException(
  req: Request,
  exception: HttpException,
  originalError: unknown,
): void {
  const context = buildLogContext(req, exception);

  if (isServerErrorStatus(exception.statusCode)) {
    errorLogger.error("Unhandled request failure", originalError, context);
    return;
  }

  errorLogger.warn(exception.message, context);
}

export function routeNotFoundHandler(
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next(new NotFoundException(ResponseMessage.ROUTE_NOT_FOUND));
}

export function globalErrorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  const exception = normalizeToHttpException(error);

  logException(req, exception, error);

  sendError(res, exception);
}
