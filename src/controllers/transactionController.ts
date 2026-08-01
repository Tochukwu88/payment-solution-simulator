import type { Request, Response } from "express";

import { sendCreated, sendSuccess } from "../common/httpResponse";
import { ResponseMessage } from "../constants/responseMessages";
import { toTransactionResponse } from "../mappers";
import type { TransactionService } from "../services";

type TransactionIdParams = { id: string };

export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  createPayment = async (req: Request, res: Response): Promise<Response> => {
    const transaction = await this.transactionService.createPayment(req.body);

    return sendCreated(res, {
      message: ResponseMessage.CREATED,
      data: toTransactionResponse(transaction),
    });
  };

  retrievePayment = async (
    req: Request<TransactionIdParams>,
    res: Response,
  ): Promise<Response> => {
    const transaction = await this.transactionService.retrievePayment(
      req.params.id,
    );

    return sendSuccess(res, {
      message: ResponseMessage.FETCHED,
      data: toTransactionResponse(transaction),
    });
  };

  updatePayment = async (
    req: Request<TransactionIdParams>,
    res: Response,
  ): Promise<Response> => {
    const transaction = await this.transactionService.updatePayment(
      req.params.id,
      req.body,
    );

    return sendSuccess(res, {
      message: ResponseMessage.UPDATED,
      data: toTransactionResponse(transaction),
    });
  };
}
