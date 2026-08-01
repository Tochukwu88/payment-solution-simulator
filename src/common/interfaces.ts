import { OutboxEventStatus } from "../constants/outboxEventStatus";
import { OutboxEventType } from "../constants/outboxEventType";
import { HttpStatus } from "../constants/responseMessages";
import { TransactionStatus } from "../constants/transactionStatus";
import type { Transaction } from "../entities/transaction";

export interface HttpErrorResponse {
  success: false;
  statusCode: HttpStatus;
  message: string;
  details?: unknown;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface HttpSuccessResponse<T = unknown> {
  success: true;
  statusCode: HttpStatus;
  message: string;
  data?: T;
  meta?: PaginationMeta;
}

export type HttpResponseBody<T = unknown> =
  | HttpSuccessResponse<T>
  | HttpErrorResponse;

export type LogLevel = "error" | "warn" | "info" | "debug";

export type LogContext = Record<string, unknown>;

export interface LoggerDriver {
  log(level: LogLevel, message: string, context?: LogContext): void;
}
export type TransactionMetadata = Record<string, unknown>;

export interface TransactionProperties {
  id: string;
  reference: string;
  type: string;
  amount: number;
  status: TransactionStatus;
  description?: string;
  idempotencyHash: string;
  metadata?: TransactionMetadata;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TransactionResponse {
  id: string;
  reference: string;
  type: string;
  amount: number;
  status: TransactionStatus;
  description?: string;
  metadata: TransactionMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateTransactionInput = Omit<
  TransactionProperties,
  "id" | "createdAt" | "updatedAt"
>;

export type CreatePaymentInput = Omit<
  CreateTransactionInput,
  "status" | "idempotencyHash"
>;

export type OutboxPayload = Record<string, unknown>;

export interface OutboxEventProperties {
  id: string;
  transactionId: string;
  eventType: OutboxEventType;
  payload: OutboxPayload;
  status?: OutboxEventStatus;
  lastError?: string | null;
  processedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CreateOutboxEventInput = Omit<
  OutboxEventProperties,
  "id" | "status" | "lastError" | "processedAt" | "createdAt" | "updatedAt"
>;

export interface PaymentOutcome {
  successful: boolean;
  reason?: string;
}

export interface PaymentProvider {
  charge(transaction: Transaction): Promise<PaymentOutcome>;
}
