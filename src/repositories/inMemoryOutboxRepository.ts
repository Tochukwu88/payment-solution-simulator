import { randomUUID } from "node:crypto";

import type { CreateOutboxEventInput } from "../common/interfaces";
import { OutboxEvent } from "../entities/outboxEvent";
import type { OutboxRepository } from "./outboxRepository";

const DEFAULT_BATCH_SIZE = 10;

function copyOutboxEvent(event: OutboxEvent): OutboxEvent {
  return new OutboxEvent({
    id: event.id,
    transactionId: event.transactionId,
    eventType: event.eventType,
    payload: structuredClone(event.payload),
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
    return this.events
      .filter((event) => event.isPending())
      .slice(0, limit)
      .map(copyOutboxEvent);
  }

  async markAsProcessed(id: string): Promise<OutboxEvent | null> {
    const stored = this.findStoredEvent(id);

    if (stored === undefined) {
      return null;
    }

    stored.processedAt = new Date();
    stored.updatedAt = new Date();

    return copyOutboxEvent(stored);
  }

  private findStoredEvent(id: string): OutboxEvent | undefined {
    return this.events.find((event) => event.id === id);
  }
}
