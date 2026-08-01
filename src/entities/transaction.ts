import {
  TransactionMetadata,
  TransactionProperties,
} from "../common/interfaces";
import {
  TERMINAL_TRANSACTION_STATUSES,
  TransactionStatus,
} from "../constants/transactionStatus";

export class Transaction {
  id: string;
  reference: string;
  type: string;
  amount: number;
  idempotencyHash: string;
  createdAt: Date;

  status: TransactionStatus;
  description?: string;
  metadata: TransactionMetadata;
  updatedAt: Date;

  constructor(properties: TransactionProperties) {
    const now = new Date();

    this.id = properties.id;
    this.reference = properties.reference;
    this.type = properties.type;
    this.amount = properties.amount;
    this.idempotencyHash = properties.idempotencyHash;
    this.status = properties.status ?? TransactionStatus.PENDING;
    this.description = properties.description;
    this.metadata = properties.metadata ?? {};
    this.createdAt = properties.createdAt ?? now;
    this.updatedAt = properties.updatedAt ?? now;
  }

  isPending(): boolean {
    return this.status === TransactionStatus.PENDING;
  }

  isCompleted(): boolean {
    return this.status === TransactionStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === TransactionStatus.FAILED;
  }

  isSettled(): boolean {
    return TERMINAL_TRANSACTION_STATUSES.includes(this.status);
  }
}
