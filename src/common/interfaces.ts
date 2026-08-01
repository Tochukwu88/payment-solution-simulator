import { HttpStatus } from "../constants/responseMessages";

export interface HttpErrorResponse {
  success: false;
  statusCode: HttpStatus;
  message: string;
  details?: unknown;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface HttpSuccessResponse<T = unknown> {
  success: true;
  statusCode: HttpStatus;
  message: string;
  data?: T;
  meta?: PaginationMeta;
}

export type HttpResponseBody<T = unknown> =
  | HttpSuccessResponse<T>
  | HttpErrorResponse;

export type LogLevel = "error" | "warn" | "info" | "debug";

export type LogContext = Record<string, unknown>;

export interface LoggerDriver {
  log(level: LogLevel, message: string, context?: LogContext): void;
}
