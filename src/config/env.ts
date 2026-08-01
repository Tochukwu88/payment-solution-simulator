import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().default(3000),

  CLIENT_URL: z.string(),

  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),

  LOG_DIRECTORY: z.string().default("logs"),

  API_DOCS_ENABLED: z
    .stringbool()
    .default(true),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables");
  console.error(parsed.error.message);

  process.exit(1);
}

export const env = parsed.data;
