import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    await client.connect();
    await client.query("CREATE EXTENSION IF NOT EXISTS vector");
    console.log("pgvector extension enabled successfully");
    await client.end();
  } catch (e) {
    console.error("Error:", (e as Error).message);
    process.exit(1);
  }
  process.exit(0);
}

main();
