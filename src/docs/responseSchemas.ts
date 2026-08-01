import type { ZodType } from "zod";

import { z } from "./apiRegistry";

export const paginationMetaSchema = z
  .object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  })
  .openapi("PaginationMeta");

export const errorResponseSchema = z
  .object({
    success: z.literal(false),
    statusCode: z.number(),
    message: z.string(),
    details: z.unknown().optional(),
  })
  .openapi("ErrorResponse");

export function buildSuccessResponseSchema(dataSchema?: ZodType): ZodType {
  return z.object({
    success: z.literal(true),
    statusCode: z.number(),
    message: z.string(),
    data: dataSchema === undefined ? z.unknown().optional() : dataSchema.optional(),
    meta: paginationMetaSchema.optional(),
  });
}
