import { HttpErrorResponse } from "../common/interfaces";
import { HttpStatus } from "../constants/responseMessages";

export class HttpException extends Error {
  readonly statusCode: HttpStatus;
  readonly details?: unknown;
  readonly isOperational: boolean = true;

  constructor(statusCode: HttpStatus, message: string, details?: unknown) {
    super(message);

    this.name = new.target.name;
    this.statusCode = statusCode;
    this.details = details;

    Error.captureStackTrace(this, new.target);
  }

  hasDetails(): boolean {
    return this.details !== undefined;
  }

  isClientError(): boolean {
    return this.statusCode < HttpStatus.INTERNAL_SERVER_ERROR;
  }

  toResponse(): HttpErrorResponse {
    const response: HttpErrorResponse = {
      success: false,
      statusCode: this.statusCode,
      message: this.message,
    };

    if (this.hasDetails()) {
      response.details = this.details;
    }

    return response;
  }
}

export function isHttpException(error: unknown): error is HttpException {
  return error instanceof HttpException;
}
