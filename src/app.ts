import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet";

import rateLimit from "express-rate-limit";
import cors from "cors";
import { env } from "./config/env";
import { ResponseMessage } from "./constants/responseMessages";
import { logger } from "./common/logger";

import { sendSuccess } from "./common/httpResponse";
import { globalErrorHandler, routeNotFoundHandler } from "./middlewares";
import { mountApiDocumentation } from "./docs";
import { buildApiRouter } from "./routes";

const app: Express = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);
app.use(
  cors({
    origin: env.CLIENT_URL?.split(","),
    credentials: true,
  }),
);
const PORT = env.PORT || 3000;

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: ResponseMessage.TOO_MANY_REQUESTS,
    },
  }),
);

mountApiDocumentation(app);

app.get("/", (req: Request, res: Response) => {
  return sendSuccess(res, { message: "Server is up and running" });
});

app.use(buildApiRouter());

app.use(routeNotFoundHandler);
app.use(globalErrorHandler);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
