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

export const ALLOWED_STATUS_TRANSITIONS: Record<
  TransactionStatus,
  TransactionStatus[]
> = {
  [TransactionStatus.PENDING]: [
    TransactionStatus.PROCESSING,
    TransactionStatus.COMPLETED,
    TransactionStatus.FAILED,
  ],
  [TransactionStatus.PROCESSING]: [
    TransactionStatus.COMPLETED,
    TransactionStatus.FAILED,
  ],
  [TransactionStatus.COMPLETED]: [TransactionStatus.REVERSED],
  [TransactionStatus.FAILED]: [],
  [TransactionStatus.REVERSED]: [],
};

export function allowedNextStatuses(
  current: TransactionStatus,
): TransactionStatus[] {
  return ALLOWED_STATUS_TRANSITIONS[current];
}

export function isValidStatusTransition(
  current: TransactionStatus,
  next: TransactionStatus,
): boolean {
  return allowedNextStatuses(current).includes(next);
}
