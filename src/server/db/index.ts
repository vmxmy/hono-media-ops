import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

const client = postgres(env.DATABASE_URL, {
  prepare: false,
  max: 10,              // 最大连接数
  connect_timeout: 30,  // 连接超时增加到 30 秒（适应 serverless 冷启动）
  idle_timeout: 20,     // 空闲超时
  max_lifetime: 60 * 30,
});

export const db = drizzle(client, { schema });
