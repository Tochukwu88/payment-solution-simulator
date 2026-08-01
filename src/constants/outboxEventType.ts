export enum OutboxEventType {
  PAYMENT_CREATED = "payment.created",
  PAYMENT_COMPLETED = "payment.completed",
  PAYMENT_FAILED = "payment.failed",
}
