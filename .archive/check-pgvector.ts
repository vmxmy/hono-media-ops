import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    await client.connect();

    // Check if vector extension exists
    const extResult = await client.query(`
      SELECT * FROM pg_extension WHERE extname = 'vector'
    `);
    console.log("pgvector extension installed:", extResult.rows.length > 0);

    // Check if article_embeddings table exists and has vector column
    const tableResult = await client.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'article_embeddings'
    `);
    console.log("\narticle_embeddings columns:");
    tableResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.udt_name}`);
    });

    await client.end();
  } catch (e) {
    console.error("Error:", (e as Error).message);
    process.exit(1);
  }
  process.exit(0);
}

main();
