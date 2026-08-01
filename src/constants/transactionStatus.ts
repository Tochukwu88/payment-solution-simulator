export enum TransactionStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  REVERSED = "reversed",
}

export const TERMINAL_TRANSACTION_STATUSES: TransactionStatus[] = [
  TransactionStatus.COMPLETED,
  TransactionStatus.FAILED,
  TransactionStatus.REVERSED,
];
