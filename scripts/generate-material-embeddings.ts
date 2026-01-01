import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env before any other imports
dotenv.config({ path: resolve(__dirname, "../.env") });

// Now import the rest
import { eq, desc, and, sql, isNull } from "drizzle-orm";
import { createHash } from "crypto";
import OpenAI from "openai";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/server/db/schema";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

// Embedding config
const getEmbeddingConfig = () => ({
  apiUrl: process.env.EMBEDDING_API_URL ?? "https://api.openai.com/v1",
  apiKey: process.env.EMBEDDING_API_KEY ?? "",
  model: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
});

const EMBEDDING_DIMENSIONS = 1024;
const MAX_CONTENT_LENGTH = 8000;

function createContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 32);
}

function prepareEmbeddingContent(analysis: schema.StyleAnalysis): string {
  const parts: string[] = [];

  if (analysis.sourceTitle) {
    parts.push(`标题: ${analysis.sourceTitle}`);
  }
  if (analysis.styleName) {
    parts.push(`风格: ${analysis.styleName}`);
  }
  if (analysis.primaryType) {
    parts.push(`类型: ${analysis.primaryType}`);
  }
  if (analysis.executionPrompt) {
    parts.push(`提示词: ${analysis.executionPrompt}`);
  }

  const styleIdentity = analysis.styleIdentityData as { persona_description?: string } | null;
  if (styleIdentity?.persona_description) {
    parts.push(`人设: ${styleIdentity.persona_description}`);
  }

  const combined = parts.join("\n");
  if (combined.length > MAX_CONTENT_LENGTH) {
    return combined.slice(0, MAX_CONTENT_LENGTH) + "...";
  }
  return combined;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const config = getEmbeddingConfig();
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.apiUrl,
  });

  const response = await client.embeddings.create({
    model: config.model,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data[0]!.embedding;
}

async function main() {
  console.log("开始生成素材 embeddings...\n");
  console.log(`API URL: ${getEmbeddingConfig().apiUrl}`);
  console.log(`Model: ${getEmbeddingConfig().model}\n`);

  // Get stats
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.styleAnalyses)
    .where(
      and(
        eq(schema.styleAnalyses.status, "SUCCESS"),
        isNull(schema.styleAnalyses.deletedAt)
      )
    );

  const [withEmbeddingsResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.styleAnalyses)
    .where(
      and(
        eq(schema.styleAnalyses.status, "SUCCESS"),
        isNull(schema.styleAnalyses.deletedAt),
        sql`${schema.styleAnalyses.embedding} IS NOT NULL`
      )
    );

  const total = Number(totalResult?.count ?? 0);
  const withEmbeddings = Number(withEmbeddingsResult?.count ?? 0);
  const withoutEmbeddings = total - withEmbeddings;

  console.log(`总素材数: ${total}`);
  console.log(`已有 embedding: ${withEmbeddings}`);
  console.log(`待生成: ${withoutEmbeddings}\n`);

  if (withoutEmbeddings === 0) {
    console.log("所有素材已有 embedding，无需生成。");
    await pool.end();
    process.exit(0);
  }

  // Find analyses without embeddings
  const analysesWithoutEmbeddings = await db
    .select()
    .from(schema.styleAnalyses)
    .where(
      and(
        eq(schema.styleAnalyses.status, "SUCCESS"),
        isNull(schema.styleAnalyses.embedding),
        isNull(schema.styleAnalyses.deletedAt)
      )
    )
    .orderBy(desc(schema.styleAnalyses.createdAt))
    .limit(50);

  let processed = 0;
  let errors = 0;

  for (const analysis of analysesWithoutEmbeddings) {
    try {
      const content = prepareEmbeddingContent(analysis);
      if (!content || content.length < 10) {
        console.log(`跳过 ${analysis.id}: 内容不足`);
        continue;
      }

      const contentHash = createContentHash(content);
      console.log(`生成 ${analysis.id} (${analysis.sourceTitle?.slice(0, 30)}...)...`);

      const embedding = await generateEmbedding(content);

      await db
        .update(schema.styleAnalyses)
        .set({
          embedding,
          embeddingContentHash: contentHash,
          embeddingModelVersion: getEmbeddingConfig().model,
          updatedAt: new Date(),
        })
        .where(eq(schema.styleAnalyses.id, analysis.id));

      processed++;
      console.log(`  ✓ 完成`);
    } catch (error) {
      console.error(`  ✗ 失败:`, (error as Error).message);
      errors++;
    }
  }

  console.log(`\n生成完成:`);
  console.log(`  成功: ${processed}`);
  console.log(`  失败: ${errors}`);

  await pool.end();
  process.exit(0);
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
