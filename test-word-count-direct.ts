import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const DATABASE_URL = "postgresql://media-ops:Fcn4ehaxpbzE75GC@100.65.243.247:5432/media-ops";

async function testWordCountDistribution() {
  console.log("=== Testing Word Count Distribution ===\n");

  const client = postgres(DATABASE_URL);
  const db = drizzle(client);

  try {
    // 1. Get admin user ID
    const adminResult = await client`
      SELECT id FROM users WHERE username = 'admin' LIMIT 1
    `;

    if (adminResult.length === 0) {
      console.log("Admin user not found");
      return;
    }

    const adminId = adminResult[0].id;
    console.log(`Admin user ID: ${adminId}\n`);

    // 2. Get all word_count values
    const wordCountData = await client`
      SELECT id, word_count, source_title
      FROM style_analyses
      WHERE user_id = ${adminId}
        AND deleted_at IS NULL
        AND word_count IS NOT NULL
      ORDER BY word_count
    `;

    console.log(`Total records with word_count: ${wordCountData.length}\n`);

    // 3. Extract word counts
    const wordCounts = wordCountData
      .map((m) => m.word_count ?? 0)
      .filter((wc) => wc > 0);

    if (wordCounts.length === 0) {
      console.log("No word count data found");
      return;
    }

    console.log("Word count statistics:");
    console.log(`  Min: ${Math.min(...wordCounts)}`);
    console.log(`  Max: ${Math.max(...wordCounts)}`);
    console.log(`  Average: ${(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length).toFixed(2)}`);
    console.log(`  Count: ${wordCounts.length}\n`);

    // 4. Calculate histogram (same logic as frontend)
    const min = Math.min(...wordCounts);
    const max = Math.max(...wordCounts);
    const binCount = 10;
    const binSize = Math.max(Math.ceil((max - min) / binCount), 100);

    console.log("Histogram parameters:");
    console.log(`  Bin count: ${binCount}`);
    console.log(`  Bin size: ${binSize}`);
    console.log(`  Range: ${min} - ${max}\n`);

    console.log("Distribution:");
    const bins = Array.from({ length: binCount }, (_, i) => {
      const rangeStart = min + i * binSize;
      const rangeEnd = Math.min((i + 1) * binSize, max);
      const count = wordCounts.filter(
        (wc) => wc >= rangeStart && wc < rangeEnd
      ).length;

      return {
        range: `${rangeStart} - ${rangeEnd}`,
        count,
      };
    });

    bins.forEach((bin, index) => {
      console.log(`  Bin ${index + 1}: ${bin.range.padEnd(20)} → ${bin.count} records`);
    });

    console.log("\n=== Sample word counts (first 10) ===");
    wordCountData.slice(0, 10).forEach((item) => {
      console.log(`  ${item.word_count?.toString().padStart(5)} - ${item.source_title?.slice(0, 40) ?? "Untitled"}`);
    });

  } finally {
    await client.end();
  }
}

testWordCountDistribution().catch(console.error);
