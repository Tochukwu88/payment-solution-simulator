import type { CreateOutboxEventInput } from "../common/interfaces";
import type { OutboxEvent } from "../entities/outboxEvent";

export interface OutboxRepository {
  create(input: CreateOutboxEventInput): Promise<OutboxEvent>;

  findPending(limit?: number): Promise<OutboxEvent[]>;

  markAsProcessed(id: string): Promise<OutboxEvent | null>;
}
