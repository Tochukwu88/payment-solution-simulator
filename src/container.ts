import { logger } from "./common/logger";
import { TransactionController } from "./controllers";
import { OutboxProcessor } from "./jobs";
import {
  InMemoryOutboxRepository,
  InMemoryTransactionRepository,
} from "./repositories";
import { TransactionService } from "./services";

const transactionRepository = new InMemoryTransactionRepository();
const outboxRepository = new InMemoryOutboxRepository();

const transactionService = new TransactionService(
  transactionRepository,
  outboxRepository,
  logger.forScope("TransactionService"),
);

export const transactionController = new TransactionController(
  transactionService,
);

export const outboxProcessor = new OutboxProcessor(
  outboxRepository,
  transactionService,
  logger.forScope("OutboxProcessor"),
);
