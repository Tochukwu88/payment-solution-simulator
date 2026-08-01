import { z } from "zod";

import { TransactionStatus } from "../constants/transactionStatus";

const ALLOWED_STATUSES = Object.values(TransactionStatus).join(", ");

export const updateTransactionSchema = z.object({
  status: z.enum(TransactionStatus, {
    error: (issue) =>
      issue.input === undefined
        ? "status is required"
        : `status must be one of: ${ALLOWED_STATUSES}`,
  }),
});

export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>;
