import { eq, desc, and, isNull, isNotNull, sql, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { tasks, taskExecutions, users, styleAnalyses, articleEmbeddings } from "@/server/db/schema";
import { embeddingService } from "./embedding.service";

// ==================== Types ====================

export interface PublishedArticle {
  id: string;
  topic: string;
  keywords: string | null;
  coverUrl: string | null;
  createdAt: Date;
  // Execution data
  executionId: string | null;
  articleMarkdown: string | null;
  articleHtml: string | null;
  articleTitle: string | null;
  articleSubtitle: string | null;
  wechatMediaInfo?: unknown | null;
}

export interface ArticleListItem {
  id: string;
  topic: string;
  keywords: string | null;
  coverUrl: string | null;
  createdAt: Date;
  // Article title/subtitle from execution
  articleTitle: string | null;
  articleSubtitle: string | null;
  // Preview excerpt
  excerpt: string | null;
  authorName: string;
  readingTimeMinutes: number;
  articleWordCount: number;
  styleName: string | null;
  primaryType: string | null;
}

export interface GetPublishedInput {
  page: number;
  pageSize: number;
  search?: string;
  searchMode?: "text" | "vector" | "hybrid"; // default: hybrid
}

// ==================== Helper Functions ====================

function extractExcerpt(markdown: string | null, maxLength = 150): string | null {
  if (!markdown) return null;
  // Remove markdown syntax and get plain text
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

  if (plainText.length <= maxLength) return plainText;
  return plainText.slice(0, maxLength).trim() + "...";
}

function estimateReadingTime(markdown: string | null): number {
  if (!markdown) return 0;
  // Chinese reading speed: ~400-500 chars/min
  // Average word count estimation
  const charCount = markdown.replace(/\s/g, "").length;
  return Math.ceil(charCount / 400);
}

export function countArticleWords(markdown: string | null): number {
  if (!markdown) return 0;
  return markdown.replace(/\s/g, "").length;
}

// ==================== Service ====================

export const articleService = {
  /**
   * Get list of published articles (completed tasks with articles)
   * Supports text search, vector search, or hybrid search
   */
  async getPublished(input: GetPublishedInput): Promise<{ items: ArticleListItem[]; total: number; searchMode?: string }> {
    const { page, pageSize, search, searchMode = "hybrid" } = input;
    const offset = (page - 1) * pageSize;

    // If no search query, use regular listing
    if (!search || search.trim().length === 0) {
      return this.getPublishedWithoutSearch(page, pageSize);
    }

    // Determine actual search mode
    let actualMode = searchMode;

    // Check if vector search is available (has OpenAI key and embeddings exist)
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    if (!hasOpenAIKey && (searchMode === "vector" || searchMode === "hybrid")) {
      actualMode = "text"; // Fallback to text-only
    }

    if (actualMode === "vector") {
      return this.vectorSearch(search, page, pageSize);
    } else if (actualMode === "hybrid") {
      return this.hybridSearch(search, page, pageSize);
    } else {
      return this.textSearch(search, page, pageSize);
    }
  },

  /**
   * Regular listing without search
   */
  async getPublishedWithoutSearch(page: number, pageSize: number): Promise<{ items: ArticleListItem[]; total: number }> {
    try {
      const offset = (page - 1) * pageSize;

      // Use DISTINCT ON to get only the latest execution per task
      const latestExecutions = db
        .selectDistinctOn([taskExecutions.taskId], {
          taskId: taskExecutions.taskId,
          executionId: taskExecutions.id,
          articleMarkdown: taskExecutions.articleMarkdown,
          articleTitle: taskExecutions.articleTitle,
          articleSubtitle: taskExecutions.articleSubtitle,
          coverUrl: sql<string>`
            CASE
              WHEN jsonb_typeof(${taskExecutions.wechatMediaInfo}) = 'array' THEN
                (
                  select elem->>'r2_url'
                  from jsonb_array_elements(${taskExecutions.wechatMediaInfo}) elem
                  order by elem->>'uploaded_at' desc nulls last
                  limit 1
                )
              WHEN jsonb_typeof(${taskExecutions.wechatMediaInfo}) = 'object' THEN
                ${taskExecutions.wechatMediaInfo}->>'r2_url'
              ELSE NULL
            END
          `.as("cover_url"),
          startedAt: taskExecutions.startedAt,
        })
        .from(taskExecutions)
        .where(
          and(
            eq(taskExecutions.status, "completed"),
            isNotNull(taskExecutions.articleMarkdown)
          )
        )
        .orderBy(taskExecutions.taskId, desc(taskExecutions.startedAt))
        .as("latest_exec");

      const conditions = [
        eq(tasks.status, "completed"),
        isNull(tasks.deletedAt)
      ];

      const articlesQuery = db
        .select({
          id: tasks.id,
          topic: tasks.topic,
          keywords: tasks.keywords,
          createdAt: tasks.createdAt,
          coverUrl: latestExecutions.coverUrl,
          articleMarkdown: latestExecutions.articleMarkdown,
          articleTitle: latestExecutions.articleTitle,
          articleSubtitle: latestExecutions.articleSubtitle,
          authorName: users.name,
          authorUsername: users.username,
          styleName: styleAnalyses.styleName,
          primaryType: styleAnalyses.primaryType,
        })
        .from(tasks)
        .innerJoin(latestExecutions, eq(tasks.id, latestExecutions.taskId))
        .leftJoin(users, eq(tasks.userId, users.id))
        .leftJoin(styleAnalyses, eq(tasks.refMaterialId, styleAnalyses.id))
        .where(and(...conditions))
        .orderBy(desc(tasks.createdAt))
        .limit(pageSize)
        .offset(offset);

      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(tasks)
        .innerJoin(latestExecutions, eq(tasks.id, latestExecutions.taskId))
        .where(and(...conditions));

      const [articles, countResult] = await Promise.all([articlesQuery, countQuery]);

      return {
        items: this.mapArticles(articles),
        total: Number(countResult[0]?.count ?? 0),
      };
    } catch (error) {
      console.error("[articleService.getPublishedWithoutSearch] Query failed:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      throw new Error(`Failed to fetch published articles: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Text-based search using ILIKE
   */
  async textSearch(search: string, page: number, pageSize: number): Promise<{ items: ArticleListItem[]; total: number; searchMode: string }> {
    const offset = (page - 1) * pageSize;
    const searchPattern = `%${search}%`;

    // Use DISTINCT ON to get only the latest execution per task
    const latestExecutions = db
      .selectDistinctOn([taskExecutions.taskId], {
        taskId: taskExecutions.taskId,
        executionId: taskExecutions.id,
        articleMarkdown: taskExecutions.articleMarkdown,
        articleTitle: taskExecutions.articleTitle,
        articleSubtitle: taskExecutions.articleSubtitle,
        coverUrl: sql<string>`
          (
            select elem->>'r2_url'
            from jsonb_array_elements(
              case when jsonb_typeof(${taskExecutions.wechatMediaInfo}) = 'array'
                   then ${taskExecutions.wechatMediaInfo}
                   else '[]'::jsonb
              end
            ) elem
            order by elem->>'uploaded_at' desc nulls last
            limit 1
          )
        `.as("cover_url"),
        startedAt: taskExecutions.startedAt,
      })
      .from(taskExecutions)
      .where(
        and(
          eq(taskExecutions.status, "completed"),
          isNotNull(taskExecutions.articleMarkdown)
        )
      )
      .orderBy(taskExecutions.taskId, desc(taskExecutions.startedAt))
      .as("latest_exec");

    const conditions = [
      eq(tasks.status, "completed"),
      isNull(tasks.deletedAt),
      sql`(${tasks.topic} ILIKE ${searchPattern} OR ${tasks.keywords} ILIKE ${searchPattern} OR ${latestExecutions.articleMarkdown} ILIKE ${searchPattern})`
    ];

    const articlesQuery = db
      .select({
        id: tasks.id,
        topic: tasks.topic,
        keywords: tasks.keywords,
        createdAt: tasks.createdAt,
        coverUrl: latestExecutions.coverUrl,
        articleMarkdown: latestExecutions.articleMarkdown,
        articleTitle: latestExecutions.articleTitle,
        articleSubtitle: latestExecutions.articleSubtitle,
        authorName: users.name,
        authorUsername: users.username,
        styleName: styleAnalyses.styleName,
        primaryType: styleAnalyses.primaryType,
      })
      .from(tasks)
      .innerJoin(latestExecutions, eq(tasks.id, latestExecutions.taskId))
      .leftJoin(users, eq(tasks.userId, users.id))
      .leftJoin(styleAnalyses, eq(tasks.refMaterialId, styleAnalyses.id))
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt))
      .limit(pageSize)
      .offset(offset);

    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .innerJoin(latestExecutions, eq(tasks.id, latestExecutions.taskId))
      .where(and(...conditions));

    const [articles, countResult] = await Promise.all([articlesQuery, countQuery]);

    return {
      items: this.mapArticles(articles),
      total: Number(countResult[0]?.count ?? 0),
      searchMode: "text",
    };
  },

  /**
   * Vector-based semantic search
   */
  async vectorSearch(search: string, page: number, pageSize: number): Promise<{ items: ArticleListItem[]; total: number; searchMode: string }> {
    try {
      // Get vector search results with pagination
      const vectorResults = await embeddingService.searchByVector(search, pageSize * page, 0.3);

      if (vectorResults.length === 0) {
        return { items: [], total: 0, searchMode: "vector" };
      }

      // Paginate the results
      const paginatedResults = vectorResults.slice((page - 1) * pageSize, page * pageSize);
      const taskIds = paginatedResults.map(r => r.taskId);

      // Fetch article details for the matching tasks (use DISTINCT ON to avoid duplicates)
      const latestExecutions = db
        .selectDistinctOn([taskExecutions.taskId], {
          taskId: taskExecutions.taskId,
          executionId: taskExecutions.id,
          articleMarkdown: taskExecutions.articleMarkdown,
          articleTitle: taskExecutions.articleTitle,
          articleSubtitle: taskExecutions.articleSubtitle,
          coverUrl: sql<string>`
            CASE
              WHEN jsonb_typeof(${taskExecutions.wechatMediaInfo}) = 'array' THEN
                (
                  select elem->>'r2_url'
                  from jsonb_array_elements(${taskExecutions.wechatMediaInfo}) elem
                  order by elem->>'uploaded_at' desc nulls last
                  limit 1
                )
              WHEN jsonb_typeof(${taskExecutions.wechatMediaInfo}) = 'object' THEN
                ${taskExecutions.wechatMediaInfo}->>'r2_url'
              ELSE NULL
            END
          `.as("cover_url"),
        })
        .from(taskExecutions)
        .where(
          and(
            eq(taskExecutions.status, "completed"),
            isNotNull(taskExecutions.articleMarkdown)
          )
        )
        .orderBy(taskExecutions.taskId, desc(taskExecutions.startedAt))
        .as("latest_exec");

      const articles = await db
        .select({
          id: tasks.id,
          topic: tasks.topic,
          keywords: tasks.keywords,
          createdAt: tasks.createdAt,
          coverUrl: latestExecutions.coverUrl,
          articleMarkdown: latestExecutions.articleMarkdown,
          articleTitle: latestExecutions.articleTitle,
          articleSubtitle: latestExecutions.articleSubtitle,
          authorName: users.name,
          authorUsername: users.username,
          styleName: styleAnalyses.styleName,
          primaryType: styleAnalyses.primaryType,
        })
        .from(tasks)
        .innerJoin(latestExecutions, eq(tasks.id, latestExecutions.taskId))
        .leftJoin(users, eq(tasks.userId, users.id))
        .leftJoin(styleAnalyses, eq(tasks.refMaterialId, styleAnalyses.id))
        .where(inArray(tasks.id, taskIds));

      // Sort by vector similarity order
      const sortedArticles = taskIds
        .map(id => articles.find(a => a.id === id))
        .filter((a): a is NonNullable<typeof a> => a !== undefined);

      return {
        items: this.mapArticles(sortedArticles),
        total: vectorResults.length,
        searchMode: "vector",
      };
    } catch (error) {
      console.error("Vector search failed, falling back to text search:", error);
      return this.textSearch(search, page, pageSize);
    }
  },

  /**
   * Hybrid search: combines text and vector results
   */
  async hybridSearch(search: string, page: number, pageSize: number): Promise<{ items: ArticleListItem[]; total: number; searchMode: string }> {
    try {
      // Run both searches in parallel
      const [textResults, vectorResults] = await Promise.all([
        this.textSearch(search, 1, 50), // Get top 50 text matches
        embeddingService.searchByVector(search, 50, 0.3).catch(() => []), // Get top 50 vector matches
      ]);

      // Merge and deduplicate results
      const scoreMap = new Map<string, { textScore: number; vectorScore: number }>();

      // Assign text scores (position-based)
      textResults.items.forEach((item, index) => {
        scoreMap.set(item.id, {
          textScore: 1 - (index / textResults.items.length) * 0.5, // 0.5-1.0
          vectorScore: 0,
        });
      });

      // Add/update vector scores
      vectorResults.forEach((result) => {
        const existing = scoreMap.get(result.taskId);
        if (existing) {
          existing.vectorScore = result.similarity;
        } else {
          scoreMap.set(result.taskId, {
            textScore: 0,
            vectorScore: result.similarity,
          });
        }
      });

      // Calculate combined score (weighted average)
      const TEXT_WEIGHT = 0.4;
      const VECTOR_WEIGHT = 0.6;

      const sortedIds = Array.from(scoreMap.entries())
        .map(([id, scores]) => ({
          id,
          combinedScore: scores.textScore * TEXT_WEIGHT + scores.vectorScore * VECTOR_WEIGHT,
        }))
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .map(item => item.id);

      // Paginate
      const paginatedIds = sortedIds.slice((page - 1) * pageSize, page * pageSize);

      if (paginatedIds.length === 0) {
        return { items: [], total: 0, searchMode: "hybrid" };
      }

      // Fetch article details (use DISTINCT ON to avoid duplicates)
      const latestExecutions = db
        .selectDistinctOn([taskExecutions.taskId], {
          taskId: taskExecutions.taskId,
          executionId: taskExecutions.id,
          articleMarkdown: taskExecutions.articleMarkdown,
          articleTitle: taskExecutions.articleTitle,
          articleSubtitle: taskExecutions.articleSubtitle,
          coverUrl: sql<string>`
            CASE
              WHEN jsonb_typeof(${taskExecutions.wechatMediaInfo}) = 'array' THEN
                (
                  select elem->>'r2_url'
                  from jsonb_array_elements(${taskExecutions.wechatMediaInfo}) elem
                  order by elem->>'uploaded_at' desc nulls last
                  limit 1
                )
              WHEN jsonb_typeof(${taskExecutions.wechatMediaInfo}) = 'object' THEN
                ${taskExecutions.wechatMediaInfo}->>'r2_url'
              ELSE NULL
            END
          `.as("cover_url"),
        })
        .from(taskExecutions)
        .where(
          and(
            eq(taskExecutions.status, "completed"),
            isNotNull(taskExecutions.articleMarkdown)
          )
        )
        .orderBy(taskExecutions.taskId, desc(taskExecutions.startedAt))
        .as("latest_exec");

      const articles = await db
        .select({
          id: tasks.id,
          topic: tasks.topic,
          keywords: tasks.keywords,
          createdAt: tasks.createdAt,
          coverUrl: latestExecutions.coverUrl,
          articleMarkdown: latestExecutions.articleMarkdown,
          articleTitle: latestExecutions.articleTitle,
          articleSubtitle: latestExecutions.articleSubtitle,
          authorName: users.name,
          authorUsername: users.username,
          styleName: styleAnalyses.styleName,
          primaryType: styleAnalyses.primaryType,
        })
        .from(tasks)
        .innerJoin(latestExecutions, eq(tasks.id, latestExecutions.taskId))
        .leftJoin(users, eq(tasks.userId, users.id))
        .leftJoin(styleAnalyses, eq(tasks.refMaterialId, styleAnalyses.id))
        .where(inArray(tasks.id, paginatedIds));

      // Sort by combined score order
      const sortedArticles = paginatedIds
        .map(id => articles.find(a => a.id === id))
        .filter((a): a is NonNullable<typeof a> => a !== undefined);

      return {
        items: this.mapArticles(sortedArticles),
        total: sortedIds.length,
        searchMode: "hybrid",
      };
    } catch (error) {
      console.error("Hybrid search failed, falling back to text search:", error);
      return this.textSearch(search, page, pageSize);
    }
  },

  /**
   * Map database results to ArticleListItem
   */
  mapArticles(articles: Array<{
    id: string;
    topic: string;
    keywords: string | null;
    createdAt: Date;
    coverUrl: string | null;
    articleMarkdown: string | null;
    articleTitle: string | null;
    articleSubtitle: string | null;
    authorName: string | null;
    authorUsername: string | null;
    styleName: string | null;
    primaryType: string | null;
  }>): ArticleListItem[] {
    return articles.map((article) => ({
      id: article.id,
      topic: article.topic,
      keywords: article.keywords,
      coverUrl: article.coverUrl,
      createdAt: article.createdAt,
      articleTitle: article.articleTitle ?? null,
      articleSubtitle: article.articleSubtitle ?? null,
      excerpt: extractExcerpt(article.articleMarkdown),
      authorName: article.authorName ?? article.authorUsername ?? "系统",
      readingTimeMinutes: estimateReadingTime(article.articleMarkdown),
      articleWordCount: countArticleWords(article.articleMarkdown),
      styleName: article.styleName ?? null,
      primaryType: article.primaryType ?? null,
    }));
  },

  /**
   * Get single article by task ID
   */
  async getByTaskId(taskId: string): Promise<PublishedArticle | null> {
    // Get task with latest completed execution
    const result = await db
      .select({
        id: tasks.id,
        topic: tasks.topic,
        keywords: tasks.keywords,
        createdAt: tasks.createdAt,
        executionId: taskExecutions.id,
        articleMarkdown: taskExecutions.articleMarkdown,
        articleHtml: taskExecutions.articleHtml,
        articleTitle: taskExecutions.articleTitle,
        articleSubtitle: taskExecutions.articleSubtitle,
        coverUrl: sql<string>`
          CASE
            WHEN jsonb_typeof(${taskExecutions.wechatMediaInfo}) = 'array' THEN
              (
                select elem->>'r2_url'
                from jsonb_array_elements(${taskExecutions.wechatMediaInfo}) elem
                order by elem->>'uploaded_at' desc nulls last
                limit 1
              )
            WHEN jsonb_typeof(${taskExecutions.wechatMediaInfo}) = 'object' THEN
              ${taskExecutions.wechatMediaInfo}->>'r2_url'
            ELSE NULL
          END
        `,
        wechatMediaInfo: taskExecutions.wechatMediaInfo,
      })
      .from(tasks)
      .innerJoin(taskExecutions, eq(tasks.id, taskExecutions.taskId))
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.status, "completed"),
          eq(taskExecutions.status, "completed"),
          isNotNull(taskExecutions.articleMarkdown),
          isNull(tasks.deletedAt)
        )
      )
      .orderBy(desc(taskExecutions.startedAt))
      .limit(1);

    if (result.length === 0) return null;

    const row = result[0]!;
    return {
      id: row.id,
      topic: row.topic,
      keywords: row.keywords,
      coverUrl: row.coverUrl,
      createdAt: row.createdAt,
      executionId: row.executionId,
      articleMarkdown: row.articleMarkdown,
      articleHtml: row.articleHtml,
      articleTitle: row.articleTitle,
      articleSubtitle: row.articleSubtitle,
      wechatMediaInfo: row.wechatMediaInfo,
    };
  },

  /**
   * Get reading time estimate for an article
   */
  getReadingTime(markdown: string | null): number {
    return estimateReadingTime(markdown);
  },
};

export type ArticleService = typeof articleService;
