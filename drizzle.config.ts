import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// 强制覆盖环境变量（优先级：.env.local > .env）
config({ path: ".env.local", override: true });
config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in .env.local or .env");
}

export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  tablesFilter: ["*"],
});
