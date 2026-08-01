import type {
  PaymentOutcome,
  PaymentProvider,
} from "../../src/common/interfaces";
import type { Transaction } from "../../src/entities/transaction";

export class StubPaymentProvider implements PaymentProvider {
  readonly chargedTransactionIds: string[] = [];

  constructor(
    private readonly successful: boolean = true,
    private readonly reason?: string,
  ) {}

  async charge(transaction: Transaction): Promise<PaymentOutcome> {
    this.chargedTransactionIds.push(transaction.id);

    return { successful: this.successful, reason: this.reason };
  }
}

export class ThrowingPaymentProvider implements PaymentProvider {
  constructor(private readonly error: Error) {}

  async charge(): Promise<PaymentOutcome> {
    throw this.error;
  }
}
