import { eq, desc, like, and, isNull, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { imagePrompts, type ImagePrompt } from "@/server/db/schema";

// ==================== Types ====================

export interface CreateImagePromptInput {
  userId?: string;
  title: string;
  prompt: string;
  negativePrompt?: string;
  model?: string;
  ratio?: string;
  resolution?: string;
  category?: string;
  tags?: string[];
  previewUrl?: string;
  previewR2Key?: string;
  source?: "manual" | "ai" | "imported";
  sourceRef?: string;
  isPublic?: boolean;
  rating?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateImagePromptInput {
  id: string;
  title?: string;
  prompt?: string;
  negativePrompt?: string;
  model?: string;
  ratio?: string;
  resolution?: string;
  category?: string;
  tags?: string[];
  previewUrl?: string;
  previewR2Key?: string;
  isPublic?: boolean;
  rating?: number;
  metadata?: Record<string, unknown>;
}

export interface GetAllInput {
  userId?: string;
  category?: string;
  search?: string;
  isPublic?: boolean;
  page?: number;
  pageSize?: number;
}

// ==================== Service ====================

export const imagePromptService = {
  /**
   * Get all image prompts with filtering and pagination
   */
  async getAll(input: GetAllInput = {}): Promise<{
    items: ImagePrompt[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { userId, category, search, isPublic, page = 1, pageSize = 20 } = input;

    const conditions = [isNull(imagePrompts.deletedAt)];

    // Filter by user (show user's own + public prompts)
    if (userId) {
      conditions.push(
        or(
          eq(imagePrompts.userId, userId),
          eq(imagePrompts.isPublic, 1)
        )!
      );
    }

    if (category) {
      conditions.push(eq(imagePrompts.category, category));
    }

    if (search) {
      conditions.push(
        or(
          like(imagePrompts.title, `%${search}%`),
          like(imagePrompts.prompt, `%${search}%`)
        )!
      );
    }

    if (isPublic !== undefined) {
      conditions.push(eq(imagePrompts.isPublic, isPublic ? 1 : 0));
    }

    const whereClause = and(...conditions);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(imagePrompts)
      .where(whereClause);

    // Get paginated items
    const items = await db
      .select()
      .from(imagePrompts)
      .where(whereClause)
      .orderBy(desc(imagePrompts.useCount), desc(imagePrompts.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      items,
      total: count,
      page,
      pageSize,
    };
  },

  /**
   * Get image prompt by ID
   */
  async getById(id: string): Promise<ImagePrompt | null> {
    const [prompt] = await db
      .select()
      .from(imagePrompts)
      .where(and(eq(imagePrompts.id, id), isNull(imagePrompts.deletedAt)))
      .limit(1);

    return prompt ?? null;
  },

  /**
   * Get prompts by category
   */
  async getByCategory(category: string, userId?: string): Promise<ImagePrompt[]> {
    const conditions = [
      eq(imagePrompts.category, category),
      isNull(imagePrompts.deletedAt),
    ];

    if (userId) {
      conditions.push(
        or(
          eq(imagePrompts.userId, userId),
          eq(imagePrompts.isPublic, 1)
        )!
      );
    }

    return db
      .select()
      .from(imagePrompts)
      .where(and(...conditions))
      .orderBy(desc(imagePrompts.useCount), desc(imagePrompts.createdAt));
  },

  /**
   * Search prompts by title or content
   */
  async search(query: string, userId?: string): Promise<ImagePrompt[]> {
    const conditions = [
      isNull(imagePrompts.deletedAt),
      or(
        like(imagePrompts.title, `%${query}%`),
        like(imagePrompts.prompt, `%${query}%`)
      )!,
    ];

    if (userId) {
      conditions.push(
        or(
          eq(imagePrompts.userId, userId),
          eq(imagePrompts.isPublic, 1)
        )!
      );
    }

    return db
      .select()
      .from(imagePrompts)
      .where(and(...conditions))
      .orderBy(desc(imagePrompts.useCount), desc(imagePrompts.createdAt));
  },

  /**
   * Create a new image prompt
   */
  async create(input: CreateImagePromptInput): Promise<{ id: string; prompt: ImagePrompt }> {
    const [prompt] = await db.insert(imagePrompts).values({
      userId: input.userId,
      title: input.title,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      model: input.model ?? "jimeng-4.5",
      ratio: input.ratio ?? "1:1",
      resolution: input.resolution ?? "2k",
      category: input.category ?? "general",
      tags: input.tags,
      previewUrl: input.previewUrl,
      previewR2Key: input.previewR2Key,
      source: input.source ?? "manual",
      sourceRef: input.sourceRef,
      isPublic: input.isPublic ? 1 : 0,
      rating: input.rating ?? 0,
      metadata: input.metadata,
    }).returning();

    return { id: prompt!.id, prompt: prompt! };
  },

  /**
   * Update an image prompt
   */
  async update(input: UpdateImagePromptInput): Promise<{ success: boolean }> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.prompt !== undefined) updateData.prompt = input.prompt;
    if (input.negativePrompt !== undefined) updateData.negativePrompt = input.negativePrompt;
    if (input.model !== undefined) updateData.model = input.model;
    if (input.ratio !== undefined) updateData.ratio = input.ratio;
    if (input.resolution !== undefined) updateData.resolution = input.resolution;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.previewUrl !== undefined) updateData.previewUrl = input.previewUrl;
    if (input.previewR2Key !== undefined) updateData.previewR2Key = input.previewR2Key;
    if (input.isPublic !== undefined) updateData.isPublic = input.isPublic ? 1 : 0;
    if (input.rating !== undefined) updateData.rating = input.rating;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    await db
      .update(imagePrompts)
      .set(updateData)
      .where(eq(imagePrompts.id, input.id));

    return { success: true };
  },

  /**
   * Increment use count
   */
  async incrementUseCount(id: string): Promise<{ success: boolean }> {
    await db
      .update(imagePrompts)
      .set({
        useCount: sql`${imagePrompts.useCount} + 1`,
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(imagePrompts.id, id));

    return { success: true };
  },

  /**
   * Update rating
   */
  async updateRating(id: string, rating: number): Promise<{ success: boolean }> {
    await db
      .update(imagePrompts)
      .set({
        rating: Math.min(5, Math.max(0, rating)),
        updatedAt: new Date(),
      })
      .where(eq(imagePrompts.id, id));

    return { success: true };
  },

  /**
   * Toggle public status
   */
  async togglePublic(id: string): Promise<{ success: boolean; isPublic: boolean }> {
    const [current] = await db
      .select({ isPublic: imagePrompts.isPublic })
      .from(imagePrompts)
      .where(eq(imagePrompts.id, id))
      .limit(1);

    if (!current) {
      throw new Error("Image prompt not found");
    }

    const newIsPublic = current.isPublic === 0 ? 1 : 0;

    await db
      .update(imagePrompts)
      .set({
        isPublic: newIsPublic,
        updatedAt: new Date(),
      })
      .where(eq(imagePrompts.id, id));

    return { success: true, isPublic: newIsPublic === 1 };
  },

  /**
   * Soft delete an image prompt
   */
  async delete(id: string): Promise<{ success: boolean }> {
    await db
      .update(imagePrompts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(imagePrompts.id, id));

    return { success: true };
  },

  /**
   * Batch delete image prompts
   */
  async batchDelete(ids: string[]): Promise<{ success: boolean; deletedCount: number }> {
    const result = await db
      .update(imagePrompts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(
        sql`${imagePrompts.id} = ANY(${ids})`,
        isNull(imagePrompts.deletedAt)
      ));

    return { success: true, deletedCount: ids.length };
  },

  /**
   * Get all categories
   */
  async getCategories(): Promise<string[]> {
    const results = await db
      .selectDistinct({ category: imagePrompts.category })
      .from(imagePrompts)
      .where(isNull(imagePrompts.deletedAt));

    return results
      .map((r) => r.category)
      .filter((c): c is string => c !== null);
  },

  /**
   * Get top prompts by use count
   */
  async getTopPrompts(limit: number = 10): Promise<ImagePrompt[]> {
    return db
      .select()
      .from(imagePrompts)
      .where(and(
        isNull(imagePrompts.deletedAt),
        eq(imagePrompts.isPublic, 1)
      ))
      .orderBy(desc(imagePrompts.useCount))
      .limit(limit);
  },

  /**
   * Duplicate a prompt
   */
  async duplicate(id: string, userId: string): Promise<{ id: string; prompt: ImagePrompt }> {
    const original = await this.getById(id);
    if (!original) {
      throw new Error("Image prompt not found");
    }

    return this.create({
      userId,
      title: `${original.title} (复制)`,
      prompt: original.prompt,
      negativePrompt: original.negativePrompt ?? undefined,
      model: original.model ?? undefined,
      ratio: original.ratio ?? undefined,
      resolution: original.resolution ?? undefined,
      category: original.category ?? undefined,
      tags: original.tags ?? undefined,
      source: "manual",
      isPublic: false,
      rating: 0,
      metadata: original.metadata ?? undefined,
    });
  },
};

export type ImagePromptService = typeof imagePromptService;
