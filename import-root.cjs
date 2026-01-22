#!/usr/bin/env node
const { readFileSync } = require('fs');
const { join } = require('path');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { wechatArticles } = require('./src/server/db/schema/tables/wechat-articles');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set in .env");
    process.exit(1);
  }

  const client = postgres(databaseUrl);
  const db = drizzle(client);

  const args = process.argv.slice(2);
  const jsonFileName = args[0] || "app/hono-media-ops/qianjie_coffee_articles_full.json";
  const jsonPath = join(process.cwd(), jsonFileName);

  let fakeid = null;
  let accountName = null;
  
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--fakeid') {
      fakeid = args[i + 1];
    } else if (args[i] === '--accountName') {
      accountName = args[i + 1];
    }
  }

  console.log(`Reading from: ${jsonPath}`);
  if (fakeid) console.log(`Using fakeid: ${fakeid}`);
  if (accountName) console.log(`Using accountName: ${accountName}`);

  try {
    const rawData = readFileSync(jsonPath, "utf-8");
    const articles = JSON.parse(rawData);

    const seenAids = new Set();
    const uniqueArticles = articles.filter((item) => {
      if (seenAids.has(item.aid)) return false;
      seenAids.add(item.aid);
      return true;
    });

    console.log(`Found ${articles.length} articles to import (${uniqueArticles.length} unique).`);

    const dataToInsert = uniqueArticles.map((item) => ({
      aid: item.aid,
      fakeid: fakeid || item.fakeid || null,
      accountName: accountName || item.accountName || null,
      title: item.title,
      link: item.link,
      cover: item.cover,
      digest: item.digest,
      authorName: item.author_name,
      updateTime: item.update_time,
      createTime: item.create_time,
      appmsgid: String(item.appmsgid),
      itemidx: item.itemidx,
      albumId: String(item.album_id),
    }));

    const chunkSize = 500;
    for (let i = 0; i < dataToInsert.length; i += chunkSize) {
      const chunk = dataToInsert.slice(i, i + chunkSize);
      console.log(`Inserting chunk ${Math.floor(i / chunkSize) + 1}...`);
      
      await db
        .insert(wechatArticles)
        .values(chunk)
        .onConflictDoUpdate({
          target: wechatArticles.aid,
          set: {
            title: wechatArticles.title,
            link: wechatArticles.link,
            cover: wechatArticles.cover,
            digest: wechatArticles.digest,
            updateTime: wechatArticles.updateTime,
            updatedAt: new Date(),
          },
        });
    }

    console.log("Import completed successfully!");
  } catch (error) {
    console.error("Error during import:", error);
  } finally {
    await client.end();
  }
}

main();
