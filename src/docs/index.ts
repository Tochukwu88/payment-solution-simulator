import type { Express, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";

import { logger } from "../common/logger";
import { env } from "../config/env";
import { buildOpenApiDocument } from "./openApiDocument";

const DOCS_PATH = "/docs";
const DOCS_JSON_PATH = "/docs.json";

const docsLogger = logger.forScope("ApiDocumentation");

function serveOpenApiJson(_req: Request, res: Response): void {
  res.json(buildOpenApiDocument());
}

export function mountApiDocumentation(app: Express): void {
  if (!env.API_DOCS_ENABLED) {
    docsLogger.info("API documentation is disabled");
    return;
  }

  app.get(DOCS_JSON_PATH, serveOpenApiJson);
  app.use(DOCS_PATH, swaggerUi.serve, swaggerUi.setup(buildOpenApiDocument()));

  docsLogger.info(`API documentation available at ${DOCS_PATH}`);
}

export { registerApiRoute } from "./registerApiRoute";
export { buildOpenApiDocument } from "./openApiDocument";
