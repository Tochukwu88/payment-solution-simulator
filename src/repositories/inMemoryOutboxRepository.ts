import { randomUUID } from "node:crypto";

import type { CreateOutboxEventInput } from "../common/interfaces";
import { OutboxEventStatus } from "../constants/outboxEventStatus";
import { OutboxEvent } from "../entities/outboxEvent";
import type { OutboxRepository } from "./outboxRepository";

const DEFAULT_BATCH_SIZE = 10;

function copyOutboxEvent(event: OutboxEvent): OutboxEvent {
  return new OutboxEvent({
    id: event.id,
    transactionId: event.transactionId,
    eventType: event.eventType,
    payload: structuredClone(event.payload),
    status: event.status,
    lastError: event.lastError,
    processedAt: event.processedAt === null ? null : new Date(event.processedAt),
    createdAt: new Date(event.createdAt),
    updatedAt: new Date(event.updatedAt),
  });
}

export class InMemoryOutboxRepository implements OutboxRepository {
  private readonly events: OutboxEvent[];

  constructor() {
    this.events = [];
  }

  async create(input: CreateOutboxEventInput): Promise<OutboxEvent> {
    const event = new OutboxEvent({ ...input, id: randomUUID() });

    this.events.push(copyOutboxEvent(event));

    return copyOutboxEvent(event);
  }

  async findPending(limit: number = DEFAULT_BATCH_SIZE): Promise<OutboxEvent[]> {
    return this.findByStatus(OutboxEventStatus.PENDING, limit);
  }

  async findFailed(limit: number = DEFAULT_BATCH_SIZE): Promise<OutboxEvent[]> {
    return this.findByStatus(OutboxEventStatus.FAILED, limit);
  }

  async markAsProcessed(id: string): Promise<OutboxEvent | null> {
    return this.settle(id, OutboxEventStatus.PROCESSED, null);
  }

  async markAsFailed(id: string, reason: string): Promise<OutboxEvent | null> {
    return this.settle(id, OutboxEventStatus.FAILED, reason);
  }

  private findByStatus(
    status: OutboxEventStatus,
    limit: number,
  ): OutboxEvent[] {
    return this.events
      .filter((event) => event.status === status)
      .slice(0, limit)
      .map(copyOutboxEvent);
  }

  private settle(
    id: string,
    status: OutboxEventStatus,
    lastError: string | null,
  ): OutboxEvent | null {
    const stored = this.findStoredEvent(id);

    if (stored === undefined) {
      return null;
    }

    const now = new Date();

    stored.status = status;
    stored.lastError = lastError;
    stored.processedAt = now;
    stored.updatedAt = now;

    return copyOutboxEvent(stored);
  }

  private findStoredEvent(id: string): OutboxEvent | undefined {
    return this.events.find((event) => event.id === id);
  }
}
