import type { CreatePaymentInput } from "../src/common/interfaces";
import { TransactionStatus } from "../src/constants/transactionStatus";
import { Transaction } from "../src/entities/transaction";
import { HttpStatus, ResponseMessage } from "../src/constants/responseMessages";
import { ConflictException, NotFoundException } from "../src/exceptions";
import {
  InMemoryOutboxRepository,
  InMemoryTransactionRepository,
} from "../src/repositories";
import { TransactionService } from "../src/services";
import { OutboxEventType } from "../src/constants/outboxEventType";
import {
  buildRecordingLogger,
  type RecordingLoggerDriver,
} from "./support/recordingLogger";
import {
  StubPaymentProvider,
  ThrowingPaymentProvider,
} from "./support/stubPaymentProvider";

function buildPayment(
  overrides: Partial<CreatePaymentInput> = {},
): CreatePaymentInput {
  return {
    reference: "TXN-001",
    type: "debit",
    amount: 5000,
    description: "Crown fitting",
    metadata: { channel: "card" },
    ...overrides,
  };
}

describe("TransactionService", () => {
  let repository: InMemoryTransactionRepository;
  let outboxRepository: InMemoryOutboxRepository;
  let loggerDriver: RecordingLoggerDriver;
  let service: TransactionService;

  beforeEach(() => {
    const recording = buildRecordingLogger();

    repository = new InMemoryTransactionRepository();
    outboxRepository = new InMemoryOutboxRepository();
    loggerDriver = recording.driver;
    service = new TransactionService(
      repository,
      outboxRepository,
      recording.logger,
      new StubPaymentProvider(true),
    );
  });

  describe("createPayment", () => {
    it("creates a pending transaction from the payload", async () => {
      const transaction = await service.createPayment(buildPayment());

      expect(transaction).toBeInstanceOf(Transaction);
      expect(transaction).toMatchObject({
        reference: "TXN-001",
        type: "debit",
        amount: 5000,
        description: "Crown fitting",
        status: TransactionStatus.PENDING,
      });
      expect(transaction.id).toEqual(expect.any(String));
    });

    it("stores a sha-256 fingerprint of the payload", async () => {
      const transaction = await service.createPayment(buildPayment());

      expect(transaction.idempotencyHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("produces the same fingerprint for an identical payload", async () => {
      const first = await service.createPayment(buildPayment());
      const second = await service.createPayment(
        buildPayment({ metadata: { channel: "card" } }),
      );

      expect(second.idempotencyHash).toBe(first.idempotencyHash);
    });

    it("produces a different fingerprint when the amount changes", async () => {
      const first = await service.createPayment(buildPayment());
      const other = await service.createPayment(
        buildPayment({ reference: "TXN-OTHER", amount: 7500 }),
      );

      expect(other.idempotencyHash).not.toBe(first.idempotencyHash);
    });

    it("rejects an amount that is not greater than zero", async () => {
      await expect(
        service.createPayment(buildPayment({ amount: 0 })),
      ).rejects.toMatchObject({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });

      await expect(
        service.createPayment(buildPayment({ amount: -1 })),
      ).rejects.toMatchObject({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    });

    it("persists the transaction so it can be retrieved afterwards", async () => {
      const created = await service.createPayment(buildPayment());

      await expect(repository.findById(created.id)).resolves.toMatchObject({
        id: created.id,
        reference: "TXN-001",
      });
    });

    it("logs the creation", async () => {
      await service.createPayment(buildPayment());

      expect(loggerDriver.messagesAt("info")).toContain("Transaction created");
    });

    describe("when the same reference is submitted twice", () => {
      it("returns the transaction created by the first call", async () => {
        const first = await service.createPayment(buildPayment());
        const second = await service.createPayment(buildPayment());

        expect(second.id).toBe(first.id);
        expect(second.createdAt).toEqual(first.createdAt);
      });

      it("does not write a second transaction", async () => {
        const createSpy = jest.spyOn(repository, "create");

        await service.createPayment(buildPayment());
        await service.createPayment(buildPayment());

        expect(createSpy).toHaveBeenCalledTimes(1);
      });

      it("returns the stored details rather than the retry payload", async () => {
        const first = await service.createPayment(buildPayment());

        const second = await service.createPayment(buildPayment());

        expect(second.id).toBe(first.id);
        expect(second.amount).toBe(5000);
        expect(second.description).toBe("Crown fitting");
        expect(second.metadata).toEqual({ channel: "card" });
      });

      it("rejects a retry whose payload does not match the stored fingerprint", async () => {
        await service.createPayment(buildPayment());

        await expect(
          service.createPayment(buildPayment({ amount: 99999 })),
        ).rejects.toThrow(ConflictException);
      });

      it("answers a mismatched retry with a 409 and a descriptive message", async () => {
        await service.createPayment(buildPayment());

        await expect(
          service.createPayment(
            buildPayment({ description: "Different description" }),
          ),
        ).rejects.toMatchObject({
          statusCode: HttpStatus.CONFLICT,
          message: ResponseMessage.IDEMPOTENCY_MISMATCH,
        });
      });

      it("does not overwrite the stored transaction on a mismatched retry", async () => {
        const first = await service.createPayment(buildPayment());

        await expect(
          service.createPayment(buildPayment({ amount: 99999 })),
        ).rejects.toThrow(ConflictException);

        await expect(repository.findById(first.id)).resolves.toMatchObject({
          amount: 5000,
        });
      });
    });

    it("creates separate transactions for different references", async () => {
      const first = await service.createPayment(buildPayment());
      const second = await service.createPayment(
        buildPayment({ reference: "TXN-002" }),
      );

      expect(second.id).not.toBe(first.id);
      expect(second.idempotencyHash).not.toBe(first.idempotencyHash);
    });

    describe("outbox", () => {
      it("writes a pending payment.created event", async () => {
        const created = await service.createPayment(buildPayment());

        const pending = await outboxRepository.findPending();

        expect(pending).toHaveLength(1);
        expect(pending[0]).toMatchObject({
          transactionId: created.id,
          eventType: OutboxEventType.PAYMENT_CREATED,
          processedAt: null,
        });
      });

      it("carries a payload describing the payment", async () => {
        const created = await service.createPayment(buildPayment());

        const [event] = await outboxRepository.findPending();

        expect(event.payload).toEqual({
          transactionId: created.id,
          reference: "TXN-001",
          type: "debit",
          amount: 5000,
          status: TransactionStatus.PENDING,
        });
      });

      it("does not write a second event for an idempotent retry", async () => {
        await service.createPayment(buildPayment());
        await service.createPayment(buildPayment());

        await expect(outboxRepository.findPending()).resolves.toHaveLength(1);
      });

      it("writes one event per distinct payment", async () => {
        await service.createPayment(buildPayment());
        await service.createPayment(buildPayment({ reference: "TXN-002" }));

        await expect(outboxRepository.findPending()).resolves.toHaveLength(2);
      });
    });
  });

  describe("retrievePayment", () => {
    it("returns the stored transaction", async () => {
      const created = await service.createPayment(buildPayment());

      const found = await service.retrievePayment(created.id);

      expect(found.id).toBe(created.id);
      expect(found.reference).toBe("TXN-001");
    });

    it("throws NotFoundException for an unknown id", async () => {
      await expect(service.retrievePayment("missing-id")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws with a 404 status so the error handler answers correctly", async () => {
      await expect(service.retrievePayment("missing-id")).rejects.toMatchObject(
        { statusCode: HttpStatus.NOT_FOUND },
      );
    });

    it("returns a copy that cannot corrupt storage", async () => {
      const created = await service.createPayment(buildPayment());

      const found = await service.retrievePayment(created.id);
      found.amount = 1;

      await expect(service.retrievePayment(created.id)).resolves.toMatchObject({
        amount: 5000,
      });
    });
  });

  describe("updatePayment", () => {
    async function createAt(status: TransactionStatus) {
      const created = await service.createPayment(buildPayment());

      if (status !== TransactionStatus.PENDING) {
        await repository.update(created.id, status);
      }

      return created;
    }

    it("moves the transaction to the requested status", async () => {
      const created = await service.createPayment(buildPayment());

      const updated = await service.updatePayment(created.id, {
        status: TransactionStatus.COMPLETED,
      });

      expect(updated.status).toBe(TransactionStatus.COMPLETED);
      expect(updated.isCompleted()).toBe(true);
    });

    it("persists the new status", async () => {
      const created = await service.createPayment(buildPayment());

      await service.updatePayment(created.id, {
        status: TransactionStatus.FAILED,
      });

      await expect(service.retrievePayment(created.id)).resolves.toMatchObject({
        status: TransactionStatus.FAILED,
      });
    });

    it("changes nothing but the status", async () => {
      const created = await service.createPayment(buildPayment());

      const updated = await service.updatePayment(created.id, {
        status: TransactionStatus.COMPLETED,
      });

      expect(updated).toMatchObject({
        id: created.id,
        reference: created.reference,
        amount: created.amount,
        idempotencyHash: created.idempotencyHash,
      });
      expect(updated.createdAt).toEqual(created.createdAt);
    });

    it("throws NotFoundException for an unknown id", async () => {
      await expect(
        service.updatePayment("missing-id", {
          status: TransactionStatus.COMPLETED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("rejects an empty id", async () => {
      await expect(
        service.updatePayment("", { status: TransactionStatus.COMPLETED }),
      ).rejects.toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });
    });

    it("rejects a status that is not part of the enum", async () => {
      const created = await service.createPayment(buildPayment());

      await expect(
        service.updatePayment(created.id, {
          status: "refunded" as TransactionStatus,
        }),
      ).rejects.toMatchObject({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    });

    it("logs the status change", async () => {
      const created = await service.createPayment(buildPayment());

      await service.updatePayment(created.id, {
        status: TransactionStatus.COMPLETED,
      });

      expect(loggerDriver.messagesAt("info")).toContain(
        "Transaction status updated",
      );
    });

    describe("allowed status transitions", () => {
      const allowed: [TransactionStatus, TransactionStatus][] = [
        [TransactionStatus.PENDING, TransactionStatus.PROCESSING],
        [TransactionStatus.PENDING, TransactionStatus.COMPLETED],
        [TransactionStatus.PENDING, TransactionStatus.FAILED],
        [TransactionStatus.PROCESSING, TransactionStatus.COMPLETED],
        [TransactionStatus.PROCESSING, TransactionStatus.FAILED],
        [TransactionStatus.COMPLETED, TransactionStatus.REVERSED],
      ];

      it.each(allowed)("allows %s -> %s", async (from, to) => {
        const created = await createAt(from);

        const updated = await service.updatePayment(created.id, { status: to });

        expect(updated.status).toBe(to);
      });
    });

    describe("rejected status transitions", () => {
      const rejected: [TransactionStatus, TransactionStatus][] = [
        [TransactionStatus.FAILED, TransactionStatus.COMPLETED],
        [TransactionStatus.FAILED, TransactionStatus.PENDING],
        [TransactionStatus.FAILED, TransactionStatus.PROCESSING],
        [TransactionStatus.FAILED, TransactionStatus.REVERSED],
        [TransactionStatus.COMPLETED, TransactionStatus.PENDING],
        [TransactionStatus.COMPLETED, TransactionStatus.PROCESSING],
        [TransactionStatus.COMPLETED, TransactionStatus.FAILED],
        [TransactionStatus.REVERSED, TransactionStatus.COMPLETED],
        [TransactionStatus.REVERSED, TransactionStatus.PENDING],
        [TransactionStatus.PROCESSING, TransactionStatus.PENDING],
        [TransactionStatus.PENDING, TransactionStatus.REVERSED],
      ];

      it.each(rejected)("rejects %s -> %s", async (from, to) => {
        const created = await createAt(from);

        await expect(
          service.updatePayment(created.id, { status: to }),
        ).rejects.toThrow(ConflictException);
      });

      it("answers with a 409 and the statuses that are allowed", async () => {
        const created = await createAt(TransactionStatus.FAILED);

        await expect(
          service.updatePayment(created.id, {
            status: TransactionStatus.COMPLETED,
          }),
        ).rejects.toMatchObject({
          statusCode: HttpStatus.CONFLICT,
          message: ResponseMessage.INVALID_STATUS_TRANSITION,
          details: {
            currentStatus: TransactionStatus.FAILED,
            requestedStatus: TransactionStatus.COMPLETED,
            allowedStatuses: [],
          },
        });
      });

      it("rejects a repeat of the current status", async () => {
        const created = await service.createPayment(buildPayment());

        await expect(
          service.updatePayment(created.id, {
            status: TransactionStatus.PENDING,
          }),
        ).rejects.toThrow(ConflictException);
      });
    });
  });

  describe("processPayment", () => {
    function buildService(provider: StubPaymentProvider) {
      const recording = buildRecordingLogger();

      return {
        service: new TransactionService(
          repository,
          outboxRepository,
          recording.logger,
          provider,
        ),
        driver: recording.driver,
      };
    }

    it("completes the payment when the provider succeeds", async () => {
      const created = await service.createPayment(buildPayment());

      const processed = await service.processPayment(created.id);

      expect(processed.status).toBe(TransactionStatus.COMPLETED);
    });

    it("fails the payment when the provider declines", async () => {
      const provider = new StubPaymentProvider(false, "declined");
      const { service: failing } = buildService(provider);
      const created = await failing.createPayment(buildPayment());

      const processed = await failing.processPayment(created.id);

      expect(processed.status).toBe(TransactionStatus.FAILED);
    });

    it("claims the transaction as processing before calling the provider", async () => {
      const created = await service.createPayment(buildPayment());
      const seenStatuses: TransactionStatus[] = [];

      jest
        .spyOn(repository, "update")
        .mockImplementation(async (id, status) => {
          seenStatuses.push(status);
          return repository.findById(id);
        });

      await service.processPayment(created.id);

      expect(seenStatuses[0]).toBe(TransactionStatus.PROCESSING);
    });

    it("persists the final status", async () => {
      const created = await service.createPayment(buildPayment());

      await service.processPayment(created.id);

      await expect(repository.findById(created.id)).resolves.toMatchObject({
        status: TransactionStatus.COMPLETED,
      });
    });

    it("passes the claimed transaction to the provider", async () => {
      const provider = new StubPaymentProvider(true);
      const { service: tracked } = buildService(provider);
      const created = await tracked.createPayment(buildPayment());

      await tracked.processPayment(created.id);

      expect(provider.chargedTransactionIds).toEqual([created.id]);
    });

    it("does not charge a transaction that is already being processed", async () => {
      const provider = new StubPaymentProvider(true);
      const { service: tracked } = buildService(provider);
      const created = await tracked.createPayment(buildPayment());
      await repository.update(created.id, TransactionStatus.PROCESSING);

      const result = await tracked.processPayment(created.id);

      expect(provider.chargedTransactionIds).toEqual([]);
      expect(result.status).toBe(TransactionStatus.PROCESSING);
    });

    it("does not re-run a settled transaction", async () => {
      const provider = new StubPaymentProvider(true);
      const { service: tracked } = buildService(provider);
      const created = await tracked.createPayment(buildPayment());
      await repository.update(created.id, TransactionStatus.FAILED);

      const result = await tracked.processPayment(created.id);

      expect(provider.chargedTransactionIds).toEqual([]);
      expect(result.status).toBe(TransactionStatus.FAILED);
    });

    it("logs the outcome", async () => {
      const created = await service.createPayment(buildPayment());

      await service.processPayment(created.id);

      expect(loggerDriver.messagesAt("info")).toContain("Payment processed");
    });

    it("throws NotFoundException for an unknown transaction", async () => {
      await expect(service.processPayment("missing-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
