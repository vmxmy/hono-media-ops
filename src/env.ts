import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    N8N_WRITING_WEBHOOK_URL: z.string().url().optional(),
    N8N_REVERSE_WEBHOOK_URL: z.string().url().optional(),
    N8N_WECHAT_PUBLISH_URL: z.string().url().optional(),
    N8N_XHS_IMAGE_WEBHOOK_URL: z.string().url().optional(),
    N8N_XHS_PUBLISH_WEBHOOK_URL: z.string().url().optional(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    // Encryption key for sensitive data (falls back to AUTH_SECRET)
    ENCRYPTION_KEY: z.string().min(32).optional(),

    // Embedding API configuration
    EMBEDDING_API_URL: z.string().url().default("https://api.openai.com/v1"),
    EMBEDDING_API_KEY: z.string().min(1).optional(),
    EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),

    // Storage configuration
    STORAGE_PROVIDER: z.enum(["r2", "s3", "local"]).default("local"),
    STORAGE_BUCKET: z.string().optional(),
    STORAGE_ACCESS_KEY_ID: z.string().optional(),
    STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
    STORAGE_PUBLIC_DOMAIN: z.string().optional(),

    // R2 specific
    R2_ACCOUNT_ID: z.string().optional(),

    // S3 specific
    S3_REGION: z.string().default("us-east-1"),
    S3_ENDPOINT: z.string().optional(),

    // Local storage
    LOCAL_UPLOAD_DIR: z.string().default("./public/uploads"),
    LOCAL_PUBLIC_PATH: z.string().default("/uploads"),
    LOCAL_UPLOAD_SECRET: z.string().min(32).optional(),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    N8N_WRITING_WEBHOOK_URL: process.env.N8N_WRITING_WEBHOOK_URL,
    N8N_REVERSE_WEBHOOK_URL: process.env.N8N_REVERSE_WEBHOOK_URL,
    N8N_WECHAT_PUBLISH_URL: process.env.N8N_WECHAT_PUBLISH_URL,
    N8N_XHS_IMAGE_WEBHOOK_URL: process.env.N8N_XHS_IMAGE_WEBHOOK_URL,
    N8N_XHS_PUBLISH_WEBHOOK_URL: process.env.N8N_XHS_PUBLISH_WEBHOOK_URL,
    NODE_ENV: process.env.NODE_ENV,

    // Encryption
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,

    // Embedding
    EMBEDDING_API_URL: process.env.EMBEDDING_API_URL,
    EMBEDDING_API_KEY: process.env.EMBEDDING_API_KEY,
    EMBEDDING_MODEL: process.env.EMBEDDING_MODEL,

    // Storage
    STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
    STORAGE_BUCKET: process.env.STORAGE_BUCKET,
    STORAGE_ACCESS_KEY_ID: process.env.STORAGE_ACCESS_KEY_ID,
    STORAGE_SECRET_ACCESS_KEY: process.env.STORAGE_SECRET_ACCESS_KEY,
    STORAGE_PUBLIC_DOMAIN: process.env.STORAGE_PUBLIC_DOMAIN,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    S3_REGION: process.env.S3_REGION,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    LOCAL_UPLOAD_DIR: process.env.LOCAL_UPLOAD_DIR,
    LOCAL_PUBLIC_PATH: process.env.LOCAL_PUBLIC_PATH,
    LOCAL_UPLOAD_SECRET: process.env.LOCAL_UPLOAD_SECRET,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
