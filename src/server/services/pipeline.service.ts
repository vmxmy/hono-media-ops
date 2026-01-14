import { eq, desc, and, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { pipelines, type Pipeline } from "@/server/db/schema";

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
};

export type PipelineService = typeof pipelineService;
