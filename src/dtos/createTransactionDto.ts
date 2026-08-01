import { z } from "zod";

import { optionalString, requiredNumber, requiredString } from "./fieldSchemas";

const MAX_REFERENCE_LENGTH = 64;
const MAX_TYPE_LENGTH = 32;
const MAX_DESCRIPTION_LENGTH = 255;
const MAX_AMOUNT = 100_000_000;

export const createTransactionSchema = z.object({
  reference: requiredString("reference")
    .trim()
    .min(1, "reference cannot be empty")
    .max(
      MAX_REFERENCE_LENGTH,
      `reference must be at most ${MAX_REFERENCE_LENGTH} characters`,
    ),

  type: requiredString("type")
    .trim()
    .min(1, "type cannot be empty")
    .max(MAX_TYPE_LENGTH, `type must be at most ${MAX_TYPE_LENGTH} characters`),

  amount: requiredNumber("amount")
    .positive("amount must be greater than zero")
    .max(MAX_AMOUNT, `amount must not exceed ${MAX_AMOUNT}`),

  description: optionalString("description")
    .trim()
    .max(
      MAX_DESCRIPTION_LENGTH,
      `description must be at most ${MAX_DESCRIPTION_LENGTH} characters`,
    )
    .optional(),

  metadata: z
    .record(z.string(), z.unknown(), "metadata must be an object")
    .optional(),
});

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
