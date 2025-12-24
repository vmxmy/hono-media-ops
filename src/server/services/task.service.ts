import { eq, desc, like, and, or, sql, gte, lte, inArray, isNull, isNotNull } from "drizzle-orm";
import { db } from "@/server/db";
import {
  tasks,
  taskExecutions,
  type Task,
  type TaskExecution,
  type CoverConfig,
  type ArticleConfig,
  type ExecutionResult,
} from "@/server/db/schema";
import { env } from "@/env";

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

export interface CreateTaskInput {
  userId?: string;
  topic: string;
  keywords?: string;
  templateId?: string;
  refUrl?: string;
  // Article config (will be stored as JSONB)
  style?: string;
  openingExample?: string;
  structureGuide?: string;
  outputSchema?: string;
  // Cover config (will be stored as JSONB)
  coverPrompt?: string;
  coverRatio?: string;
  coverResolution?: string;
  coverModel?: string;
  coverMode?: string;
  coverNegativePrompt?: string;
}

export interface UpdateTaskInput {
  id: string;
  topic?: string;
  keywords?: string;
  templateId?: string;
  refUrl?: string;
  articleConfig?: ArticleConfig;
  coverConfig?: CoverConfig;
}

export interface UpdateTaskStatusInput {
  id: string;
  status: TaskStatus;
  resultTitle?: string;
  resultContent?: string;
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

export interface WebhookPayload {
  taskId: string;
  topic: string;
  keywords: string;
  url: string;
  template: string;
  // Article config fields (flattened)
  style: string;
  structureGuide: string;
  outputSchema: string;
  // Cover config fields (flattened)
  coverPrompt: string;
  coverRatio: string;
  coverResolution: string;
  coverModel: string;
  coverMode: string;
  coverNegativePrompt: string;
  // Chinese field names for n8n compatibility
  主题: string;
  关键字: string;
  写作风格: string;
  结构骨架: string;
  输出结构: string;
  封面提示词: string;
  封面比例: string;
  封面分辨率: string;
  封面模型: string;
  封面负面提示词: string;
}

// ==================== Helper Functions ====================

function buildArticleConfig(input: CreateTaskInput): ArticleConfig | undefined {
  if (!input.style && !input.openingExample && !input.structureGuide && !input.outputSchema) {
    return undefined;
  }
  return {
    style: input.style,
    openingExample: input.openingExample,
    structureGuide: input.structureGuide,
    outputSchema: input.outputSchema,
  };
}

function buildCoverConfig(input: CreateTaskInput): CoverConfig {
  return {
    prompt: input.coverPrompt,
    ratio: input.coverRatio ?? "16:9",
    resolution: input.coverResolution ?? "1k",
    model: input.coverModel ?? "jimeng-4.5",
    mode: input.coverMode ?? "text2img",
    negativePrompt: input.coverNegativePrompt ?? "模糊, 变形, 低质量, 水印, 文字",
  };
}

// ==================== Service ====================

export const taskService = {
  // ==================== Query Methods ====================

  /**
   * Get all tasks with advanced filtering and pagination
   */
  async getAll(options: GetAllTasksOptions) {
    const {
      page,
      pageSize,
      status,
      search,
      userId,
      dateFrom,
      dateTo,
      hasResult,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;
    const offset = (page - 1) * pageSize;

    const conditions = [];

    // Exclude soft-deleted records
    conditions.push(isNull(tasks.deletedAt));

    // Status filter (single or multiple)
    if (status) {
      if (Array.isArray(status)) {
        conditions.push(inArray(tasks.status, status));
      } else {
        conditions.push(eq(tasks.status, status));
      }
    }

    // Search filter (topic or keywords)
    if (search) {
      conditions.push(
        or(
          like(tasks.topic, `%${search}%`),
          like(tasks.keywords, `%${search}%`)
        )
      );
    }

    // User filter
    if (userId) {
      conditions.push(eq(tasks.userId, userId));
    }

    // Date range filter
    if (dateFrom) {
      conditions.push(gte(tasks.createdAt, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(tasks.createdAt, dateTo));
    }

    // Has result filter
    if (hasResult === true) {
      conditions.push(isNotNull(tasks.resultContent));
    } else if (hasResult === false) {
      conditions.push(isNull(tasks.resultContent));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Dynamic sorting
    const orderByColumn = {
      createdAt: tasks.createdAt,
      status: tasks.status,
      topic: tasks.topic,
    }[sortBy];

    const orderBy = sortOrder === "desc" ? desc(orderByColumn) : orderByColumn;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(tasks)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count ?? 0;

    return {
      tasks: data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  /**
   * Get a single task by ID
   */
  async getById(id: string): Promise<Task | null> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .limit(1);

    return task ?? null;
  },

  /**
   * Get task with its execution history
   */
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

  /**
   * Get tasks by IDs
   */
  async getByIds(ids: string[]): Promise<Task[]> {
    if (ids.length === 0) return [];

    return db
      .select()
      .from(tasks)
      .where(and(inArray(tasks.id, ids), isNull(tasks.deletedAt)));
  },

  /**
   * Get recent tasks
   */
  async getRecent(limit: number = 10): Promise<Task[]> {
    return db
      .select()
      .from(tasks)
      .where(isNull(tasks.deletedAt))
      .orderBy(desc(tasks.createdAt))
      .limit(limit);
  },

  /**
   * Get tasks by status
   */
  async getByStatus(status: TaskStatus, limit?: number): Promise<Task[]> {
    const query = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.status, status), isNull(tasks.deletedAt)))
      .orderBy(desc(tasks.createdAt));

    if (limit) {
      return query.limit(limit);
    }
    return query;
  },

  // ==================== Statistics ====================

  /**
   * Get task statistics
   */
  async getStatistics(): Promise<TaskStatistics> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    // Get counts by status (excluding soft-deleted)
    const statusCounts = await db
      .select({
        status: tasks.status,
        count: sql<number>`count(*)`,
      })
      .from(tasks)
      .where(isNull(tasks.deletedAt))
      .groupBy(tasks.status);

    // Get today's count
    const [todayResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(and(gte(tasks.createdAt, todayStart), isNull(tasks.deletedAt)));

    // Get week's count
    const [weekResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(and(gte(tasks.createdAt, weekStart), isNull(tasks.deletedAt)));

    // Calculate avg processing time from executions
    const [avgTimeResult] = await db
      .select({ avgTime: sql<number>`avg(${taskExecutions.durationMs})` })
      .from(taskExecutions)
      .where(isNotNull(taskExecutions.durationMs));

    // Build status counts object
    const byStatus: Record<TaskStatus, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    let total = 0;
    for (const row of statusCounts) {
      const status = row.status as TaskStatus;
      byStatus[status] = row.count;
      total += row.count;
    }

    const completionRate = total > 0
      ? (byStatus.completed / total) * 100
      : 0;

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

  /**
   * Create a new task
   */
  async create(input: CreateTaskInput): Promise<{ id: string; task: Task }> {
    const articleConfig = buildArticleConfig(input);
    const coverConfig = buildCoverConfig(input);

    const [task] = await db.insert(tasks).values({
      userId: input.userId,
      topic: input.topic,
      keywords: input.keywords,
      templateId: input.templateId,
      refUrl: input.refUrl,
      articleConfig,
      coverConfig,
      status: "pending",
    }).returning();

    return { id: task!.id, task: task! };
  },

  /**
   * Create task and trigger n8n webhook
   */
  async createAndTrigger(input: CreateTaskInput, callbackUrl: string): Promise<{ id: string; task: Task; triggered: boolean }> {
    const { id, task } = await this.create(input);

    // Update status to processing
    await this.updateStatus({ id, status: "processing" });

    // Trigger webhook
    const triggered = await this.triggerWebhook(id, callbackUrl);

    return { id, task, triggered };
  },

  /**
   * Update task details
   */
  async update(input: UpdateTaskInput): Promise<{ success: boolean }> {
    const updateData: Partial<Task> = {
      updatedAt: new Date(),
    };

    if (input.topic !== undefined) updateData.topic = input.topic;
    if (input.keywords !== undefined) updateData.keywords = input.keywords;
    if (input.templateId !== undefined) updateData.templateId = input.templateId;
    if (input.refUrl !== undefined) updateData.refUrl = input.refUrl;
    if (input.articleConfig !== undefined) updateData.articleConfig = input.articleConfig;
    if (input.coverConfig !== undefined) updateData.coverConfig = input.coverConfig;

    await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, input.id));

    return { success: true };
  },

  /**
   * Update task status and result
   */
  async updateStatus(input: UpdateTaskStatusInput): Promise<{ success: boolean }> {
    await db
      .update(tasks)
      .set({
        status: input.status,
        resultTitle: input.resultTitle,
        resultContent: input.resultContent,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, input.id));

    return { success: true };
  },

  /**
   * Soft delete a task
   */
  async delete(id: string): Promise<{ success: boolean }> {
    await db
      .update(tasks)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasks.id, id));

    return { success: true };
  },

  /**
   * Hard delete a task (permanently remove)
   */
  async hardDelete(id: string): Promise<{ success: boolean }> {
    // Delete related executions first
    await db.delete(taskExecutions).where(eq(taskExecutions.taskId, id));
    // Delete task
    await db.delete(tasks).where(eq(tasks.id, id));
    return { success: true };
  },

  /**
   * Retry a failed task
   */
  async retry(id: string, callbackUrl?: string): Promise<{ success: boolean; triggered: boolean }> {
    await db
      .update(tasks)
      .set({
        status: "processing",
        resultTitle: null,
        resultContent: null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id));

    let triggered = false;
    if (callbackUrl) {
      triggered = await this.triggerWebhook(id, callbackUrl);
    }

    return { success: true, triggered };
  },

  /**
   * Cancel a task
   */
  async cancel(id: string): Promise<{ success: boolean }> {
    await db
      .update(tasks)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(tasks.id, id));

    return { success: true };
  },

  /**
   * Duplicate a task
   */
  async duplicate(id: string): Promise<{ id: string; task: Task } | null> {
    const original = await this.getById(id);
    if (!original) return null;

    const [task] = await db.insert(tasks).values({
      userId: original.userId,
      topic: `${original.topic} (副本)`,
      keywords: original.keywords,
      templateId: original.templateId,
      refUrl: original.refUrl,
      articleConfig: original.articleConfig,
      coverConfig: original.coverConfig,
      status: "pending",
    }).returning();

    return { id: task!.id, task: task! };
  },

  /**
   * Restore a soft-deleted task
   */
  async restore(id: string): Promise<{ success: boolean }> {
    await db
      .update(tasks)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(tasks.id, id));

    return { success: true };
  },

  // ==================== Batch Operations ====================

  /**
   * Batch soft delete tasks
   */
  async batchDelete(ids: string[]): Promise<{ success: boolean; deletedCount: number }> {
    if (ids.length === 0) return { success: true, deletedCount: 0 };

    await db
      .update(tasks)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(inArray(tasks.id, ids));

    return { success: true, deletedCount: ids.length };
  },

  /**
   * Batch update status
   */
  async batchUpdateStatus(ids: string[], status: TaskStatus): Promise<{ success: boolean; updatedCount: number }> {
    if (ids.length === 0) return { success: true, updatedCount: 0 };

    await db
      .update(tasks)
      .set({ status, updatedAt: new Date() })
      .where(inArray(tasks.id, ids));

    return { success: true, updatedCount: ids.length };
  },

  /**
   * Batch retry failed tasks
   */
  async batchRetry(ids: string[], callbackUrl?: string): Promise<{ success: boolean; retriedCount: number }> {
    if (ids.length === 0) return { success: true, retriedCount: 0 };

    await db
      .update(tasks)
      .set({
        status: "processing",
        resultTitle: null,
        resultContent: null,
        updatedAt: new Date(),
      })
      .where(inArray(tasks.id, ids));

    // Trigger webhooks for all tasks
    if (callbackUrl) {
      for (const id of ids) {
        await this.triggerWebhook(id, callbackUrl);
      }
    }

    return { success: true, retriedCount: ids.length };
  },

  /**
   * Batch cancel tasks
   */
  async batchCancel(ids: string[]): Promise<{ success: boolean; cancelledCount: number }> {
    if (ids.length === 0) return { success: true, cancelledCount: 0 };

    await db
      .update(tasks)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(inArray(tasks.id, ids));

    return { success: true, cancelledCount: ids.length };
  },

  // ==================== Webhook Integration ====================

  /**
   * Trigger n8n webhook for a task
   */
  async triggerWebhook(taskId: string, _callbackUrl: string): Promise<boolean> {
    const webhookUrl = env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn("[TaskService] N8N_WEBHOOK_URL not configured");
      return false;
    }

    const task = await this.getById(taskId);
    if (!task) {
      console.error(`[TaskService] Task ${taskId} not found`);
      return false;
    }

    // Extract config values with defaults
    const articleConfig = task.articleConfig ?? {};
    const coverConfig = task.coverConfig ?? {};

    const style = articleConfig.style ?? "";
    const structureGuide = articleConfig.structureGuide ?? "";
    const outputSchema = articleConfig.outputSchema ?? "";
    const coverPrompt = coverConfig.prompt ?? "";
    const coverRatio = coverConfig.ratio ?? "16:9";
    const coverResolution = coverConfig.resolution ?? "1k";
    const coverModel = coverConfig.model ?? "jimeng-4.5";
    const coverMode = coverConfig.mode ?? "text2img";
    const coverNegativePrompt = coverConfig.negativePrompt ?? "模糊, 变形, 低质量, 水印, 文字";

    const payload: WebhookPayload = {
      taskId: task.id,
      topic: task.topic,
      keywords: task.keywords ?? "",
      url: task.refUrl ?? "",
      template: task.templateId ?? "",
      // Article config fields (flattened)
      style,
      structureGuide,
      outputSchema,
      // Cover config fields (flattened)
      coverPrompt,
      coverRatio,
      coverResolution,
      coverModel,
      coverMode,
      coverNegativePrompt,
      // Chinese field names for n8n compatibility
      主题: task.topic,
      关键字: task.keywords ?? "",
      写作风格: style,
      结构骨架: structureGuide,
      输出结构: outputSchema,
      封面提示词: coverPrompt,
      封面比例: coverRatio,
      封面分辨率: coverResolution,
      封面模型: coverModel,
      封面负面提示词: coverNegativePrompt,
    };

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`[TaskService] Webhook failed: ${response.status} ${response.statusText}`);
        return false;
      }

      console.log(`[TaskService] Webhook triggered for task ${taskId}`);
      return true;
    } catch (error) {
      console.error("[TaskService] Webhook error:", error);
      return false;
    }
  },

  // ==================== Export ====================

  /**
   * Export tasks as JSON
   */
  async export(options?: { ids?: string[]; status?: TaskStatus }): Promise<Task[]> {
    if (options?.ids && options.ids.length > 0) {
      return this.getByIds(options.ids);
    }

    if (options?.status) {
      return this.getByStatus(options.status);
    }

    return db
      .select()
      .from(tasks)
      .where(isNull(tasks.deletedAt))
      .orderBy(desc(tasks.createdAt));
  },

  // ==================== Execution Management ====================

  /**
   * Create a task execution record
   */
  async createExecution(taskId: string, n8nExecutionId?: string): Promise<{ id: string }> {
    const task = await this.getById(taskId);

    const [execution] = await db.insert(taskExecutions).values({
      taskId,
      n8nExecutionId,
      status: "running",
      inputSnapshot: task ? {
        topic: task.topic,
        keywords: task.keywords,
        articleConfig: task.articleConfig,
        coverConfig: task.coverConfig,
      } : undefined,
    }).returning();

    return { id: execution!.id };
  },

  /**
   * Complete a task execution
   */
  async completeExecution(
    executionId: string,
    result: {
      status: ExecutionStatus;
      errorMessage?: string;
      coverUrl?: string;
      coverR2Key?: string;
      wechatMediaId?: string;
      wechatDraftId?: string;
      articleHtml?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<{ success: boolean }> {
    const now = new Date();

    // Get execution to calculate duration
    const [execution] = await db
      .select()
      .from(taskExecutions)
      .where(eq(taskExecutions.id, executionId))
      .limit(1);

    const durationMs = execution?.startedAt
      ? now.getTime() - new Date(execution.startedAt).getTime()
      : null;

    // Build result JSONB
    const executionResult: ExecutionResult = {
      coverUrl: result.coverUrl,
      coverR2Key: result.coverR2Key,
      wechatMediaId: result.wechatMediaId,
      wechatDraftId: result.wechatDraftId,
      articleHtml: result.articleHtml,
      ...result.metadata,
    };

    await db
      .update(taskExecutions)
      .set({
        completedAt: now,
        durationMs,
        status: result.status,
        errorMessage: result.errorMessage,
        result: executionResult,
      })
      .where(eq(taskExecutions.id, executionId));

    return { success: true };
  },

  /**
   * Get executions for a task
   */
  async getExecutions(taskId: string): Promise<TaskExecution[]> {
    return db
      .select()
      .from(taskExecutions)
      .where(eq(taskExecutions.taskId, taskId))
      .orderBy(desc(taskExecutions.startedAt));
  },

  /**
   * Get latest execution for a task
   */
  async getLatestExecution(taskId: string): Promise<TaskExecution | null> {
    const [execution] = await db
      .select()
      .from(taskExecutions)
      .where(eq(taskExecutions.taskId, taskId))
      .orderBy(desc(taskExecutions.startedAt))
      .limit(1);

    return execution ?? null;
  },
};

export type TaskService = typeof taskService;
