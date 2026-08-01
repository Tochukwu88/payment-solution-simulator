import { buildIdempotencyHash } from "../common/idempotency";
import type { AppLogger } from "../common/logger/appLogger";
import { ResponseMessage } from "../constants/responseMessages";
import { TransactionStatus } from "../constants/transactionStatus";
import type { Transaction } from "../entities/transaction";
import {
  createTransactionSchema,
  updateTransactionSchema,
  validateDto,
  type CreateTransactionDto,
  type UpdateTransactionDto,
} from "../dtos";
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  NotImplementedException,
  isHttpException,
} from "../exceptions";
import type { TransactionRepository } from "../repositories";

export class TransactionService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly logger: AppLogger,
  ) {}

  async createPayment(payload: CreateTransactionDto): Promise<Transaction> {
    const dto = validateDto(createTransactionSchema, payload);

    try {
      const idempotencyHash = this.buildPaymentHash(dto);

      const existingTransaction =
        await this.transactionRepository.findByIdempotencyKey(dto.reference);

      if (existingTransaction !== null) {
        return this.resolveExistingTransaction(
          existingTransaction,
          idempotencyHash,
        );
      }

      this.assertAmountIsPositive(dto.amount);

      return await this.savePendingTransaction(dto, idempotencyHash);
    } catch (error) {
      this.logger.error("Failed to create payment", error, {
        reference: dto.reference,
      });
      return this.throwError(error);
    }
  }

  async retrievePayment(id: string): Promise<Transaction> {
    try {
      if (!id) {
        throw new BadRequestException(ResponseMessage.MISSING_REQUIRED_FIELDS);
      }
      const transaction = await this.transactionRepository.findById(id);
      if (!transaction) {
        throw new NotFoundException(ResponseMessage.NOT_FOUND);
      }
      return transaction;
    } catch (error) {
      this.logger.error("Failed to retrieve payment", error);
      return this.throwError(error);
    }
  }

  async updatePayment(
    id: string,
    payload: UpdateTransactionDto,
  ): Promise<Transaction> {
    validateDto(updateTransactionSchema, payload);

    throw new NotImplementedException();
  }

  private resolveExistingTransaction(
    existingTransaction: Transaction,
    idempotencyHash: string,
  ): Transaction {
    if (existingTransaction.idempotencyHash !== idempotencyHash) {
      this.logger.warn("Idempotency conflict for reference", {
        reference: existingTransaction.reference,
        transactionId: existingTransaction.id,
      });

      throw new ConflictException(ResponseMessage.IDEMPOTENCY_MISMATCH);
    }

    this.logger.info("Returning existing transaction for reference", {
      reference: existingTransaction.reference,
      transactionId: existingTransaction.id,
    });

    return existingTransaction;
  }

  private async savePendingTransaction(
    dto: CreateTransactionDto,
    idempotencyHash: string,
  ): Promise<Transaction> {
    const transaction = await this.transactionRepository.create({
      ...dto,
      status: TransactionStatus.PENDING,
      idempotencyHash,
    });

    this.logger.info("Transaction created", {
      reference: transaction.reference,
      transactionId: transaction.id,
      amount: transaction.amount,
    });

    return transaction;
  }

  private throwError(error: unknown): never {
    if (isHttpException(error)) {
      throw error;
    }

    throw new InternalServerErrorException();
  }
  private assertAmountIsPositive(amount: number): void {
    if (amount <= 0) {
      throw new BadRequestException(ResponseMessage.INVALID_AMOUNT);
    }
  }
  private buildPaymentHash(dto: CreateTransactionDto): string {
    return buildIdempotencyHash(
      dto.reference,
      dto.type,
      dto.amount,
      dto.description,
      dto.metadata,
    );
  }
}
