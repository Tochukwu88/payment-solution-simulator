import type { CreatePaymentInput } from "../src/common/interfaces";
import { TransactionStatus } from "../src/constants/transactionStatus";
import { Transaction } from "../src/entities/transaction";
import { HttpStatus, ResponseMessage } from "../src/constants/responseMessages";
import { ConflictException, NotFoundException } from "../src/exceptions";
import { InMemoryTransactionRepository } from "../src/repositories";
import { TransactionService } from "../src/services";
import {
  buildRecordingLogger,
  type RecordingLoggerDriver,
} from "./support/recordingLogger";

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
  let loggerDriver: RecordingLoggerDriver;
  let service: TransactionService;

  beforeEach(() => {
    const recording = buildRecordingLogger();

    repository = new InMemoryTransactionRepository();
    loggerDriver = recording.driver;
    service = new TransactionService(repository, recording.logger);
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

  // describe("updatePayment", () => {
  //   it("moves the transaction to the requested status", async () => {
  //     const created = await service.createPayment(buildPayment());

  //     const updated = await service.updatePayment(
  //       created.id,
  //       { status: TransactionStatus.COMPLETED },
  //     );

  //     expect(updated.status).toBe(TransactionStatus.COMPLETED);
  //     expect(updated.isCompleted()).toBe(true);
  //   });

  //   it("persists the new status", async () => {
  //     const created = await service.createPayment(buildPayment());

  //     await service.updatePayment(created.id, { status: TransactionStatus.FAILED });

  //     await expect(service.retrievePayment(created.id)).resolves.toMatchObject({
  //       status: TransactionStatus.FAILED,
  //     });
  //   });

  //   it("changes nothing but the status", async () => {
  //     const created = await service.createPayment(buildPayment());

  //     const updated = await service.updatePayment(
  //       created.id,
  //       { status: TransactionStatus.COMPLETED },
  //     );

  //     expect(updated).toMatchObject({
  //       id: created.id,
  //       reference: created.reference,
  //       amount: created.amount,
  //       idempotencyHash: created.idempotencyHash,
  //     });
  //     expect(updated.createdAt).toEqual(created.createdAt);
  //   });

  //   it("throws NotFoundException for an unknown id", async () => {
  //     await expect(
  //       service.updatePayment("missing-id", { status: TransactionStatus.COMPLETED }),
  //     ).rejects.toThrow(NotFoundException);
  //   });

  //   it("logs the status change", async () => {
  //     const created = await service.createPayment(buildPayment());

  //     await service.updatePayment(created.id, { status: TransactionStatus.COMPLETED });

  //     expect(loggerDriver.messagesAt("info")).toContain(
  //       "Transaction status updated",
  //     );
  //   });
  // });
});
