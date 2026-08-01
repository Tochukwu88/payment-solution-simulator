import { type Response } from "express";

import { HttpStatus, ResponseMessage } from "../constants/responseMessages";
import {
  normalizeToHttpException,
  toClientSafeException,
} from "./normalizeError";
import type {
  HttpErrorResponse,
  HttpSuccessResponse,
  PaginationMeta,
} from "./interfaces";

interface SuccessResponseOptions<T> {
  statusCode?: HttpStatus;
  message?: string;
  data?: T;
  meta?: PaginationMeta;
}

function buildSuccessBody<T>(
  statusCode: HttpStatus,
  options: SuccessResponseOptions<T>,
): HttpSuccessResponse<T> {
  const body: HttpSuccessResponse<T> = {
    success: true,
    statusCode,
    message: options.message ?? ResponseMessage.SUCCESS,
  };

  if (options.data !== undefined) {
    body.data = options.data;
  }

  if (options.meta !== undefined) {
    body.meta = options.meta;
  }

  return body;
}

export function sendSuccess<T>(
  res: Response,
  options: SuccessResponseOptions<T> = {},
): Response {
  const statusCode = options.statusCode ?? HttpStatus.OK;

  return res.status(statusCode).json(buildSuccessBody(statusCode, options));
}

export function sendCreated<T>(
  res: Response,
  options: SuccessResponseOptions<T> = {},
): Response {
  return sendSuccess(res, {
    ...options,
    statusCode: HttpStatus.CREATED,
    message: options.message ?? ResponseMessage.CREATED,
  });
}

export function sendNoContent(res: Response): Response {
  return res.status(HttpStatus.NO_CONTENT).send();
}

export function sendError(res: Response, error: unknown): Response {
  const body = buildErrorBody(error);

  return res.status(body.statusCode).json(body);
}

export function buildErrorBody(error: unknown): HttpErrorResponse {
  return toClientSafeException(normalizeToHttpException(error)).toResponse();
}
