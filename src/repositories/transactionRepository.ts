import type { CreateTransactionInput } from "../common/interfaces";
import type { TransactionStatus } from "../constants/transactionStatus";
import type { Transaction } from "../entities/transaction";

export interface TransactionRepository {
  create(input: CreateTransactionInput): Promise<Transaction>;

  findById(id: string): Promise<Transaction | null>;

  findByIdempotencyKey(idempotencyKey: string): Promise<Transaction | null>;

  update(id: string, status: TransactionStatus): Promise<Transaction | null>;
}
