import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

import { db } from "./src/server/db";
import { styleAnalyses, users } from "./src/server/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

async function testWordCountDistribution() {
  console.log("=== Testing Word Count Distribution ===\n");

  // 1. Get admin user ID
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, "admin"))
    .limit(1);

  if (!admin) {
    console.log("Admin user not found");
    return;
  }

  console.log(`Admin user ID: ${admin.id}\n`);

  // 2. Get all word_count values
  const wordCountData = await db
    .select({
      id: styleAnalyses.id,
      wordCount: styleAnalyses.wordCount,
      sourceTitle: styleAnalyses.sourceTitle,
    })
    .from(styleAnalyses)
    .where(
      and(
        eq(styleAnalyses.userId, admin.id),
        isNull(styleAnalyses.deletedAt),
        sql`${styleAnalyses.wordCount} IS NOT NULL`
      )
    )
    .orderBy(styleAnalyses.wordCount);

  console.log(`Total records with word_count: ${wordCountData.length}\n`);

  // 3. Extract word counts
  const wordCounts = wordCountData
    .map((m) => m.wordCount ?? 0)
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
    console.log(`  ${item.wordCount?.toString().padStart(5)} - ${item.sourceTitle?.slice(0, 40) ?? "Untitled"}`);
  });

  process.exit(0);
}

testWordCountDistribution().catch(console.error);
