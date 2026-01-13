import { eq, desc, and, sql, gte, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import {
  xhsImageJobs,
  xhsImages,
  type XhsImageJob,
  type XhsImage,
} from "@/server/db/schema";

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
    const updates: Partial<XhsImageJob> = {
      status,
      updatedAt: new Date(),
    };

    if (status === "completed") {
      updates.completedAt = new Date();
    }

    if (errorMessage !== undefined) {
      updates.errorMessage = errorMessage;
    }

    await db
      .update(xhsImageJobs)
      .set(updates)
      .where(eq(xhsImageJobs.id, id));

    return { success: true };
  },
};

export type XhsImageService = typeof xhsImageService;
