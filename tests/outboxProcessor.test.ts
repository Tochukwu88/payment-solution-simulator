import type { PaymentProvider } from "../src/common/interfaces";
import { OutboxEventType } from "../src/constants/outboxEventType";
import { TransactionStatus } from "../src/constants/transactionStatus";
import { OutboxEvent } from "../src/entities/outboxEvent";
import { OutboxProcessor } from "../src/jobs";
import {
  InMemoryOutboxRepository,
  InMemoryTransactionRepository,
} from "../src/repositories";
import { TransactionService } from "../src/services";
import { buildRecordingLogger } from "./support/recordingLogger";
import {
  StubPaymentProvider,
  ThrowingPaymentProvider,
} from "./support/stubPaymentProvider";

function buildPayment(reference = "TXN-001") {
  return {
    reference,
    type: "debit",
    amount: 5000,
    description: "Crown fitting",
    metadata: { channel: "card" },
  };
}

describe("InMemoryOutboxRepository", () => {
  let outboxRepository: InMemoryOutboxRepository;

  beforeEach(() => {
    outboxRepository = new InMemoryOutboxRepository();
  });

  function buildEvent(transactionId = "txn-1") {
    return {
      transactionId,
      eventType: OutboxEventType.PAYMENT_CREATED,
      payload: { transactionId, nested: { attempt: 0 } },
    };
  }

  it("creates an unprocessed event with a generated id", async () => {
    const event = await outboxRepository.create(buildEvent());

    expect(event).toBeInstanceOf(OutboxEvent);
    expect(event.id).toEqual(expect.any(String));
    expect(event.processedAt).toBeNull();
    expect(event.isPending()).toBe(true);
  });

  it("returns pending events in insertion order", async () => {
    await outboxRepository.create(buildEvent("txn-1"));
    await outboxRepository.create(buildEvent("txn-2"));

    const pending = await outboxRepository.findPending();

    expect(pending.map((event) => event.transactionId)).toEqual([
      "txn-1",
      "txn-2",
    ]);
  });

  it("honours the batch size", async () => {
    await outboxRepository.create(buildEvent("txn-1"));
    await outboxRepository.create(buildEvent("txn-2"));
    await outboxRepository.create(buildEvent("txn-3"));

    await expect(outboxRepository.findPending(2)).resolves.toHaveLength(2);
  });

  it("stops returning an event once it is processed", async () => {
    const event = await outboxRepository.create(buildEvent());

    await outboxRepository.markAsProcessed(event.id);

    await expect(outboxRepository.findPending()).resolves.toHaveLength(0);
  });

  it("stamps processedAt when marking an event processed", async () => {
    const event = await outboxRepository.create(buildEvent());

    const processed = await outboxRepository.markAsProcessed(event.id);

    expect(processed?.processedAt).toBeInstanceOf(Date);
    expect(processed?.isProcessed()).toBe(true);
  });

  it("returns null when marking an unknown event", async () => {
    await expect(
      outboxRepository.markAsProcessed("missing-id"),
    ).resolves.toBeNull();
  });
});

describe("OutboxProcessor", () => {
  let transactionRepository: InMemoryTransactionRepository;
  let outboxRepository: InMemoryOutboxRepository;

  function buildProcessor(
    provider: PaymentProvider = new StubPaymentProvider(true),
  ) {
    const recording = buildRecordingLogger();

    const service = new TransactionService(
      transactionRepository,
      outboxRepository,
      recording.logger,
      provider,
    );

    return {
      service,
      driver: recording.driver,
      processor: new OutboxProcessor(
        outboxRepository,
        service,
        recording.logger,
      ),
    };
  }

  beforeEach(() => {
    transactionRepository = new InMemoryTransactionRepository();
    outboxRepository = new InMemoryOutboxRepository();
  });

  it("completes a pending payment", async () => {
    const { service, processor } = buildProcessor();
    const created = await service.createPayment(buildPayment());

    await processor.drain();

    await expect(
      transactionRepository.findById(created.id),
    ).resolves.toMatchObject({ status: TransactionStatus.COMPLETED });
  });

  it("fails a payment the provider declines", async () => {
    const { service, processor } = buildProcessor(
      new StubPaymentProvider(false, "declined"),
    );
    const created = await service.createPayment(buildPayment());

    await processor.drain();

    await expect(
      transactionRepository.findById(created.id),
    ).resolves.toMatchObject({ status: TransactionStatus.FAILED });
  });

  it("marks the event processed so it is not picked up again", async () => {
    const { service, processor } = buildProcessor();
    await service.createPayment(buildPayment());

    await processor.drain();

    await expect(outboxRepository.findPending()).resolves.toHaveLength(0);
  });

  it("leaves nothing to do on a second drain", async () => {
    const provider = new StubPaymentProvider(true);
    const { service, processor } = buildProcessor(provider);
    await service.createPayment(buildPayment());

    await processor.drain();
    await processor.drain();

    expect(provider.chargedTransactionIds).toHaveLength(1);
  });

  it("processes every pending payment in one pass", async () => {
    const { service, processor } = buildProcessor();
    const first = await service.createPayment(buildPayment("TXN-001"));
    const second = await service.createPayment(buildPayment("TXN-002"));

    await processor.drain();

    await expect(
      transactionRepository.findById(first.id),
    ).resolves.toMatchObject({ status: TransactionStatus.COMPLETED });
    await expect(
      transactionRepository.findById(second.id),
    ).resolves.toMatchObject({ status: TransactionStatus.COMPLETED });
  });

  it("consumes the event and logs when the provider throws", async () => {
    const { service, processor, driver } = buildProcessor(
      new ThrowingPaymentProvider(new Error("provider unreachable")),
    );
    await service.createPayment(buildPayment());

    await processor.drain();

    expect(driver.messagesAt("error")).toContain(
      "Failed to process outbox event",
    );
    await expect(outboxRepository.findPending()).resolves.toHaveLength(0);
  });

  it("does not overlap two concurrent drains", async () => {
    const provider = new StubPaymentProvider(true);
    const { service, processor } = buildProcessor(provider);
    await service.createPayment(buildPayment());

    await Promise.all([processor.drain(), processor.drain()]);

    expect(provider.chargedTransactionIds).toHaveLength(1);
  });
});
