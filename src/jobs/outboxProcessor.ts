import type { AppLogger } from "../common/logger/appLogger";
import type { OutboxEvent } from "../entities/outboxEvent";
import type { OutboxRepository } from "../repositories";
import type { TransactionService } from "../services";

const DEFAULT_POLL_INTERVAL_MS = 1000;
const DEFAULT_BATCH_SIZE = 10;

export class OutboxProcessor {
  private timer: NodeJS.Timeout | null = null;
  private draining = false;

  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly transactionService: TransactionService,
    private readonly logger: AppLogger,
    private readonly pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS,
    private readonly batchSize: number = DEFAULT_BATCH_SIZE,
  ) {}

  start(): void {
    if (this.timer !== null) {
      return;
    }

    this.timer = setInterval(() => {
      void this.drain();
    }, this.pollIntervalMs);

    this.timer.unref();

    this.logger.info("Outbox processor started", {
      pollIntervalMs: this.pollIntervalMs,
    });
  }

  stop(): void {
    if (this.timer === null) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;

    this.logger.info("Outbox processor stopped");
  }

  async drain(): Promise<void> {
    if (this.draining) {
      return;
    }

    this.draining = true;

    try {
      const events = await this.outboxRepository.findPending(this.batchSize);

      for (const event of events) {
        await this.handleEvent(event);
      }
    } catch (error) {
      this.logger.error("Failed to read pending outbox events", error);
    } finally {
      this.draining = false;
    }
  }

  private async handleEvent(event: OutboxEvent): Promise<void> {
    try {
      await this.transactionService.processPayment(event.transactionId);
    } catch (error) {
      this.logger.error("Failed to process outbox event", error, {
        outboxEventId: event.id,
        transactionId: event.transactionId,
        eventType: event.eventType,
      });
    } finally {
      await this.outboxRepository.markAsProcessed(event.id);
    }
  }
}
