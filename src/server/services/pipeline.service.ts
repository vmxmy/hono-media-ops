import { eq, desc, and, isNull, isNotNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { pipelines, styleAnalyses, imagePrompts, type Pipeline } from "@/server/db/schema";
import { generateEmbedding } from "@/lib/embedding";
import { env } from "@/env";

// ==================== Constants ====================

// 进度权重常量
const ARTICLE_WEIGHT = 60;
const XHS_WEIGHT = 40;

// ==================== Types ====================

export type PipelineStatus = Pipeline["status"];

export interface CreatePipelineInput {
  userId: string;
  sourceUrl: string;
  topic: string;
  keywords?: string;
  targetWordCount?: number;
}

export interface UpdatePipelineInput {
  id: string;
  styleAnalysisId?: string;
  imagePromptId?: string;
  taskId?: string;
  xhsJobId?: string;
  status?: PipelineStatus;
  errorMessage?: string;
  articleTotalChapters?: number;
  articleCompletedChapters?: number;
  xhsTotalImages?: number;
  xhsCompletedImages?: number;
}

export interface GetPipelinesOptions {
  userId: string;
  page?: number;
  pageSize?: number;
  status?: PipelineStatus;
}

export interface PipelineProgress {
  status: PipelineStatus;
  totalProgress: number;
  article: {
    completed: number;
    total: number;
  };
  xhs: {
    completed: number;
    total: number;
  };
}

export interface SortedImagePrompt {
  id: string;
  title: string;
  prompt: string;
  previewUrl: string | null;
  similarity: number;
}

// ==================== Service ====================

export const pipelineService = {
  async getAll(options: GetPipelinesOptions) {
    const { userId, page = 1, pageSize = 20, status } = options;
    const offset = (page - 1) * pageSize;

    const conditions = [
      eq(pipelines.userId, userId),
      isNull(pipelines.deletedAt),
    ];

    if (status) {
      conditions.push(eq(pipelines.status, status));
    }

    const whereClause = and(...conditions);

    const items = await db
      .select()
      .from(pipelines)
      .where(whereClause)
      .orderBy(desc(pipelines.createdAt))
      .limit(pageSize)
      .offset(offset);

    return { items, page, pageSize };
  },

  async getById(id: string, userId?: string): Promise<Pipeline | null> {
    const conditions = [
      eq(pipelines.id, id),
      isNull(pipelines.deletedAt),
    ];

    // 如果提供了 userId，验证所有权
    if (userId) {
      conditions.push(eq(pipelines.userId, userId));
    }

    const [item] = await db
      .select()
      .from(pipelines)
      .where(and(...conditions))
      .limit(1);
    return item ?? null;
  },

  async create(input: CreatePipelineInput): Promise<{ id: string }> {
    const [item] = await db
      .insert(pipelines)
      .values({
        userId: input.userId,
        sourceUrl: input.sourceUrl,
        topic: input.topic,
        keywords: input.keywords,
        targetWordCount: input.targetWordCount ?? 2000,
        status: "analyzing",
      })
      .returning();

    if (!item) {
      throw new Error("Failed to create pipeline");
    }
    return { id: item.id };
  },

  async update(input: UpdatePipelineInput, userId?: string): Promise<{ success: boolean }> {
    // 如果提供了 userId，先验证所有权
    if (userId) {
      const existing = await this.getById(input.id, userId);
      if (!existing) {
        throw new Error("Pipeline not found or access denied");
      }
    }

    const { id, ...data } = input;
    await db
      .update(pipelines)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(pipelines.id, id));
    return { success: true };
  },

  async delete(id: string, userId?: string): Promise<{ success: boolean }> {
    // 如果提供了 userId，先验证所有权
    if (userId) {
      const existing = await this.getById(id, userId);
      if (!existing) {
        throw new Error("Pipeline not found or access denied");
      }
    }

    await db
      .update(pipelines)
      .set({ deletedAt: new Date() })
      .where(eq(pipelines.id, id));
    return { success: true };
  },

  async getProgress(id: string): Promise<PipelineProgress | null> {
    const pipeline = await this.getById(id);
    if (!pipeline) return null;

    const articleTotal = pipeline.articleTotalChapters ?? 0;
    const articleCompleted = pipeline.articleCompletedChapters ?? 0;
    const xhsTotal = pipeline.xhsTotalImages ?? 0;
    const xhsCompleted = pipeline.xhsCompletedImages ?? 0;

    const articleProgress = articleTotal > 0
      ? articleCompleted / articleTotal
      : 0;

    const xhsProgress = xhsTotal > 0
      ? xhsCompleted / xhsTotal
      : 0;

    // 文章占 60%，图文占 40%
    const totalProgress = Math.round((articleProgress * ARTICLE_WEIGHT) + (xhsProgress * XHS_WEIGHT));

    return {
      status: pipeline.status,
      totalProgress,
      article: {
        completed: articleCompleted,
        total: articleTotal,
      },
      xhs: {
        completed: xhsCompleted,
        total: xhsTotal,
      },
    };
  },

  /**
   * Get image prompts sorted by similarity to a style analysis
   * Uses embedding-based semantic search to recommend cover image prompts
   */
  async getSortedImagePrompts(styleAnalysisId: string): Promise<SortedImagePrompt[]> {
    // 1. 获取风格分析记录
    const [styleAnalysis] = await db
      .select()
      .from(styleAnalyses)
      .where(eq(styleAnalyses.id, styleAnalysisId))
      .limit(1);

    if (!styleAnalysis) return [];

    // 2. 构建风格摘要文本
    const styleIdentity = styleAnalysis.styleIdentity;
    const coreTraits = [
      styleIdentity?.archetype,
      styleIdentity?.tone_keywords,
      styleIdentity?.voice_distance,
    ].filter(Boolean).join(" ");

    const summaryText = [
      styleAnalysis.styleName,
      coreTraits,
    ].filter(Boolean).join(" ");

    if (!summaryText.trim()) return [];

    // 3. 生成风格摘要的 embedding
    const queryEmbedding = await generateEmbedding(summaryText);
    if (!queryEmbedding) {
      // OpenAI API key not configured, return prompts without similarity sorting
      const prompts = await db
        .select()
        .from(imagePrompts)
        .where(isNull(imagePrompts.deletedAt))
        .limit(20);

      return prompts.map((p) => ({
        id: p.id,
        title: p.title,
        prompt: p.prompt,
        previewUrl: p.previewUrl,
        similarity: 0,
      }));
    }

    // 4. 使用 pgvector 在数据库中计算相似度并排序
    const vectorString = `[${queryEmbedding.join(",")}]`;
    const results = await db.execute(sql`
      SELECT
        id,
        title,
        prompt,
        preview_url,
        ROUND((1 - (embedding <=> ${vectorString}::vector)) * 100)::integer as similarity
      FROM image_prompts
      WHERE deleted_at IS NULL
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorString}::vector
      LIMIT 20
    `);

    return (results as unknown as Array<{
      id: string;
      title: string;
      prompt: string;
      preview_url: string | null;
      similarity: number;
    }>).map((row) => ({
      id: row.id,
      title: row.title,
      prompt: row.prompt,
      previewUrl: row.preview_url,
      similarity: Number(row.similarity),
    }));
  },

  /**
   * Trigger style analysis webhook
   */
  async triggerStyleAnalysis(pipelineId: string): Promise<{ triggered: boolean }> {
    const webhookUrl = env.N8N_PIPELINE_WEBHOOK_URL;
    if (!webhookUrl) {
      console.log("[PipelineService] N8N_PIPELINE_WEBHOOK_URL not configured, skipping webhook");
      return { triggered: false };
    }

    const pipeline = await this.getById(pipelineId);
    if (!pipeline) {
      throw new Error("Pipeline not found");
    }

    const payload = {
      action: "analyze_style",
      pipelineId: pipeline.id,
      sourceUrl: pipeline.sourceUrl,
      topic: pipeline.topic,
      keywords: pipeline.keywords,
      targetWordCount: pipeline.targetWordCount,
    };

    console.log("[PipelineService] Sending style analysis webhook:", payload);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error("[PipelineService] Webhook failed:", response.status, await response.text());
        return { triggered: false };
      }

      return { triggered: true };
    } catch (error) {
      console.error("[PipelineService] Webhook error:", error);
      return { triggered: false };
    }
  },

  /**
   * Trigger content generation webhook
   */
  async triggerContentGeneration(pipelineId: string): Promise<{ triggered: boolean }> {
    const webhookUrl = env.N8N_PIPELINE_WEBHOOK_URL;
    if (!webhookUrl) {
      console.log("[PipelineService] N8N_PIPELINE_WEBHOOK_URL not configured, skipping webhook");
      return { triggered: false };
    }

    const pipeline = await this.getById(pipelineId);
    if (!pipeline) {
      throw new Error("Pipeline not found");
    }

    const payload = {
      action: "generate_content",
      pipelineId: pipeline.id,
      sourceUrl: pipeline.sourceUrl,
      topic: pipeline.topic,
      keywords: pipeline.keywords,
      targetWordCount: pipeline.targetWordCount,
      styleAnalysisId: pipeline.styleAnalysisId,
      imagePromptId: pipeline.imagePromptId,
    };

    console.log("[PipelineService] Sending content generation webhook:", payload);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error("[PipelineService] Webhook failed:", response.status, await response.text());
        return { triggered: false };
      }

      return { triggered: true };
    } catch (error) {
      console.error("[PipelineService] Webhook error:", error);
      return { triggered: false };
    }
  },
};

export type PipelineService = typeof pipelineService;
