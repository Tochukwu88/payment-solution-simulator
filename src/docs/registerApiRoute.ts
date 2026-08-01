import type {
  ResponseConfig,
  RouteConfig,
} from "@asteasolutions/zod-to-openapi";
import type { ZodType } from "zod";

import { HttpStatus, ResponseMessage } from "../constants/responseMessages";
import { apiRegistry } from "./apiRegistry";
import {
  buildSuccessResponseSchema,
  errorResponseSchema,
} from "./responseSchemas";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

interface ApiRouteDefinition {
  method: HttpMethod;
  path: string;
  summary: string;
  tags?: string[];
  request?: RouteConfig["request"];
  dataSchema?: ZodType;
  successStatus?: HttpStatus;
  successDescription?: string;
  errorStatuses?: HttpStatus[];
}

const DEFAULT_ERROR_STATUSES: HttpStatus[] = [
  HttpStatus.BAD_REQUEST,
  HttpStatus.INTERNAL_SERVER_ERROR,
];

const ERROR_DESCRIPTIONS: Partial<Record<HttpStatus, string>> = {
  [HttpStatus.BAD_REQUEST]: ResponseMessage.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ResponseMessage.UNAUTHORIZED,
  [HttpStatus.PAYMENT_REQUIRED]: ResponseMessage.PAYMENT_REQUIRED,
  [HttpStatus.FORBIDDEN]: ResponseMessage.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ResponseMessage.NOT_FOUND,
  [HttpStatus.CONFLICT]: ResponseMessage.CONFLICT,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ResponseMessage.PAYLOAD_TOO_LARGE,
  [HttpStatus.UNPROCESSABLE_ENTITY]: ResponseMessage.VALIDATION_FAILED,
  [HttpStatus.TOO_MANY_REQUESTS]: ResponseMessage.TOO_MANY_REQUESTS,
  [HttpStatus.INTERNAL_SERVER_ERROR]: ResponseMessage.INTERNAL_SERVER_ERROR,
};

function buildJsonContent(schema: ZodType): ResponseConfig["content"] {
  return { "application/json": { schema } };
}

function describeErrorStatus(status: HttpStatus): string {
  return ERROR_DESCRIPTIONS[status] ?? ResponseMessage.BAD_REQUEST;
}

function buildSuccessResponse(
  definition: ApiRouteDefinition,
): Record<number, ResponseConfig> {
  const status = definition.successStatus ?? HttpStatus.OK;

  return {
    [status]: {
      description: definition.successDescription ?? ResponseMessage.SUCCESS,
      content: buildJsonContent(
        buildSuccessResponseSchema(definition.dataSchema),
      ),
    },
  };
}

function buildErrorResponses(
  statuses: HttpStatus[],
): Record<number, ResponseConfig> {
  const responses: Record<number, ResponseConfig> = {};

  for (const status of statuses) {
    responses[status] = {
      description: describeErrorStatus(status),
      content: buildJsonContent(errorResponseSchema),
    };
  }

  return responses;
}

export function registerApiRoute(definition: ApiRouteDefinition): void {
  apiRegistry.registerPath({
    method: definition.method,
    path: definition.path,
    summary: definition.summary,
    tags: definition.tags ?? ["General"],
    request: definition.request,
    responses: {
      ...buildSuccessResponse(definition),
      ...buildErrorResponses(
        definition.errorStatuses ?? DEFAULT_ERROR_STATUSES,
      ),
    },
  });
}
