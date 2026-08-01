import { randomUUID } from "node:crypto";

import type {
  CreateTransactionInput,
  TransactionMetadata,
} from "../common/interfaces";
import type { TransactionStatus } from "../constants/transactionStatus";
import { Transaction } from "../entities/transaction";
import type { TransactionRepository } from "./transactionRepository";

function copyMetadata(metadata: TransactionMetadata): TransactionMetadata {
  return structuredClone(metadata);
}

function copyTransaction(transaction: Transaction): Transaction {
  return new Transaction({
    id: transaction.id,
    reference: transaction.reference,
    type: transaction.type,
    amount: transaction.amount,
    status: transaction.status,
    description: transaction.description,
    idempotencyHash: transaction.idempotencyHash,
    metadata: copyMetadata(transaction.metadata),
    createdAt: new Date(transaction.createdAt),
    updatedAt: new Date(transaction.updatedAt),
  });
}

export class InMemoryTransactionRepository implements TransactionRepository {
  private readonly transactionsById: Map<string, Transaction>;
  private readonly transactionIdByIdempotencyKey: Map<string, string>;

  constructor() {
    this.transactionsById = new Map();
    this.transactionIdByIdempotencyKey = new Map();
  }

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const transaction = new Transaction({ ...input, id: randomUUID() });

    this.store(transaction);

    return copyTransaction(transaction);
  }

  async findById(id: string): Promise<Transaction | null> {
    const stored = this.transactionsById.get(id);

    return stored === undefined ? null : copyTransaction(stored);
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<Transaction | null> {
    const id = this.transactionIdByIdempotencyKey.get(idempotencyKey);

    return id === undefined ? null : this.findById(id);
  }

  async update(
    id: string,
    status: TransactionStatus,
  ): Promise<Transaction | null> {
    const stored = this.transactionsById.get(id);

    if (stored === undefined) {
      return null;
    }

    const updated = copyTransaction(stored);
    updated.status = status;
    updated.updatedAt = new Date();

    this.transactionsById.set(id, updated);

    return copyTransaction(updated);
  }

  private store(transaction: Transaction): void {
    this.transactionsById.set(transaction.id, copyTransaction(transaction));
    this.transactionIdByIdempotencyKey.set(
      transaction.reference,
      transaction.id,
    );
  }
}
