import { ZodError } from "zod";

import { HttpStatus, ResponseMessage } from "../constants/responseMessages";
import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
  PayloadTooLargeException,
  ValidationException,
  isHttpException,
} from "../exceptions";

function toValidationIssues(error: ZodError): unknown {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

function isMalformedJsonError(error: unknown): boolean {
  return error instanceof SyntaxError && "body" in error;
}

function isPayloadTooLargeError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "type" in error &&
    error.type === "entity.too.large"
  );
}

export function normalizeToHttpException(error: unknown): HttpException {
  if (isHttpException(error)) {
    return error;
  }

  if (error instanceof ZodError) {
    return new ValidationException(
      ResponseMessage.VALIDATION_FAILED,
      toValidationIssues(error),
    );
  }

  if (isPayloadTooLargeError(error)) {
    return new PayloadTooLargeException();
  }

  if (isMalformedJsonError(error)) {
    return new BadRequestException(ResponseMessage.MALFORMED_JSON);
  }

  return new InternalServerErrorException();
}

export function toClientSafeException(exception: HttpException): HttpException {
  if (exception.isClientError()) {
    return exception;
  }

  return new HttpException(
    exception.statusCode,
    ResponseMessage.INTERNAL_SERVER_ERROR,
  );
}

export function isServerErrorStatus(statusCode: HttpStatus): boolean {
  return statusCode >= HttpStatus.INTERNAL_SERVER_ERROR;
}
