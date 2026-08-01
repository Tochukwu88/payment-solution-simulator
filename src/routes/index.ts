import { Router } from "express";

import { transactionController } from "../container";
import { buildTransactionRouter } from "./transactionRoutes";

export const PAYMENTS_PATH = "/payments";

export function buildApiRouter(): Router {
  const router = Router();

  router.use(PAYMENTS_PATH, buildTransactionRouter(transactionController));

  return router;
}
