import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    N8N_WEBHOOK_URL: z.string().url().optional(),
    N8N_REVERSE_WEBHOOK_URL: z.string().url().optional(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
    N8N_REVERSE_WEBHOOK_URL: process.env.N8N_REVERSE_WEBHOOK_URL,
    NODE_ENV: process.env.NODE_ENV,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
