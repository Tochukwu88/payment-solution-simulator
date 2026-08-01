import { HttpStatus } from "../constants/responseMessages";
import {
  createTransactionSchema,
  updateTransactionSchema,
} from "../dtos";
import { TransactionStatus } from "../constants/transactionStatus";
import { z } from "./apiRegistry";
import { registerApiRoute } from "./registerApiRoute";

const PAYMENTS_TAG = "Payments";

const transactionSchema = z
  .object({
    id: z.string(),
    reference: z.string(),
    type: z.string(),
    amount: z.number(),
    status: z.enum(TransactionStatus),
    description: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .openapi("Transaction");

const transactionIdParam = z.object({
  id: z.string().openapi({ description: "Transaction id" }),
});

registerApiRoute({
  method: "get",
  path: "/",
  summary: "Health check",
  tags: ["General"],
  successDescription: "Server is up and running",
  errorStatuses: [
    HttpStatus.TOO_MANY_REQUESTS,
    HttpStatus.INTERNAL_SERVER_ERROR,
  ],
});

registerApiRoute({
  method: "post",
  path: "/payments",
  summary: "Create a payment",
  tags: [PAYMENTS_TAG],
  request: {
    body: {
      content: {
        "application/json": { schema: createTransactionSchema },
      },
    },
  },
  dataSchema: transactionSchema,
  successStatus: HttpStatus.CREATED,
  successDescription: "Payment created, or the existing payment for this reference",
  errorStatuses: [
    HttpStatus.UNPROCESSABLE_ENTITY,
    HttpStatus.CONFLICT,
    HttpStatus.INTERNAL_SERVER_ERROR,
  ],
});

registerApiRoute({
  method: "get",
  path: "/payments/{id}",
  summary: "Retrieve a payment",
  tags: [PAYMENTS_TAG],
  request: { params: transactionIdParam },
  dataSchema: transactionSchema,
  successDescription: "Payment retrieved",
  errorStatuses: [
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.INTERNAL_SERVER_ERROR,
  ],
});

registerApiRoute({
  method: "patch",
  path: "/payments/{id}",
  summary: "Update a payment status",
  tags: [PAYMENTS_TAG],
  request: {
    params: transactionIdParam,
    body: {
      content: {
        "application/json": { schema: updateTransactionSchema },
      },
    },
  },
  dataSchema: transactionSchema,
  successDescription: "Payment status updated",
  errorStatuses: [
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
    HttpStatus.UNPROCESSABLE_ENTITY,
    HttpStatus.INTERNAL_SERVER_ERROR,
  ],
});
