import type {
  OutboxEventProperties,
  OutboxPayload,
} from "../common/interfaces";
import { OutboxEventStatus } from "../constants/outboxEventStatus";
import type { OutboxEventType } from "../constants/outboxEventType";

export class OutboxEvent {
  id: string;
  transactionId: string;
  eventType: OutboxEventType;
  payload: OutboxPayload;
  status: OutboxEventStatus;
  lastError: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(properties: OutboxEventProperties) {
    const now = new Date();

    this.id = properties.id;
    this.transactionId = properties.transactionId;
    this.eventType = properties.eventType;
    this.payload = properties.payload;
    this.status = properties.status ?? OutboxEventStatus.PENDING;
    this.lastError = properties.lastError ?? null;
    this.processedAt = properties.processedAt ?? null;
    this.createdAt = properties.createdAt ?? now;
    this.updatedAt = properties.updatedAt ?? now;
  }

  isPending(): boolean {
    return this.status === OutboxEventStatus.PENDING;
  }

  isProcessed(): boolean {
    return this.status === OutboxEventStatus.PROCESSED;
  }

  hasFailed(): boolean {
    return this.status === OutboxEventStatus.FAILED;
  }
}
