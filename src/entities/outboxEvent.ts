import type {
  OutboxEventProperties,
  OutboxPayload,
} from "../common/interfaces";
import type { OutboxEventType } from "../constants/outboxEventType";

export class OutboxEvent {
  id: string;
  transactionId: string;
  eventType: OutboxEventType;
  payload: OutboxPayload;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(properties: OutboxEventProperties) {
    const now = new Date();

    this.id = properties.id;
    this.transactionId = properties.transactionId;
    this.eventType = properties.eventType;
    this.payload = properties.payload;
    this.processedAt = properties.processedAt ?? null;
    this.createdAt = properties.createdAt ?? now;
    this.updatedAt = properties.updatedAt ?? now;
  }

  isPending(): boolean {
    return this.processedAt === null;
  }

  isProcessed(): boolean {
    return this.processedAt !== null;
  }
}
