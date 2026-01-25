import { eq, desc, like, and, or, sql, gte, lte, inArray, isNull, isNotNull, lt } from "drizzle-orm";
import { db } from "@/server/db";
import {
  tasks,
  taskExecutions,
  styleAnalyses,
  imagePrompts,
  type Task,
  type TaskExecution,
  type ExecutionResult,
  type WechatMediaInfo,
} from "@/server/db/schema";
import { env } from "@/env";
import { countArticleWords } from "./article.service";
import { embeddingService, prepareArticleEmbeddingContent } from "./embedding.service";

// ==================== Types ====================

export type TaskStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";
export type ExecutionStatus = "running" | "completed" | "failed";

export interface GetAllTasksOptions {
  page: number;
  pageSize: number;
  status?: TaskStatus | TaskStatus[];
  search?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  hasResult?: boolean;
  sortBy?: "createdAt" | "status" | "topic";
  sortOrder?: "asc" | "desc";
}

export interface GetAllTasksInfiniteOptions {
  limit: number;
  cursor?: string; // createdAt timestamp
  status?: TaskStatus | TaskStatus[];
  search?: string;
  userId?: string;
}

export interface CreateTaskInput {
  userId?: string;
  topic: string;
  keywords?: string;
  totalWordCount?: number;
  // Cover prompt (link to image_prompts)
  coverPromptId?: string;
  // Reference material (link to reverse_engineering_logs)
  refMaterialId?: string;
  // Whether to use search engine
  useSearch?: boolean;
}

export interface UpdateTaskInput {
  id: string;
  topic?: string;
  keywords?: string;
  // Cover prompt (link to image_prompts)
  coverPromptId?: string;
}

export interface UpdateTaskStatusInput {
  id: string;
  status: TaskStatus;
}

export interface TaskStatistics {
  total: number;
  byStatus: Record<TaskStatus, number>;
  todayCount: number;
  weekCount: number;
  completionRate: number;
  avgProcessingTime?: number;
}

export interface TaskWithExecutions extends Task {
  executions?: TaskExecution[];
}

export interface TaskWithMaterial extends Task {
  coverUrl?: string | null;
  articleWordCount?: number | null;
  articleTitle?: string | null;
  articleSubtitle?: string | null;
  refMaterial?: {
    styleName: string | null;
    sourceTitle: string | null;
    sourceUrl: string | null;
  } | null;
}

export interface WebhookPayload {
  taskId: string;
  topic: string;
  keywords: string;
  totalWordCount: number;
  coverPromptId?: string;
  refMaterialId?: string;
  useSearch: boolean;
}

// ==================== Service ====================

export const taskService = {
  // ==================== Query Methods ====================

  // Infinite scroll query (cursor-based pagination)
  async getAllInfinite(options: GetAllTasksInfiniteOptions) {
    const { limit, cursor, status, search, userId } = options;

    const conditions = [isNull(tasks.deletedAt)];

    if (status) {
      if (Array.isArray(status)) {
        conditions.push(inArray(tasks.status, status));
      } else {
        conditions.push(eq(tasks.status, status));
      }
    }

    if (search) {
      const searchCondition = or(
        like(tasks.topic, `%${search}%`),
        like(tasks.keywords, `%${search}%`)
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    if (userId) {
      conditions.push(eq(tasks.userId, userId));
    }

    // Add cursor condition (fetch items created before cursor timestamp)
    if (cursor) {
      conditions.push(lt(tasks.createdAt, new Date(cursor)));
    }

    const whereClause = and(...conditions);

    // Fetch limit + 1 to determine if there's a next page
    const data = await db
      .select({
        task: tasks,
        refMaterial: {
          styleName: styleAnalyses.styleName,
          sourceTitle: styleAnalyses.sourceTitle,
          sourceUrl: styleAnalyses.sourceUrl,
        },
        coverUrl: sql<string>`
          (
            select elem->>'r2_url'
            from ${taskExecutions} te,
                 jsonb_array_elements(
                   case when jsonb_typeof(te.wechat_media_info) = 'array'
                     then te.wechat_media_info
                     else jsonb_build_array(te.wechat_media_info)
                   end
                 ) as elem
            where te.task_id = ${tasks.id}
              and te.status = 'completed'
              and elem ? 'r2_url'
            order by te.completed_at desc nulls last
            limit 1
          )`,
        articleWordCount: sql<number>`
          (
            select (result->>'articleWordCount')::int
            from ${taskExecutions} te
            where te.task_id = ${tasks.id}
              and te.status = 'completed'
              and te.result is not null
            order by te.completed_at desc nulls last
            limit 1
          )`,
        articleTitle: sql<string>`
          (
            select result->>'articleTitle'
            from ${taskExecutions} te
            where te.task_id = ${tasks.id}
              and te.status = 'completed'
              and te.result is not null
            order by te.completed_at desc nulls last
            limit 1
          )`,
        articleSubtitle: sql<string>`
          (
            select result->>'articleSubtitle'
            from ${taskExecutions} te
            where te.task_id = ${tasks.id}
              and te.status = 'completed'
              and te.result is not null
            order by te.completed_at desc nulls last
            limit 1
          )`,
      })
      .from(tasks)
      .leftJoin(styleAnalyses, eq(tasks.refMaterialId, styleAnalyses.id))
      .where(whereClause)
      .orderBy(desc(tasks.createdAt))
      .limit(limit + 1);

    // Check if there are more items
    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    // Next cursor is the createdAt of the last item
    const nextCursor = hasMore && items.length > 0
      ? items[items.length - 1]!.task.createdAt.toISOString()
      : undefined;

    return {
      tasks: items.map((row) => ({
        ...row.task,
        coverUrl: row.coverUrl,
        articleWordCount: row.articleWordCount,
        articleTitle: row.articleTitle,
        articleSubtitle: row.articleSubtitle,
        refMaterial: row.refMaterial?.styleName ? row.refMaterial : null,
      })),
      nextCursor,
    };
  },

  // Traditional pagination (legacy)
  async getAll(options: GetAllTasksOptions) {
    const { page, pageSize, status, search, userId, sortBy = "createdAt", sortOrder = "desc" } = options;
    const offset = (page - 1) * pageSize;

    const conditions = [isNull(tasks.deletedAt)];

    if (status) {
      if (Array.isArray(status)) {
        conditions.push(inArray(tasks.status, status));
      } else {
        conditions.push(eq(tasks.status, status));
      }
    }

    if (search) {
      const searchCondition = or(
        like(tasks.topic, `%${search}%`),
        like(tasks.keywords, `%${search}%`)
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    if (userId) {
      conditions.push(eq(tasks.userId, userId));
    }

    const whereClause = and(...conditions);

    const orderByColumn = {
      createdAt: tasks.createdAt,
      status: tasks.status,
      topic: tasks.topic,
    }[sortBy];
    const orderBy = sortOrder === "desc" ? desc(orderByColumn) : orderByColumn;

    const [data, countResult] = await Promise.all([
      db
        .select({
          task: tasks,
          refMaterial: {
            styleName: styleAnalyses.styleName,
            sourceTitle: styleAnalyses.sourceTitle,
            sourceUrl: styleAnalyses.sourceUrl,
          },
          coverUrl: sql<string>`
            (
              select elem->>'r2_url'
              from ${taskExecutions} te,
                   jsonb_array_elements(
                     case when jsonb_typeof(te.wechat_media_info) = 'array'
                          then te.wechat_media_info
                          else '[]'::jsonb
                     end
                   ) elem
              where te.task_id = ${tasks.id}
                and te.status = 'completed'
              order by elem->>'uploaded_at' desc nulls last
              limit 1
            )
          `.as("cover_url"),
          articleMarkdown: sql<string>`
            (
              select ${taskExecutions.articleMarkdown}
              from ${taskExecutions}
              where ${taskExecutions.taskId} = ${tasks.id}
                and ${taskExecutions.status} = 'completed'
                and ${taskExecutions.articleMarkdown} is not null
              order by ${taskExecutions.startedAt} desc
              limit 1
            )
          `.as("article_markdown"),
          articleTitle: sql<string>`
            (
              select ${taskExecutions.articleTitle}
              from ${taskExecutions}
              where ${taskExecutions.taskId} = ${tasks.id}
                and ${taskExecutions.status} = 'completed'
                and ${taskExecutions.articleTitle} is not null
              order by ${taskExecutions.startedAt} desc
              limit 1
            )
          `.as("article_title"),
          articleSubtitle: sql<string>`
            (
              select ${taskExecutions.articleSubtitle}
              from ${taskExecutions}
              where ${taskExecutions.taskId} = ${tasks.id}
                and ${taskExecutions.status} = 'completed'
                and ${taskExecutions.articleSubtitle} is not null
              order by ${taskExecutions.startedAt} desc
              limit 1
            )
          `.as("article_subtitle"),
        })
        .from(tasks)
        .leftJoin(styleAnalyses, eq(tasks.refMaterialId, styleAnalyses.id))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(tasks).where(whereClause),
    ]);

    const total = countResult[0]?.count ?? 0;

    // Flatten the result to include refMaterial in the task object
    const tasksWithMaterial: TaskWithMaterial[] = data.map((row) => ({
      ...row.task,
      coverUrl: row.coverUrl ?? null,
      articleWordCount: countArticleWords(row.articleMarkdown),
      articleTitle: row.articleTitle ?? null,
      articleSubtitle: row.articleSubtitle ?? null,
      refMaterial: row.refMaterial?.styleName || row.refMaterial?.sourceTitle || row.refMaterial?.sourceUrl
        ? row.refMaterial
        : null,
    }));

    return {
      tasks: tasksWithMaterial,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  async getById(id: string): Promise<Task | null> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .limit(1);

    return task ?? null;
  },

  async getWithExecutions(id: string): Promise<TaskWithExecutions | null> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .limit(1);

    if (!task) return null;

    const executions = await db
      .select()
      .from(taskExecutions)
      .where(eq(taskExecutions.taskId, id))
      .orderBy(desc(taskExecutions.startedAt));

    return { ...task, executions };
  },

  async getByIds(ids: string[]): Promise<Task[]> {
    if (ids.length === 0) return [];
    return db.select().from(tasks).where(and(inArray(tasks.id, ids), isNull(tasks.deletedAt)));
  },

  async getRecent(limit: number = 10): Promise<Task[]> {
    return db.select().from(tasks).where(isNull(tasks.deletedAt)).orderBy(desc(tasks.createdAt)).limit(limit);
  },

  async getByStatus(status: TaskStatus, limit?: number): Promise<Task[]> {
    const query = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.status, status), isNull(tasks.deletedAt)))
      .orderBy(desc(tasks.createdAt));

    if (limit) return query.limit(limit);
    return query;
  },

  // ==================== Statistics ====================

  async getStatistics(): Promise<TaskStatistics> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const statusCounts = await db
      .select({ status: tasks.status, count: sql<number>`count(*)` })
      .from(tasks)
      .where(isNull(tasks.deletedAt))
      .groupBy(tasks.status);

    const [todayResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(and(gte(tasks.createdAt, todayStart), isNull(tasks.deletedAt)));

    const [weekResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(and(gte(tasks.createdAt, weekStart), isNull(tasks.deletedAt)));

    const [avgTimeResult] = await db
      .select({ avgTime: sql<number>`avg(${taskExecutions.durationMs})` })
      .from(taskExecutions)
      .where(isNotNull(taskExecutions.durationMs));

    const byStatus: Record<TaskStatus, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    let total = 0;
    for (const row of statusCounts) {
      const s = row.status as TaskStatus;
      byStatus[s] = row.count;
      total += row.count;
    }

    const completionRate = total > 0 ? (byStatus.completed / total) * 100 : 0;

    return {
      total,
      byStatus,
      todayCount: todayResult?.count ?? 0,
      weekCount: weekResult?.count ?? 0,
      completionRate: Math.round(completionRate * 100) / 100,
      avgProcessingTime: avgTimeResult?.avgTime ?? undefined,
    };
  },

  // ==================== Mutation Methods ====================

  async create(input: CreateTaskInput): Promise<{ id: string; task: Task }> {
    const [task] = await db.insert(tasks).values({
      userId: input.userId,
      topic: input.topic,
      keywords: input.keywords,
      totalWordCount: input.totalWordCount ?? 4000,
      coverPromptId: input.coverPromptId,
      refMaterialId: input.refMaterialId,
      status: "pending",
    }).returning();

    return { id: task!.id, task: task! };
  },

  async createAndTrigger(input: CreateTaskInput, callbackUrl: string): Promise<{ id: string; task: Task; triggered: boolean }> {
    console.log("[TaskService] createAndTrigger called with:", { topic: input.topic, useSearch: input.useSearch, callbackUrl });
    const { id, task } = await this.create(input);
    console.log("[TaskService] Task created:", id);
    await this.updateStatus({ id, status: "processing" });
    console.log("[TaskService] Status updated to processing, triggering webhook...");
    const triggered = await this.triggerWebhook(id, callbackUrl, input.useSearch ?? true);
    console.log("[TaskService] Webhook triggered:", triggered);
    return { id, task, triggered };
  },

  async update(input: UpdateTaskInput): Promise<{ success: boolean }> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (input.topic !== undefined) updateData.topic = input.topic;
    if (input.keywords !== undefined) updateData.keywords = input.keywords;
    if (input.coverPromptId !== undefined) updateData.coverPromptId = input.coverPromptId;

    await db.update(tasks).set(updateData).where(eq(tasks.id, input.id));

    return { success: true };
  },

  async updateStatus(input: UpdateTaskStatusInput): Promise<{ success: boolean }> {
    await db
      .update(tasks)
      .set({
        status: input.status,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, input.id));

    return { success: true };
  },

  /**
   * Update writing progress (called by n8n during chapter loop)
   */
  async updateProgress(input: {
    id: string;
    currentChapter: number;
    totalChapters: number;
  }): Promise<{ success: boolean }> {
    await db
      .update(tasks)
      .set({
        currentChapter: input.currentChapter,
        totalChapters: input.totalChapters,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, input.id));

    return { success: true };
  },

  async delete(id: string): Promise<{ success: boolean }> {
    await db.update(tasks).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(tasks.id, id));
    return { success: true };
  },

  async hardDelete(id: string): Promise<{ success: boolean }> {
    await db.delete(taskExecutions).where(eq(taskExecutions.taskId, id));
    await db.delete(tasks).where(eq(tasks.id, id));
    return { success: true };
  },

  async retry(id: string, callbackUrl?: string): Promise<{ success: boolean; triggered: boolean }> {
    await db
      .update(tasks)
      .set({ status: "processing", updatedAt: new Date() })
      .where(eq(tasks.id, id));

    let triggered = false;
    if (callbackUrl) {
      triggered = await this.triggerWebhook(id, callbackUrl);
    }

    return { success: true, triggered };
  },

  async cancel(id: string): Promise<{ success: boolean }> {
    await db.update(tasks).set({ status: "cancelled", updatedAt: new Date() }).where(eq(tasks.id, id));
    return { success: true };
  },

  async duplicate(id: string): Promise<{ id: string; task: Task } | null> {
    const original = await this.getById(id);
    if (!original) return null;

    const [task] = await db.insert(tasks).values({
      userId: original.userId,
      topic: `${original.topic} (副本)`,
      keywords: original.keywords,
      coverPromptId: original.coverPromptId,
      refMaterialId: original.refMaterialId,
      status: "pending",
    }).returning();

    return { id: task!.id, task: task! };
  },

  async restore(id: string): Promise<{ success: boolean }> {
    await db.update(tasks).set({ deletedAt: null, updatedAt: new Date() }).where(eq(tasks.id, id));
    return { success: true };
  },

  // ==================== Batch Operations ====================

  async batchDelete(ids: string[]): Promise<{ success: boolean; deletedCount: number }> {
    if (ids.length === 0) return { success: true, deletedCount: 0 };
    await db.update(tasks).set({ deletedAt: new Date(), updatedAt: new Date() }).where(inArray(tasks.id, ids));
    return { success: true, deletedCount: ids.length };
  },

  async batchUpdateStatus(ids: string[], status: TaskStatus): Promise<{ success: boolean; updatedCount: number }> {
    if (ids.length === 0) return { success: true, updatedCount: 0 };
    await db.update(tasks).set({ status, updatedAt: new Date() }).where(inArray(tasks.id, ids));
    return { success: true, updatedCount: ids.length };
  },

  async batchRetry(ids: string[], callbackUrl?: string): Promise<{ success: boolean; retriedCount: number }> {
    if (ids.length === 0) return { success: true, retriedCount: 0 };

    await db
      .update(tasks)
      .set({ status: "processing", updatedAt: new Date() })
      .where(inArray(tasks.id, ids));

    if (callbackUrl) {
      for (const id of ids) {
        await this.triggerWebhook(id, callbackUrl);
      }
    }

    return { success: true, retriedCount: ids.length };
  },

  async batchCancel(ids: string[]): Promise<{ success: boolean; cancelledCount: number }> {
    if (ids.length === 0) return { success: true, cancelledCount: 0 };
    await db.update(tasks).set({ status: "cancelled", updatedAt: new Date() }).where(inArray(tasks.id, ids));
    return { success: true, cancelledCount: ids.length };
  },

  // ==================== Webhook Integration ====================

  async triggerWebhook(taskId: string, _callbackUrl: string, useSearch: boolean = true): Promise<boolean> {
    const webhookUrl = env.N8N_WRITING_WEBHOOK_URL;
    console.log("[TaskService] triggerWebhook - webhookUrl:", webhookUrl, "useSearch:", useSearch);
    if (!webhookUrl) {
      console.warn("[TaskService] N8N_WRITING_WEBHOOK_URL not configured");
      return false;
    }

    const task = await this.getById(taskId);
    if (!task) {
      console.error(`[TaskService] Task ${taskId} not found`);
      return false;
    }

    const payload: WebhookPayload = {
      taskId: task.id,
      topic: task.topic,
      keywords: task.keywords ?? "",
      totalWordCount: task.totalWordCount,
      coverPromptId: task.coverPromptId ?? undefined,
      refMaterialId: task.refMaterialId ?? undefined,
      useSearch,
    };

    console.log("[TaskService] Sending webhook payload:", payload);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("[TaskService] Webhook response status:", response.status);

      if (!response.ok) {
        console.error(`[TaskService] Webhook failed: ${response.status} ${response.statusText}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error("[TaskService] Webhook error:", error);
      return false;
    }
  },

  // ==================== Export ====================

  async export(options?: { ids?: string[]; status?: TaskStatus }): Promise<Task[]> {
    if (options?.ids && options.ids.length > 0) {
      return this.getByIds(options.ids);
    }

    if (options?.status) {
      return this.getByStatus(options.status);
    }

    return db.select().from(tasks).where(isNull(tasks.deletedAt)).orderBy(desc(tasks.createdAt));
  },

  // ==================== Execution Management ====================

  async createExecution(taskId: string, n8nExecutionId?: string): Promise<{ id: string }> {
    const task = await this.getById(taskId);

    const [execution] = await db.insert(taskExecutions).values({
      taskId,
      n8nExecutionId,
      status: "running",
      inputSnapshot: task ? {
        topic: task.topic,
        keywords: task.keywords,
        coverPromptId: task.coverPromptId,
        refMaterialId: task.refMaterialId,
      } : undefined,
    }).returning();

    return { id: execution!.id };
  },

  async completeExecution(
    executionId: string,
    result: {
      status: ExecutionStatus;
      errorMessage?: string;
      coverUrl?: string;
      coverR2Key?: string;
      wechatMediaId?: string;
      wechatDraftId?: string;
      // Article content
      articleTitle?: string;
      articleSubtitle?: string;
      articleMarkdown?: string;
      articleHtml?: string;
      articleWordCount?: number;
      // Processing metadata
      ready?: boolean;
      humanReview?: string[];
      transitionsAdded?: ExecutionResult["transitionsAdded"];
      modifications?: ExecutionResult["modifications"];
      statistics?: ExecutionResult["statistics"];
      reviewSummary?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<{ success: boolean }> {
    const now = new Date();

    const [execution] = await db
      .select()
      .from(taskExecutions)
      .where(eq(taskExecutions.id, executionId))
      .limit(1);

    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const durationMs = execution.startedAt
      ? now.getTime() - new Date(execution.startedAt).getTime()
      : null;

    const executionResult: ExecutionResult = {
      coverR2Key: result.coverR2Key,
      wechatDraftId: result.wechatDraftId,
      // Processing metadata
      ready: result.ready,
      humanReview: result.humanReview,
      transitionsAdded: result.transitionsAdded,
      modifications: result.modifications,
      statistics: result.statistics,
      reviewSummary: result.reviewSummary,
      ...result.metadata,
    };

    // Build wechatMediaInfo from coverUrl and wechatMediaId
    const existingMediaInfo = Array.isArray(execution.wechatMediaInfo)
      ? {}
      : (execution.wechatMediaInfo ?? {});
    const wechatMediaInfo: WechatMediaInfo = {
      ...existingMediaInfo,
      ...(result.coverUrl ? { r2_url: result.coverUrl } : {}),
      ...(result.wechatMediaId ? { media_id: result.wechatMediaId } : {}),
    };

    // Update execution record
    await db
      .update(taskExecutions)
      .set({
        completedAt: now,
        durationMs,
        status: result.status,
        errorMessage: result.errorMessage,
        result: executionResult,
        wechatMediaInfo: Object.keys(wechatMediaInfo).length > 0 ? wechatMediaInfo : undefined,
        articleTitle: result.articleTitle,
        articleSubtitle: result.articleSubtitle,
        articleMarkdown: result.articleMarkdown,
        articleHtml: result.articleHtml,
        articleWordCount: result.articleWordCount,
      })
      .where(eq(taskExecutions.id, executionId));

    // Sync task status based on execution result
    const taskStatus: TaskStatus = result.status === "completed" ? "completed" : "failed";
    await this.updateStatus({ id: execution.taskId, status: taskStatus });

    const isFirstCompletion = execution.status !== "completed" && result.status === "completed";
    const articleMarkdown = result.articleMarkdown ?? execution.articleMarkdown;
    const shouldGenerateEmbedding = isFirstCompletion && Boolean(articleMarkdown);

    if (isFirstCompletion || shouldGenerateEmbedding) {
      const [taskRow] = await db
        .select({
          refMaterialId: tasks.refMaterialId,
          coverPromptId: tasks.coverPromptId,
          topic: tasks.topic,
          keywords: tasks.keywords,
        })
        .from(tasks)
        .where(eq(tasks.id, execution.taskId))
        .limit(1);

      if (isFirstCompletion) {
        const usageUpdates: Promise<unknown>[] = [];

        if (taskRow?.refMaterialId) {
          usageUpdates.push(
            db.update(styleAnalyses)
              .set({
                useCount: sql<number>`${styleAnalyses.useCount} + 1`,
                updatedAt: now,
              })
              .where(eq(styleAnalyses.id, taskRow.refMaterialId))
          );
        }

        if (taskRow?.coverPromptId) {
          usageUpdates.push(
            db.update(imagePrompts)
              .set({
                useCount: sql<number>`${imagePrompts.useCount} + 1`,
                lastUsedAt: now,
                updatedAt: now,
              })
              .where(eq(imagePrompts.id, taskRow.coverPromptId))
          );
        }

        if (usageUpdates.length > 0) {
          await Promise.all(usageUpdates);
        }
      }

      if (shouldGenerateEmbedding && taskRow && articleMarkdown) {
        try {
          const content = prepareArticleEmbeddingContent(
            articleMarkdown,
            taskRow.topic,
            taskRow.keywords ?? null
          );
          await embeddingService.generateAndStoreEmbedding({
            executionId: execution.id,
            taskId: execution.taskId,
            content,
          });
        } catch (error) {
          console.error("[Task] Failed to generate article embedding", error);
        }
      }
    }

    return { success: true };
  },

  async getExecutions(taskId: string): Promise<TaskExecution[]> {
    return db
      .select()
      .from(taskExecutions)
      .where(eq(taskExecutions.taskId, taskId))
      .orderBy(desc(taskExecutions.startedAt));
  },

  async getLatestExecution(taskId: string): Promise<TaskExecution | null> {
    // Return the latest completed execution
    const [execution] = await db
      .select()
      .from(taskExecutions)
      .where(
        and(
          eq(taskExecutions.taskId, taskId),
          eq(taskExecutions.status, "completed")
        )
      )
      .orderBy(desc(taskExecutions.startedAt))
      .limit(1);

    return execution ?? null;
  },

  async updateExecutionResult(
    executionId: string,
    updates: { coverUrl?: string; wechatMediaId?: string }
  ): Promise<{ success: boolean }> {
    // Get current wechat_media_info
    const [current] = await db
      .select({ wechatMediaInfo: taskExecutions.wechatMediaInfo })
      .from(taskExecutions)
      .where(eq(taskExecutions.id, executionId))
      .limit(1);

    const currentInfo = current?.wechatMediaInfo;
    const baseInfo = Array.isArray(currentInfo) ? {} : (currentInfo ?? {});
    const updatedInfo: WechatMediaInfo = {
      ...baseInfo,
      ...(updates.coverUrl !== undefined ? { r2_url: updates.coverUrl } : {}),
      ...(updates.wechatMediaId !== undefined ? { media_id: updates.wechatMediaId } : {}),
    };

    await db
      .update(taskExecutions)
      .set({ wechatMediaInfo: updatedInfo })
      .where(eq(taskExecutions.id, executionId));

    return { success: true };
  },

  async updateExecutionMediaInfo(
    executionId: string,
    wechatMediaInfo: WechatMediaInfo
  ): Promise<{ success: boolean }> {
    await db
      .update(taskExecutions)
      .set({ wechatMediaInfo })
      .where(eq(taskExecutions.id, executionId));

    return { success: true };
  },

  async updateExecutionMarkdown(
    executionId: string,
    markdown: string
  ): Promise<{ success: boolean }> {
    await db
      .update(taskExecutions)
      .set({ articleMarkdown: markdown })
      .where(eq(taskExecutions.id, executionId));

    return { success: true };
  },
};

export type TaskService = typeof taskService;
