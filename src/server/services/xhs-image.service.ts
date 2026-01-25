import { eq, desc, and, sql, gte, isNull, lt } from "drizzle-orm";
import { db } from "@/server/db";
import {
  xhsImageJobs,
  xhsImages,
  imagePrompts,
  type XhsImageJob,
  type XhsImage,
} from "@/server/db/schema";
import { env } from "@/env";
import { buildCancelJobUpdate } from "./xhs-image-metadata";
import type { XhsImageJobStatus } from "@/lib/xhs-image-job-status";
import { buildXhsJobStatusCondition } from "./xhs-image-filters";

// ==================== Types ====================

export type XhsJobStatus = XhsImageJobStatus;
export type XhsImageType = "cover" | "content" | "ending";

export interface GetAllXhsJobsOptions {
  page: number;
  pageSize: number;
  status?: XhsJobStatus | XhsJobStatus[];
  userId?: string;
}

export interface GetAllXhsJobsInfiniteOptions {
  limit: number;
  cursor?: string; // createdAt timestamp
  status?: XhsJobStatus | XhsJobStatus[];
  userId?: string;
}

export interface XhsJobWithImages extends XhsImageJob {
  images: XhsImage[];
}

export interface XhsJobListItem extends XhsImageJob {
  imageCount: number;
}

// ==================== Service ====================

export const xhsImageService = {
  // ==================== Job Query Methods ====================

  // Infinite scroll query (cursor-based pagination)
  async getAllJobsInfinite(
    options: GetAllXhsJobsInfiniteOptions
  ): Promise<{ jobs: XhsJobListItem[]; nextCursor?: string }> {
    const { limit, cursor, status, userId } = options;

    // Build where conditions
    const conditions = [isNull(xhsImageJobs.deletedAt)];

    if (userId) {
      conditions.push(eq(xhsImageJobs.userId, userId));
    }

    const statusCondition = buildXhsJobStatusCondition(status);
    if (statusCondition) {
      conditions.push(statusCondition);
    }

    // Add cursor condition (fetch items created before cursor timestamp)
    if (cursor) {
      conditions.push(lt(xhsImageJobs.createdAt, new Date(cursor)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch limit + 1 to determine if there's a next page
    const jobs = await db
      .select({
        job: xhsImageJobs,
        imageCount: sql<number>`(
          SELECT count(*)::int FROM ${xhsImages}
          WHERE ${xhsImages.jobId} = ${xhsImageJobs.id}
        )`,
      })
      .from(xhsImageJobs)
      .where(whereClause)
      .orderBy(desc(xhsImageJobs.createdAt))
      .limit(limit + 1);

    // Check if there are more items
    const hasMore = jobs.length > limit;
    const items = hasMore ? jobs.slice(0, limit) : jobs;

    // Next cursor is the createdAt of the last item
    const nextCursor = hasMore && items.length > 0
      ? items[items.length - 1]!.job.createdAt.toISOString()
      : undefined;

    return {
      jobs: items.map((row) => ({
        ...row.job,
        imageCount: row.imageCount,
      })),
      nextCursor,
    };
  },

  // Traditional pagination (kept for compatibility)
  async getAllJobs(options: GetAllXhsJobsOptions): Promise<{ jobs: XhsJobListItem[]; total: number }> {
    const { page, pageSize, status, userId } = options;
    const offset = (page - 1) * pageSize;

    // Build where conditions
    const conditions = [isNull(xhsImageJobs.deletedAt)];

    if (userId) {
      conditions.push(eq(xhsImageJobs.userId, userId));
    }

    const statusCondition = buildXhsJobStatusCondition(status);
    if (statusCondition) {
      conditions.push(statusCondition);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(xhsImageJobs)
      .where(whereClause);

    const total = countResult?.count ?? 0;

    // Get jobs with image count
    const jobs = await db
      .select({
        job: xhsImageJobs,
        imageCount: sql<number>`(
          SELECT count(*)::int FROM ${xhsImages}
          WHERE ${xhsImages.jobId} = ${xhsImageJobs.id}
        )`,
      })
      .from(xhsImageJobs)
      .where(whereClause)
      .orderBy(desc(xhsImageJobs.createdAt))
      .limit(pageSize)
      .offset(offset);

    return {
      jobs: jobs.map((row) => ({
        ...row.job,
        imageCount: row.imageCount,
      })),
      total,
    };
  },

  async getJobById(id: string): Promise<XhsJobWithImages | null> {
    const [job] = await db
      .select()
      .from(xhsImageJobs)
      .where(and(eq(xhsImageJobs.id, id), isNull(xhsImageJobs.deletedAt)))
      .limit(1);

    if (!job) return null;

    const images = await db
      .select()
      .from(xhsImages)
      .where(eq(xhsImages.jobId, id))
      .orderBy(xhsImages.index);

    return { ...job, images };
  },

  async getJobImages(jobId: string): Promise<XhsImage[]> {
    return db
      .select()
      .from(xhsImages)
      .where(eq(xhsImages.jobId, jobId))
      .orderBy(xhsImages.index);
  },

  // ==================== Statistics ====================

  async getProcessingJobsCount(userId?: string): Promise<number> {
    const conditions = [
      isNull(xhsImageJobs.deletedAt),
      eq(xhsImageJobs.status, "processing"),
    ];

    if (userId) {
      conditions.push(eq(xhsImageJobs.userId, userId));
    }

    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(xhsImageJobs)
      .where(and(...conditions));

    return result?.count ?? 0;
  },

  // ==================== Mutation Methods ====================

  async deleteJob(id: string): Promise<{ success: boolean }> {
    await db
      .update(xhsImageJobs)
      .set({ deletedAt: new Date() })
      .where(eq(xhsImageJobs.id, id));

    return { success: true };
  },

  async cancelJob(id: string): Promise<{ success: boolean }> {
    await db
      .update(xhsImageJobs)
      .set(buildCancelJobUpdate(new Date()))
      .where(eq(xhsImageJobs.id, id));

    return { success: true };
  },

  async retryJob(id: string): Promise<{ success: boolean; jobId?: string; message?: string }> {
    const [job] = await db
      .select({
        userId: xhsImageJobs.userId,
        imagePromptId: xhsImageJobs.imagePromptId,
        inputContent: xhsImageJobs.inputContent,
      })
      .from(xhsImageJobs)
      .where(and(eq(xhsImageJobs.id, id), isNull(xhsImageJobs.deletedAt)))
      .limit(1);

    if (!job?.userId) {
      return { success: false, message: "Job not found" };
    }

    if (!job.imagePromptId || !job.inputContent) {
      return { success: false, message: "此任务缺少必要信息,无法重试。请创建新任务。" };
    }

    return this.triggerGeneration({
      userId: job.userId,
      inputContent: job.inputContent,
      promptId: job.imagePromptId,
    });
  },

  async updateJobStatus(
    id: string,
    status: XhsJobStatus,
    errorMessage?: string
  ): Promise<{ success: boolean }> {
    const now = new Date();
    const [current] = await db
      .select({
        status: xhsImageJobs.status,
        imagePromptId: xhsImageJobs.imagePromptId,
      })
      .from(xhsImageJobs)
      .where(eq(xhsImageJobs.id, id))
      .limit(1);

    const updates: Partial<XhsImageJob> = {
      status,
      updatedAt: now,
    };

    if (status === "completed") {
      updates.completedAt = now;
    }

    if (errorMessage !== undefined) {
      updates.errorMessage = errorMessage;
    }

    await db
      .update(xhsImageJobs)
      .set(updates)
      .where(eq(xhsImageJobs.id, id));

    const shouldCountUsage = current?.status !== "completed" && status === "completed";
    if (shouldCountUsage) {
      const promptId = current?.imagePromptId;

      if (promptId) {
        await db
          .update(imagePrompts)
          .set({
            useCount: sql<number>`${imagePrompts.useCount} + 1`,
            lastUsedAt: now,
            updatedAt: now,
          })
          .where(eq(imagePrompts.id, promptId));
      }
    }

    return { success: true };
  },

  // ==================== Generation ====================

  async triggerGeneration(input: {
    userId: string;
    inputContent: string;
    promptId: string;
  }): Promise<{ success: boolean; jobId?: string; message?: string }> {
    const webhookUrl = env.N8N_XHS_IMAGE_WEBHOOK_URL;
    console.log("[XhsImageService] triggerGeneration - webhookUrl:", webhookUrl);

    if (!webhookUrl) {
      console.warn("[XhsImageService] N8N_XHS_IMAGE_WEBHOOK_URL not configured");
      return { success: false, message: "Webhook URL not configured" };
    }

    // Build webhook payload - webhook will generate job_id and create DB record
    const payload = {
      user_id: input.userId,
      input_content: input.inputContent,
      prompt_id: input.promptId,
    };

    console.log("[XhsImageService] Sending webhook payload:", payload);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("[XhsImageService] Webhook response status:", response.status);

      if (!response.ok) {
        const errorMsg = `Webhook error: ${response.status}`;
        console.error(`[XhsImageService] ${errorMsg}`);
        return { success: false, message: errorMsg };
      }

      // Parse webhook response to get job_id
      const result = await response.json() as { job_id?: string };
      const jobId = result.job_id;

      if (!jobId) {
        console.error("[XhsImageService] Webhook response missing job_id");
        return { success: false, message: "Webhook response missing job_id" };
      }

      console.log("[XhsImageService] Job created with ID:", jobId);
      return { success: true, jobId };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("[XhsImageService] Webhook error:", error);
      return { success: false, message: errorMsg };
    }
  },

  // ==================== Publish to XHS ====================

  async publishToXhs(jobId: string): Promise<{ success: boolean; message?: string }> {
    const webhookUrl = env.N8N_XHS_PUBLISH_WEBHOOK_URL;
    console.log("[XhsImageService] publishToXhs - webhookUrl:", webhookUrl);

    if (!webhookUrl) {
      console.warn("[XhsImageService] N8N_XHS_PUBLISH_WEBHOOK_URL not configured");
      return { success: false, message: "Publish webhook URL not configured" };
    }

    // Get job with images
    const job = await this.getJobById(jobId);
    if (!job) {
      return { success: false, message: "Job not found" };
    }

    if (job.status !== "completed") {
      return { success: false, message: "Job is not completed yet" };
    }

    // Collect images with their content info
    const imagesWithContent = job.images
      .filter(img => img.r2Url)
      .map(img => ({
        url: img.r2Url as string,
        index: img.index,
        type: img.type,
        core_message: img.coreMessage ?? null,
        text_content: img.textContent ?? null,
      }));

    if (imagesWithContent.length === 0) {
      return { success: false, message: "No images available for publishing" };
    }

    // Build webhook payload with enhanced image data
    const payload = {
      job_id: jobId,
      source_url: job.sourceUrl,
      source_title: job.sourceTitle,
      images: imagesWithContent,
    };

    console.log("[XhsImageService] Sending publish webhook payload:", payload);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("[XhsImageService] Publish webhook response status:", response.status);

      if (!response.ok) {
        console.error(`[XhsImageService] Publish webhook failed: ${response.status} ${response.statusText}`);
        return { success: false, message: `Webhook failed: ${response.status}` };
      }

      return { success: true };
    } catch (error) {
      console.error("[XhsImageService] Publish webhook error:", error);
      return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
    }
  },
};

export type XhsImageService = typeof xhsImageService;
