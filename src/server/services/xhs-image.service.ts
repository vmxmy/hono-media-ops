import { eq, desc, and, sql, gte, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import {
  xhsImageJobs,
  xhsImages,
  imagePrompts,
  type XhsImageJob,
  type XhsImage,
} from "@/server/db/schema";
import { env } from "@/env";

// ==================== Types ====================

export type XhsJobStatus = "pending" | "processing" | "completed" | "failed";
export type XhsImageType = "cover" | "content" | "ending";

export interface GetAllXhsJobsOptions {
  page: number;
  pageSize: number;
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

  async getAllJobs(options: GetAllXhsJobsOptions): Promise<{ jobs: XhsJobListItem[]; total: number }> {
    const { page, pageSize, status, userId } = options;
    const offset = (page - 1) * pageSize;

    // Build where conditions
    const conditions = [isNull(xhsImageJobs.deletedAt)];

    if (userId) {
      conditions.push(eq(xhsImageJobs.userId, userId));
    }

    if (status) {
      if (Array.isArray(status)) {
        conditions.push(sql`${xhsImageJobs.status} = ANY(${status})`);
      } else {
        conditions.push(eq(xhsImageJobs.status, status));
      }
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

  async updateJobStatus(
    id: string,
    status: XhsJobStatus,
    errorMessage?: string
  ): Promise<{ success: boolean }> {
    const now = new Date();
    const [current] = await db
      .select({
        status: xhsImageJobs.status,
        metadata: xhsImageJobs.metadata,
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
      const metadata = current?.metadata;
      const promptId = metadata && typeof metadata === "object"
        ? (metadata as Record<string, unknown>).image_prompt_id
        : undefined;

      if (typeof promptId === "string" && promptId) {
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

    // Create a new job record
    const jobId = crypto.randomUUID();
    await db.insert(xhsImageJobs).values({
      id: jobId,
      userId: input.userId,
      sourceUrl: "",
      sourceTitle: input.inputContent.slice(0, 100),
      totalImages: 0,
      completedImages: 0,
      status: "pending",
      ratio: "3:4",
      resolution: "2k",
      metadata: { image_prompt_id: input.promptId },
    });

    // Build webhook payload
    const payload = {
      job_id: jobId,
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
        console.error(`[XhsImageService] Webhook failed: ${response.status} ${response.statusText}`);
        await this.updateJobStatus(jobId, "failed", `Webhook error: ${response.status}`);
        return { success: false, jobId, message: `Webhook failed: ${response.status}` };
      }

      // Update job to processing
      await this.updateJobStatus(jobId, "processing");

      return { success: true, jobId };
    } catch (error) {
      console.error("[XhsImageService] Webhook error:", error);
      await this.updateJobStatus(jobId, "failed", error instanceof Error ? error.message : "Unknown error");
      return { success: false, jobId, message: error instanceof Error ? error.message : "Unknown error" };
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
