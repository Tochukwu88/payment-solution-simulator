import { logger } from "./common/logger";
import { TransactionController } from "./controllers";
import { InMemoryTransactionRepository } from "./repositories";
import { TransactionService } from "./services";

const transactionRepository = new InMemoryTransactionRepository();

const transactionService = new TransactionService(
  transactionRepository,
  logger.forScope("TransactionService"),
);

export const transactionController = new TransactionController(
  transactionService,
);
