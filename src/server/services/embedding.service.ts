import { eq, sql, and, isNull, desc } from "drizzle-orm";
import { createHash } from "crypto";
import OpenAI from "openai";
import { env } from "@/env";
import { db } from "@/server/db";
import { articleEmbeddings, taskExecutions, tasks } from "@/server/db/schema";

// ==================== Types ====================

export interface GenerateEmbeddingInput {
  executionId: string;
  taskId: string;
  content: string;
}

export interface VectorSearchResult {
  taskId: string;
  executionId: string;
  similarity: number;
}

// ==================== Constants ====================

const EMBEDDING_MODEL = env.EMBEDDING_MODEL;
const EMBEDDING_DIMENSIONS = EMBEDDING_MODEL === "text-embedding-v3" ? 1024 : 1536;
const MAX_CONTENT_LENGTH = 8000; // ~2000 tokens for Chinese

// ==================== Helper Functions ====================

/**
 * Create content hash for deduplication
 */
function createContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 32);
}

/**
 * Prepare content for embedding (clean and truncate)
 */
export function prepareArticleEmbeddingContent(
  markdown: string | null,
  topic: string,
  keywords: string | null
): string {
  if (!markdown) return topic;

  // Remove markdown syntax for cleaner embedding
  const plainText = markdown
    .replace(/^#+\s+/gm, "") // Remove headers
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold
    .replace(/\*([^*]+)\*/g, "$1") // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "") // Remove images
    .replace(/`[^`]+`/g, "") // Remove inline code
    .replace(/```[\s\S]*?```/g, "") // Remove code blocks
    .replace(/>\s+/g, "") // Remove blockquotes
    .replace(/-\s+/g, "") // Remove list items
    .replace(/\n+/g, " ") // Replace newlines with space
    .trim();

  // Combine topic, keywords, and content
  const parts = [
    `标题: ${topic}`,
    keywords ? `关键词: ${keywords}` : "",
    `内容: ${plainText}`,
  ].filter(Boolean);

  const combined = parts.join("\n");

  // Truncate if too long
  if (combined.length > MAX_CONTENT_LENGTH) {
    return combined.slice(0, MAX_CONTENT_LENGTH) + "...";
  }

  return combined;
}

// ==================== Service ====================

export const embeddingService = {
  /**
   * Get OpenAI client (lazy initialization)
   */
  getOpenAIClient(): OpenAI {
    const apiKey = env.EMBEDDING_API_KEY;
    if (!apiKey) {
      throw new Error("EMBEDDING_API_KEY environment variable is not set");
    }
    return new OpenAI({ apiKey, baseURL: env.EMBEDDING_API_URL });
  },

  /**
   * Generate embedding vector for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const openai = this.getOpenAIClient();

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data[0]!.embedding;
  },

  /**
   * Generate and store embedding for an article execution
   */
  async generateAndStoreEmbedding(input: GenerateEmbeddingInput): Promise<{ id: string }> {
    const { executionId, taskId, content } = input;

    const contentHash = createContentHash(content);

    // Check if embedding already exists with same content
    const existing = await db
      .select({ id: articleEmbeddings.id })
      .from(articleEmbeddings)
      .where(
        and(
          eq(articleEmbeddings.executionId, executionId),
          eq(articleEmbeddings.contentHash, contentHash)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return { id: existing[0]!.id };
    }

    // Generate new embedding
    const embedding = await this.generateEmbedding(content);

    // Upsert (delete old if exists, then insert new)
    await db
      .delete(articleEmbeddings)
      .where(eq(articleEmbeddings.executionId, executionId));

    const [result] = await db
      .insert(articleEmbeddings)
      .values({
        executionId,
        taskId,
        embedding,
        contentHash,
        modelVersion: EMBEDDING_MODEL,
      })
      .returning({ id: articleEmbeddings.id });

    return { id: result!.id };
  },

  /**
   * Generate embeddings for all articles that don't have one
   */
  async generateMissingEmbeddings(limit = 50): Promise<{ processed: number; errors: number }> {
    // Find executions without embeddings
    const executionsWithoutEmbeddings = await db
      .select({
        executionId: taskExecutions.id,
        taskId: taskExecutions.taskId,
        articleMarkdown: taskExecutions.articleMarkdown,
        topic: tasks.topic,
        keywords: tasks.keywords,
      })
      .from(taskExecutions)
      .innerJoin(tasks, eq(taskExecutions.taskId, tasks.id))
      .leftJoin(articleEmbeddings, eq(taskExecutions.id, articleEmbeddings.executionId))
      .where(
        and(
          eq(taskExecutions.status, "completed"),
          sql`${taskExecutions.articleMarkdown} IS NOT NULL`,
          isNull(articleEmbeddings.id),
          isNull(tasks.deletedAt)
        )
      )
      .orderBy(desc(taskExecutions.startedAt))
      .limit(limit);

    let processed = 0;
    let errors = 0;

    for (const execution of executionsWithoutEmbeddings) {
      try {
        const content = prepareArticleEmbeddingContent(
          execution.articleMarkdown,
          execution.topic,
          execution.keywords
        );

        await this.generateAndStoreEmbedding({
          executionId: execution.executionId,
          taskId: execution.taskId,
          content,
        });

        processed++;
      } catch (error) {
        console.error(`Failed to generate embedding for execution ${execution.executionId}:`, error);
        errors++;
      }
    }

    return { processed, errors };
  },

  /**
   * Search articles by vector similarity
   */
  async searchByVector(
    queryText: string,
    limit = 10,
    minSimilarity = 0.5
  ): Promise<VectorSearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(queryText);
    const vectorString = `[${queryEmbedding.join(",")}]`;

    // Use cosine similarity: 1 - cosine_distance
    const results = await db.execute(sql`
      SELECT
        ae.task_id,
        ae.execution_id,
        1 - (ae.embedding <=> ${vectorString}::vector) as similarity
      FROM article_embeddings ae
      INNER JOIN tasks t ON ae.task_id = t.id
      WHERE t.deleted_at IS NULL
        AND t.status = 'completed'
        AND 1 - (ae.embedding <=> ${vectorString}::vector) >= ${minSimilarity}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `);

    return (results as unknown as Array<{ task_id: string; execution_id: string; similarity: number }>).map((row) => ({
      taskId: row.task_id,
      executionId: row.execution_id,
      similarity: Number(row.similarity),
    }));
  },

  /**
   * Delete embedding for an execution
   */
  async deleteEmbedding(executionId: string): Promise<void> {
    await db
      .delete(articleEmbeddings)
      .where(eq(articleEmbeddings.executionId, executionId));
  },

  /**
   * Get embedding stats
   */
  async getStats(): Promise<{ total: number; withEmbeddings: number; withoutEmbeddings: number }> {
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(taskExecutions)
      .where(
        and(
          eq(taskExecutions.status, "completed"),
          sql`${taskExecutions.articleMarkdown} IS NOT NULL`
        )
      );

    const [withEmbeddingsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(articleEmbeddings);

    const total = Number(totalResult?.count ?? 0);
    const withEmbeddings = Number(withEmbeddingsResult?.count ?? 0);

    return {
      total,
      withEmbeddings,
      withoutEmbeddings: total - withEmbeddings,
    };
  },
};

export type EmbeddingService = typeof embeddingService;
