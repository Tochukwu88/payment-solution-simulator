import type { CreateTransactionInput } from "../src/common/interfaces";
import { TransactionStatus } from "../src/constants/transactionStatus";
import { Transaction } from "../src/entities/transaction";
import { InMemoryTransactionRepository } from "../src/repositories";

function buildInput(
  overrides: Partial<CreateTransactionInput> = {},
): CreateTransactionInput {
  return {
    reference: "TXN-001",
    type: "debit",
    amount: 5000,
    status: TransactionStatus.PENDING,
    description: "Crown fitting",
    idempotencyHash: "hash-001",
    metadata: { channel: "card", attempt: { count: 0 } },
    ...overrides,
  };
}

describe("InMemoryTransactionRepository", () => {
  let repository: InMemoryTransactionRepository;

  beforeEach(() => {
    repository = new InMemoryTransactionRepository();
  });

  describe("create", () => {
    it("returns a Transaction carrying the supplied values", async () => {
      const transaction = await repository.create(buildInput());

      expect(transaction).toBeInstanceOf(Transaction);
      expect(transaction).toMatchObject({
        reference: "TXN-001",
        type: "debit",
        amount: 5000,
        status: TransactionStatus.PENDING,
        description: "Crown fitting",
        idempotencyHash: "hash-001",
      });
    });

    it("generates a unique id for every transaction", async () => {
      const first = await repository.create(buildInput());
      const second = await repository.create(
        buildInput({ reference: "TXN-002", idempotencyHash: "hash-002" }),
      );

      expect(first.id).toEqual(expect.any(String));
      expect(first.id).not.toBe(second.id);
    });

    it("stamps createdAt and updatedAt", async () => {
      const transaction = await repository.create(buildInput());

      expect(transaction.createdAt).toBeInstanceOf(Date);
      expect(transaction.updatedAt).toBeInstanceOf(Date);
    });

    it("stores a copy so later mutation of the returned object is not persisted", async () => {
      const created = await repository.create(buildInput());

      created.status = TransactionStatus.COMPLETED;
      created.amount = 999999;

      const stored = await repository.findById(created.id);

      expect(stored?.status).toBe(TransactionStatus.PENDING);
      expect(stored?.amount).toBe(5000);
    });
  });

  describe("findById", () => {
    it("returns null when the id is unknown", async () => {
      await expect(repository.findById("missing-id")).resolves.toBeNull();
    });

    it("returns a new object on every read", async () => {
      const created = await repository.create(buildInput());

      const first = await repository.findById(created.id);
      const second = await repository.findById(created.id);

      expect(first).not.toBe(second);
      expect(first).toEqual(second);
    });

    it("returns an entity that still exposes its behaviour", async () => {
      const created = await repository.create(buildInput());

      const read = await repository.findById(created.id);

      expect(read).toBeInstanceOf(Transaction);
      expect(read?.isPending()).toBe(true);
      expect(read?.isSettled()).toBe(false);
    });
  });

  describe("findByIdempotencyKey", () => {
    it("indexes on the reference rather than the stored hash", async () => {
      await repository.create(buildInput());

      await expect(
        repository.findByIdempotencyKey("hash-001"),
      ).resolves.toBeNull();
      await expect(
        repository.findByIdempotencyKey("TXN-001"),
      ).resolves.not.toBeNull();
    });

    it("resolves the transaction through the idempotency index", async () => {
      const created = await repository.create(buildInput());

      const found = await repository.findByIdempotencyKey("TXN-001");

      expect(found?.id).toBe(created.id);
      expect(found?.reference).toBe("TXN-001");
    });

    it("returns null when the key was never indexed", async () => {
      await repository.create(buildInput());

      await expect(
        repository.findByIdempotencyKey("TXN-UNKNOWN"),
      ).resolves.toBeNull();
    });

    it("keeps separate keys pointing at separate transactions", async () => {
      const first = await repository.create(buildInput());
      const second = await repository.create(
        buildInput({ reference: "TXN-002", idempotencyHash: "hash-002" }),
      );

      await expect(
        repository.findByIdempotencyKey("TXN-001"),
      ).resolves.toMatchObject({ id: first.id });
      await expect(
        repository.findByIdempotencyKey("TXN-002"),
      ).resolves.toMatchObject({ id: second.id });
    });
  });

  describe("update", () => {
    it("persists the new status", async () => {
      const created = await repository.create(buildInput());

      const updated = await repository.update(
        created.id,
        TransactionStatus.COMPLETED,
      );

      expect(updated?.status).toBe(TransactionStatus.COMPLETED);
      await expect(repository.findById(created.id)).resolves.toMatchObject({
        status: TransactionStatus.COMPLETED,
      });
    });

    it("moves updatedAt forward while leaving createdAt alone", async () => {
      jest.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
      const created = await repository.create(buildInput());

      jest.setSystemTime(new Date("2026-01-02T00:00:00.000Z"));
      const updated = await repository.update(
        created.id,
        TransactionStatus.FAILED,
      );

      expect(updated?.createdAt.toISOString()).toBe("2026-01-01T00:00:00.000Z");
      expect(updated?.updatedAt.toISOString()).toBe("2026-01-02T00:00:00.000Z");

      jest.useRealTimers();
    });

    it("leaves every other field untouched", async () => {
      const created = await repository.create(buildInput());

      const updated = await repository.update(
        created.id,
        TransactionStatus.COMPLETED,
      );

      expect(updated).toMatchObject({
        id: created.id,
        reference: created.reference,
        type: created.type,
        amount: created.amount,
        description: created.description,
        idempotencyHash: created.idempotencyHash,
      });
    });

    it("returns null when the id is unknown", async () => {
      await expect(
        repository.update("missing-id", TransactionStatus.COMPLETED),
      ).resolves.toBeNull();
    });

    it("returns a copy so mutating the result does not corrupt storage", async () => {
      const created = await repository.create(buildInput());

      const updated = await repository.update(
        created.id,
        TransactionStatus.COMPLETED,
      );
      updated!.status = TransactionStatus.REVERSED;

      await expect(repository.findById(created.id)).resolves.toMatchObject({
        status: TransactionStatus.COMPLETED,
      });
    });

    it("keeps the idempotency index pointing at the updated record", async () => {
      const created = await repository.create(buildInput());

      await repository.update(created.id, TransactionStatus.COMPLETED);

      await expect(
        repository.findByIdempotencyKey("TXN-001"),
      ).resolves.toMatchObject({
        id: created.id,
        status: TransactionStatus.COMPLETED,
      });
    });
  });
});
