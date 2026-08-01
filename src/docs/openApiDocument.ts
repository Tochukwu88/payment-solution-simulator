import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";

import { env } from "../config/env";
import { apiRegistry } from "./apiRegistry";
import "./registeredRoutes";

const API_TITLE = "Frontier Dental API";
const API_VERSION = "1.0.0";
const API_DESCRIPTION = "Payment processing API. ";

function buildServers() {
  return [{ url: `http://localhost:${env.PORT}`, description: env.NODE_ENV }];
}

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(apiRegistry.definitions);

  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: API_TITLE,
      version: API_VERSION,
      description: API_DESCRIPTION,
    },
    servers: buildServers(),
  });
}
