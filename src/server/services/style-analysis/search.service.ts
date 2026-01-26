/**
 * Style Analysis Search Service
 * Handles vector search and hybrid search operations
 */

import { eq, and, sql, inArray, isNull, desc, getTableColumns } from "drizzle-orm";
import { createHash } from "crypto";
import OpenAI from "openai";
import { db } from "@/server/db";
import { styleAnalyses, pipelines, type StyleAnalysis } from "@/server/db/schema";
import { styleAnalysisCrudService } from "./crud.service";
import type { GetAllStyleAnalysesOptions } from "./types";
import { env } from "@/env";

// ==================== Embedding Config ====================

const getEmbeddingConfig = () => ({
  apiUrl: env.EMBEDDING_API_URL,
  apiKey: env.EMBEDDING_API_KEY,
  model: env.EMBEDDING_MODEL,
});

const EMBEDDING_DIMENSIONS = 1024;
const MAX_CONTENT_LENGTH = 8000; // ~2000 tokens for Chinese

// ==================== Search Service ====================

export const styleAnalysisSearchService = {
  /**
   * Get OpenAI-compatible client (lazy initialization)
   */
  getEmbeddingClient(): OpenAI {
    const config = getEmbeddingConfig();
    if (!config.apiKey) {
      throw new Error("EMBEDDING_API_KEY environment variable is not set");
    }
    return new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiUrl,
    });
  },

  /**
   * Create content hash for deduplication
   */
  createContentHash(content: string): string {
    return createHash("sha256").update(content).digest("hex").slice(0, 32);
  },

  /**
   * Prepare content for embedding from a style analysis record
   */
  prepareEmbeddingContent(analysis: StyleAnalysis): string {
    const parts: string[] = [];

    // 标题
    if (analysis.sourceTitle) {
      parts.push(`标题: ${analysis.sourceTitle}`);
    }

    // 风格名称
    if (analysis.styleName) {
      parts.push(`风格: ${analysis.styleName}`);
    }

    // 文章类型
    if (analysis.primaryType) {
      parts.push(`类型: ${analysis.primaryType}`);
    }

    // 执行提示词 (最重要的内容)
    if (analysis.executionPrompt) {
      parts.push(`提示词: ${analysis.executionPrompt}`);
    }

    // 风格身份描述
    const styleIdentity = analysis.styleIdentity;
    if (styleIdentity?.persona_description) {
      parts.push(`人设: ${styleIdentity.persona_description}`);
    }

    const combined = parts.join("\n");

    // Truncate if too long
    if (combined.length > MAX_CONTENT_LENGTH) {
      return combined.slice(0, MAX_CONTENT_LENGTH) + "...";
    }

    return combined;
  },

  /**
   * Generate embedding vector for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const client = this.getEmbeddingClient();
    const config = getEmbeddingConfig();

    const response = await client.embeddings.create({
      model: config.model,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data[0]!.embedding;
  },

  /**
   * Generate and store embedding for a style analysis
   */
  async generateAndStoreEmbedding(id: string): Promise<{ success: boolean; reason?: string }> {
    const analysis = await styleAnalysisCrudService.getById(id);
    if (!analysis) {
      return { success: false, reason: "Analysis not found" };
    }

    const content = this.prepareEmbeddingContent(analysis);
    if (!content || content.length < 10) {
      return { success: false, reason: "Not enough content for embedding" };
    }

    const contentHash = this.createContentHash(content);

    // Check if embedding already exists with same content
    if (analysis.embeddingContentHash === contentHash) {
      return { success: true, reason: "Embedding already up to date" };
    }

    // Generate new embedding
    const config = getEmbeddingConfig();
    const embedding = await this.generateEmbedding(content);

    // Update record with embedding
    await db
      .update(styleAnalyses)
      .set({
        embedding,
        embeddingContentHash: contentHash,
        embeddingModelVersion: config.model,
        updatedAt: new Date(),
      })
      .where(eq(styleAnalyses.id, id));

    return { success: true };
  },

  /**
   * Generate embeddings for all analyses that don't have one
   */
  async generateMissingEmbeddings(limit = 50): Promise<{ processed: number; errors: number }> {
    // Find analyses without embeddings
    const analysesWithoutEmbeddings = await db
      .select({
        id: styleAnalyses.id,
      })
      .from(styleAnalyses)
      .where(
        and(
          eq(styleAnalyses.status, "SUCCESS"),
          isNull(styleAnalyses.embedding),
          isNull(styleAnalyses.deletedAt)
        )
      )
      .orderBy(desc(styleAnalyses.createdAt))
      .limit(limit);

    let processed = 0;
    let errors = 0;

    for (const analysis of analysesWithoutEmbeddings) {
      try {
        const result = await this.generateAndStoreEmbedding(analysis.id);
        if (result.success) {
          processed++;
        } else {
          console.error(`Skipped embedding for ${analysis.id}: ${result.reason}`);
        }
      } catch (error) {
        console.error(`Failed to generate embedding for analysis ${analysis.id}:`, error);
        errors++;
      }
    }

    return { processed, errors };
  },

  /**
   * Search analyses by vector similarity
   */
  async searchByVector(
    queryText: string,
    userId: string,
    limit = 10,
    minSimilarity = 0.3
  ): Promise<Array<{ id: string; similarity: number }>> {
    const queryEmbedding = await this.generateEmbedding(queryText);

    // Validate embedding vector to prevent injection
    const validatedVector = queryEmbedding.map((value) => {
      if (typeof value !== "number" || !isFinite(value)) {
        throw new Error("Invalid embedding vector: contains non-numeric or infinite values");
      }
      return value;
    });

    const vectorString = `[${validatedVector.join(",")}]`;

    // Use cosine similarity: 1 - cosine_distance
    const results = await db.execute(sql`
      SELECT
        id,
        1 - (embedding <=> ${vectorString}::vector) as similarity
      FROM style_analyses
      WHERE deleted_at IS NULL
        AND user_id = ${userId}
        AND status = 'SUCCESS'
        AND embedding IS NOT NULL
        AND 1 - (embedding <=> ${vectorString}::vector) >= ${minSimilarity}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `);

    return (results as unknown as Array<{ id: string; similarity: number }>).map((row) => ({
      id: row.id,
      similarity: Number(row.similarity),
    }));
  },

  /**
   * Hybrid search: combine keyword and vector search
   * Returns same structure as getAll for compatibility
   */
  async hybridSearch(
    options: GetAllStyleAnalysesOptions & { useVectorSearch?: boolean }
  ) {
    const { search, userId, useVectorSearch = true, page = 1, pageSize = 20, sortMode } = options;
    const getAllOptions = { ...options, sortMode };

    // If no search query or vector search disabled, use regular getAll
    if (!search || !useVectorSearch || !userId) {
      return styleAnalysisCrudService.getAll(getAllOptions);
    }

    // Get vector search results
    let vectorResults: Array<{ id: string; similarity: number }> = [];
    try {
      vectorResults = await this.searchByVector(search, userId, 50, 0.3);
    } catch (error) {
      console.error("Vector search failed, falling back to keyword search:", error);
      // Fall back to keyword search if vector search fails
      return styleAnalysisCrudService.getAll(getAllOptions);
    }

    // If no vector results, fall back to keyword search
    if (vectorResults.length === 0) {
      return styleAnalysisCrudService.getAll(getAllOptions);
    }

    // Get full records for vector results
    const vectorIds = vectorResults.map((r) => r.id);
    const similarityMap = new Map(vectorResults.map((r) => [r.id, r.similarity]));

    const vectorRecords = await db
      .select({
        ...getTableColumns(styleAnalyses),
        useCount: sql<number>`(
          SELECT count(*)
          FROM ${pipelines}
          WHERE ${pipelines.styleAnalysisId} = "style_analyses"."id"
            AND ${pipelines.deletedAt} IS NULL
        )::int`.as("use_count"),
      })
      .from(styleAnalyses)
      .where(
        and(
          inArray(styleAnalyses.id, vectorIds),
          isNull(styleAnalyses.deletedAt)
        )
      );

    // Also get keyword search results
    const keywordResult = await styleAnalysisCrudService.getAll({ ...getAllOptions, pageSize: 50 });

    // Merge and dedupe results, prioritizing by combined score
    type RecordWithScore = typeof vectorRecords[number] & { score: number };
    const allResultsMap = new Map<string, RecordWithScore>();

    // Add vector results with similarity score
    for (const record of vectorRecords) {
      const similarity = similarityMap.get(record.id) ?? 0;
      allResultsMap.set(record.id, { ...record, score: similarity * 0.7 }); // Weight vector results
    }

    // Add keyword results with base score (need to fetch full records)
    const keywordIds = keywordResult.logs.map((r) => r.id);
    const keywordFullRecords = keywordIds.length > 0
      ? await db
          .select()
          .from(styleAnalyses)
          .where(inArray(styleAnalyses.id, keywordIds))
      : [];

    for (const record of keywordFullRecords) {
      const existing = allResultsMap.get(record.id);
      if (existing) {
        // Boost score if found in both
        existing.score += 0.3;
      } else {
        allResultsMap.set(record.id, { ...record, score: 0.3 }); // Base score for keyword match
      }
    }

    // Sort by score and apply pagination
    const allResults = Array.from(allResultsMap.values())
      .sort((a, b) => b.score - a.score);

    const total = allResults.length;
    const offset = (page - 1) * pageSize;
    const paginatedResults = allResults.slice(offset, offset + pageSize);

    // Remove score from results
    const logs = paginatedResults.map(({ score, ...record }) => record);

    return {
      logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  /**
   * Get embedding stats
   */
  async getEmbeddingStats(): Promise<{ total: number; withEmbeddings: number; withoutEmbeddings: number }> {
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(styleAnalyses)
      .where(
        and(
          eq(styleAnalyses.status, "SUCCESS"),
          isNull(styleAnalyses.deletedAt)
        )
      );

    const [withEmbeddingsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(styleAnalyses)
      .where(
        and(
          eq(styleAnalyses.status, "SUCCESS"),
          isNull(styleAnalyses.deletedAt),
          sql`${styleAnalyses.embedding} IS NOT NULL`
        )
      );

    const total = Number(totalResult?.count ?? 0);
    const withEmbeddings = Number(withEmbeddingsResult?.count ?? 0);

    return {
      total,
      withEmbeddings,
      withoutEmbeddings: total - withEmbeddings,
    };
  },
};

export type StyleAnalysisSearchService = typeof styleAnalysisSearchService;
