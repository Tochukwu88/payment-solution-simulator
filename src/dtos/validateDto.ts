import type { ZodType, z } from "zod";

import { toValidationIssues } from "../common/normalizeError";
import { ResponseMessage } from "../constants/responseMessages";
import { ValidationException } from "../exceptions";

export function validateDto<Schema extends ZodType>(
  schema: Schema,
  payload: unknown,
): z.infer<Schema> {
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw new ValidationException(
      ResponseMessage.VALIDATION_FAILED,
      toValidationIssues(result.error),
    );
  }

  return result.data;
}
