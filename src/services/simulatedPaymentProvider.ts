import type {
  PaymentOutcome,
  PaymentProvider,
} from "../common/interfaces";
import type { Transaction } from "../entities/transaction";

const DEFAULT_FAILURE_RATE = 0.02;
const DEFAULT_MIN_LATENCY_MS = 50;
const DEFAULT_MAX_LATENCY_MS = 400;
const DECLINE_REASON = "Provider declined the charge";

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export class SimulatedPaymentProvider implements PaymentProvider {
  constructor(
    private readonly failureRate: number = DEFAULT_FAILURE_RATE,
    private readonly minLatencyMs: number = DEFAULT_MIN_LATENCY_MS,
    private readonly maxLatencyMs: number = DEFAULT_MAX_LATENCY_MS,
  ) {}

  async charge(transaction: Transaction): Promise<PaymentOutcome> {
    await wait(this.randomLatency());

    if (this.shouldFail()) {
      return { successful: false, reason: DECLINE_REASON };
    }

    return { successful: true };
  }

  private randomLatency(): number {
    const span = this.maxLatencyMs - this.minLatencyMs;

    return this.minLatencyMs + Math.floor(Math.random() * span);
  }

  private shouldFail(): boolean {
    return Math.random() < this.failureRate;
  }
}
