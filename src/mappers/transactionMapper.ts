import type { TransactionResponse } from "../common/interfaces";
import type { Transaction } from "../entities/transaction";

export function toTransactionResponse(
  transaction: Transaction,
): TransactionResponse {
  return {
    id: transaction.id,
    reference: transaction.reference,
    type: transaction.type,
    amount: transaction.amount,
    status: transaction.status,
    description: transaction.description,
    metadata: transaction.metadata,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
}

export function toTransactionResponses(
  transactions: Transaction[],
): TransactionResponse[] {
  return transactions.map(toTransactionResponse);
}
