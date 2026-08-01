import { Router } from "express";

import type { TransactionController } from "../controllers";

export function buildTransactionRouter(
  controller: TransactionController,
): Router {
  const router = Router();

  router.post("/", controller.createPayment);
  router.get("/:id", controller.retrievePayment);
  router.patch("/:id", controller.updatePayment);

  return router;
}
