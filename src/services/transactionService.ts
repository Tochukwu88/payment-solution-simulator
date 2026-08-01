import type { CreatePaymentInput } from "../common/interfaces";
import type { AppLogger } from "../common/logger/appLogger";
import type { TransactionStatus } from "../constants/transactionStatus";
import type { Transaction } from "../entities/transaction";
import { NotImplementedException } from "../exceptions";
import type { TransactionRepository } from "../repositories";

export class TransactionService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly logger: AppLogger,
  ) {}

  async createPayment(input: CreatePaymentInput): Promise<Transaction> {
    throw new NotImplementedException();
  }

  async retrievePayment(id: string): Promise<Transaction> {
    throw new NotImplementedException();
  }

  async updatePayment(
    id: string,
    status: TransactionStatus,
  ): Promise<Transaction> {
    throw new NotImplementedException();
  }
}
