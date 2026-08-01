import { buildIdempotencyHash } from "../common/idempotency";
import type { PaymentOutcome, PaymentProvider } from "../common/interfaces";
import type { AppLogger } from "../common/logger/appLogger";
import { OutboxEventType } from "../constants/outboxEventType";
import { ResponseMessage } from "../constants/responseMessages";
import {
  allowedNextStatuses,
  isValidStatusTransition,
  TransactionStatus,
} from "../constants/transactionStatus";
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
  isHttpException,
} from "../exceptions";
import type { OutboxRepository, TransactionRepository } from "../repositories";
import { SimulatedPaymentProvider } from "./simulatedPaymentProvider";

export class TransactionService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly outboxRepository: OutboxRepository,
    private readonly logger: AppLogger,
    private readonly paymentProvider: PaymentProvider = new SimulatedPaymentProvider(),
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
    const dto = validateDto(updateTransactionSchema, payload);

    try {
      if (!id) {
        throw new BadRequestException(ResponseMessage.MISSING_REQUIRED_FIELDS);
      }

      const existingTransaction =
        await this.transactionRepository.findById(id);

      if (!existingTransaction) {
        throw new NotFoundException(ResponseMessage.NOT_FOUND);
      }

      this.assertStatusTransitionIsAllowed(
        existingTransaction.status,
        dto.status,
      );

      return await this.saveStatusChange(id, dto.status);
    } catch (error) {
      this.logger.error("Failed to update payment", error, {
        transactionId: id,
        requestedStatus: dto.status,
      });
      return this.throwError(error);
    }
  }

  async processPayment(id: string): Promise<Transaction> {
    const claimedTransaction = await this.claimTransaction(id);

    if (claimedTransaction === null) {
      return this.retrievePayment(id);
    }

    const outcome = await this.paymentProvider.charge(claimedTransaction);

    return this.settleTransaction(claimedTransaction, outcome);
  }

  private async claimTransaction(id: string): Promise<Transaction | null> {
    const transaction = await this.retrievePayment(id);

    if (!transaction.isPending()) {
      this.logger.warn("Skipping transaction that is already claimed", {
        transactionId: transaction.id,
        status: transaction.status,
      });

      return null;
    }

    return this.updatePayment(id, { status: TransactionStatus.PROCESSING });
  }

  private async settleTransaction(
    transaction: Transaction,
    outcome: PaymentOutcome,
  ): Promise<Transaction> {
    const status = outcome.successful
      ? TransactionStatus.COMPLETED
      : TransactionStatus.FAILED;

    const settledTransaction = await this.updatePayment(transaction.id, {
      status,
    });

    this.logger.info("Payment processed", {
      transactionId: settledTransaction.id,
      reference: settledTransaction.reference,
      status: settledTransaction.status,
      reason: outcome.reason,
    });

    return settledTransaction;
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

    await this.recordPaymentCreatedEvent(transaction);

    this.logger.info("Transaction created", {
      reference: transaction.reference,
      transactionId: transaction.id,
      amount: transaction.amount,
    });

    return transaction;
  }

  private async recordPaymentCreatedEvent(
    transaction: Transaction,
  ): Promise<void> {
    await this.outboxRepository.create({
      transactionId: transaction.id,
      eventType: OutboxEventType.PAYMENT_CREATED,
      payload: {
        transactionId: transaction.id,
        reference: transaction.reference,
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status,
      },
    });
  }

  private async saveStatusChange(
    id: string,
    status: TransactionStatus,
  ): Promise<Transaction> {
    const transaction = await this.transactionRepository.update(id, status);

    if (!transaction) {
      throw new NotFoundException(ResponseMessage.NOT_FOUND);
    }

    this.logger.info("Transaction status updated", {
      transactionId: transaction.id,
      status: transaction.status,
    });

    return transaction;
  }

  private assertStatusTransitionIsAllowed(
    currentStatus: TransactionStatus,
    requestedStatus: TransactionStatus,
  ): void {
    if (isValidStatusTransition(currentStatus, requestedStatus)) {
      return;
    }

    throw new ConflictException(ResponseMessage.INVALID_STATUS_TRANSITION, {
      currentStatus,
      requestedStatus,
      allowedStatuses: allowedNextStatuses(currentStatus),
    });
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
