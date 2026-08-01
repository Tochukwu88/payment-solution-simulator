import { HttpStatus, ResponseMessage } from "../constants/responseMessages";
import { HttpException } from "./baseHttpException";

export class BadRequestException extends HttpException {
  constructor(message: string = ResponseMessage.BAD_REQUEST, details?: unknown) {
    super(HttpStatus.BAD_REQUEST, message, details);
  }
}

export class UnauthorizedException extends HttpException {
  constructor(
    message: string = ResponseMessage.UNAUTHORIZED,
    details?: unknown,
  ) {
    super(HttpStatus.UNAUTHORIZED, message, details);
  }
}

export class PaymentRequiredException extends HttpException {
  constructor(
    message: string = ResponseMessage.PAYMENT_REQUIRED,
    details?: unknown,
  ) {
    super(HttpStatus.PAYMENT_REQUIRED, message, details);
  }
}

export class ForbiddenException extends HttpException {
  constructor(message: string = ResponseMessage.FORBIDDEN, details?: unknown) {
    super(HttpStatus.FORBIDDEN, message, details);
  }
}

export class NotFoundException extends HttpException {
  constructor(message: string = ResponseMessage.NOT_FOUND, details?: unknown) {
    super(HttpStatus.NOT_FOUND, message, details);
  }
}

export class MethodNotAllowedException extends HttpException {
  constructor(
    message: string = ResponseMessage.METHOD_NOT_ALLOWED,
    details?: unknown,
  ) {
    super(HttpStatus.METHOD_NOT_ALLOWED, message, details);
  }
}

export class RequestTimeoutException extends HttpException {
  constructor(
    message: string = ResponseMessage.REQUEST_TIMEOUT,
    details?: unknown,
  ) {
    super(HttpStatus.REQUEST_TIMEOUT, message, details);
  }
}

export class ConflictException extends HttpException {
  constructor(message: string = ResponseMessage.CONFLICT, details?: unknown) {
    super(HttpStatus.CONFLICT, message, details);
  }
}

export class GoneException extends HttpException {
  constructor(message: string = ResponseMessage.GONE, details?: unknown) {
    super(HttpStatus.GONE, message, details);
  }
}

export class PayloadTooLargeException extends HttpException {
  constructor(
    message: string = ResponseMessage.PAYLOAD_TOO_LARGE,
    details?: unknown,
  ) {
    super(HttpStatus.PAYLOAD_TOO_LARGE, message, details);
  }
}

export class UnsupportedMediaTypeException extends HttpException {
  constructor(
    message: string = ResponseMessage.UNSUPPORTED_MEDIA_TYPE,
    details?: unknown,
  ) {
    super(HttpStatus.UNSUPPORTED_MEDIA_TYPE, message, details);
  }
}

export class ValidationException extends HttpException {
  constructor(
    message: string = ResponseMessage.VALIDATION_FAILED,
    details?: unknown,
  ) {
    super(HttpStatus.UNPROCESSABLE_ENTITY, message, details);
  }
}

export class TooManyRequestsException extends HttpException {
  constructor(
    message: string = ResponseMessage.TOO_MANY_REQUESTS,
    details?: unknown,
  ) {
    super(HttpStatus.TOO_MANY_REQUESTS, message, details);
  }
}

export class InternalServerErrorException extends HttpException {
  constructor(
    message: string = ResponseMessage.INTERNAL_SERVER_ERROR,
    details?: unknown,
  ) {
    super(HttpStatus.INTERNAL_SERVER_ERROR, message, details);
  }
}

export class NotImplementedException extends HttpException {
  constructor(
    message: string = ResponseMessage.NOT_IMPLEMENTED,
    details?: unknown,
  ) {
    super(HttpStatus.NOT_IMPLEMENTED, message, details);
  }
}

export class BadGatewayException extends HttpException {
  constructor(message: string = ResponseMessage.BAD_GATEWAY, details?: unknown) {
    super(HttpStatus.BAD_GATEWAY, message, details);
  }
}

export class ServiceUnavailableException extends HttpException {
  constructor(
    message: string = ResponseMessage.SERVICE_UNAVAILABLE,
    details?: unknown,
  ) {
    super(HttpStatus.SERVICE_UNAVAILABLE, message, details);
  }
}

export class GatewayTimeoutException extends HttpException {
  constructor(
    message: string = ResponseMessage.GATEWAY_TIMEOUT,
    details?: unknown,
  ) {
    super(HttpStatus.GATEWAY_TIMEOUT, message, details);
  }
}
