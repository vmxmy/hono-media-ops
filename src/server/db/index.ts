import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

/**
 * Database connection pool configuration
 *
 * For Vercel/serverless deployments:
 * - Each serverless function instance maintains its own connection pool
 * - Using max: 1 per instance to avoid connection exhaustion
 * - Connection pooling is handled at the platform level (e.g., Vercel Postgres, Neon)
 *
 * For traditional server deployments:
 * - Set DB_POOL_SIZE env var to adjust pool size
 * - Default max: 10 connections
 */
const isServerless = process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;

const client = postgres(env.DATABASE_URL, {
  prepare: false,
  // Serverless: 1 connection per instance; Traditional: configurable pool
  max: isServerless ? 1 : parseInt(process.env.DB_POOL_SIZE ?? "10", 10),
  // Reduced connect timeout for faster failure detection
  connect_timeout: isServerless ? 10 : 15,
  // Disable idle timeout in serverless (let platform manage lifecycle)
  idle_timeout: isServerless ? 0 : 60,
  // Max connection lifetime
  max_lifetime: 60 * 60, // 1 hour
});

export const db = drizzle(client, { schema });
