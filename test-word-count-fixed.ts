import postgres from "postgres";

const DATABASE_URL = "postgresql://media-ops:Fcn4ehaxpbzE75GC@100.65.243.247:5432/media-ops";

async function testWordCountDistribution() {
  console.log("=== Testing Word Count Distribution (FIXED) ===\n");

  const client = postgres(DATABASE_URL);

  try {
    // Get admin user ID
    const adminResult = await client`
      SELECT id FROM users WHERE username = 'admin' LIMIT 1
    `;

    if (adminResult.length === 0) {
      console.log("Admin user not found");
      return;
    }

    const adminId = adminResult[0].id;
    console.log(`Admin user ID: ${adminId}\n`);

    // Get all word_count values
    const wordCountData = await client`
      SELECT id, word_count, source_title
      FROM style_analyses
      WHERE user_id = ${adminId}
        AND deleted_at IS NULL
        AND word_count IS NOT NULL
      ORDER BY word_count
    `;

    console.log(`Total records: ${wordCountData.length}\n`);

    const wordCounts = wordCountData
      .map((m) => m.word_count ?? 0)
      .filter((wc) => wc > 0);

    if (wordCounts.length === 0) {
      console.log("No word count data");
      return;
    }

    const min = Math.min(...wordCounts);
    const max = Math.max(...wordCounts);
    const binCount = 10;
    const binSize = Math.max(Math.ceil((max - min) / binCount), 100);

    console.log("Statistics:");
    console.log(`  Min: ${min}, Max: ${max}, Avg: ${(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length).toFixed(2)}`);
    console.log(`  Bin size: ${binSize}\n`);

    console.log("=== WRONG (Current Frontend Logic) ===");
    const wrongBins = Array.from({ length: binCount }, (_, i) => {
      const rangeStart = min + i * binSize;
      const rangeEnd = Math.min((i + 1) * binSize, max); // BUG: Missing 'min +'
      const count = wordCounts.filter(
        (wc) => wc >= rangeStart && wc < rangeEnd
      ).length;

      return { range: `${rangeStart} - ${rangeEnd}`, count };
    });

    wrongBins.forEach((bin, i) => {
      console.log(`  Bin ${i + 1}: ${bin.range.padEnd(20)} → ${bin.count} records`);
    });

    console.log("\n=== CORRECT (Fixed Logic) ===");
    const correctBins = Array.from({ length: binCount }, (_, i) => {
      const rangeStart = min + i * binSize;
      const rangeEnd = Math.min(min + (i + 1) * binSize, max); // FIXED: Added 'min +'
      const count = wordCounts.filter(
        (wc) => wc >= rangeStart && wc < rangeEnd
      ).length;

      return { range: `${rangeStart} - ${rangeEnd}`, count };
    });

    correctBins.forEach((bin, i) => {
      console.log(`  Bin ${i + 1}: ${bin.range.padEnd(20)} → ${bin.count} records`);
    });

    // Verify all records are counted
    const totalWrong = wrongBins.reduce((sum, bin) => sum + bin.count, 0);
    const totalCorrect = correctBins.reduce((sum, bin) => sum + bin.count, 0);

    console.log(`\nTotal counted (wrong): ${totalWrong}/${wordCounts.length}`);
    console.log(`Total counted (correct): ${totalCorrect}/${wordCounts.length}`);

  } finally {
    await client.end();
  }
}

testWordCountDistribution().catch(console.error);
