import { eq, desc, like, and, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { prompts, type Prompt } from "@/server/db/schema";

// ==================== Types ====================

export interface CreatePromptInput {
  name: string;
  content: string;
  category?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdatePromptInput {
  id: string;
  name?: string;
  content?: string;
  category?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

// ==================== Service ====================

export const promptService = {
  /**
   * Get all prompts (excluding soft-deleted)
   */
  async getAll(): Promise<Prompt[]> {
    return db
      .select()
      .from(prompts)
      .where(isNull(prompts.deletedAt))
      .orderBy(desc(prompts.createdAt));
  },

  /**
   * Get prompt by ID
   */
  async getById(id: string): Promise<Prompt | null> {
    const [prompt] = await db
      .select()
      .from(prompts)
      .where(and(eq(prompts.id, id), isNull(prompts.deletedAt)))
      .limit(1);

    return prompt ?? null;
  },

  /**
   * Get prompts by category
   */
  async getByCategory(category: string): Promise<Prompt[]> {
    return db
      .select()
      .from(prompts)
      .where(and(eq(prompts.category, category), isNull(prompts.deletedAt)))
      .orderBy(desc(prompts.createdAt));
  },

  /**
   * Search prompts by name
   */
  async search(query: string): Promise<Prompt[]> {
    return db
      .select()
      .from(prompts)
      .where(
        and(
          isNull(prompts.deletedAt),
          like(prompts.name, `%${query}%`)
        )
      )
      .orderBy(desc(prompts.createdAt));
  },

  /**
   * Create a new prompt
   */
  async create(input: CreatePromptInput): Promise<{ id: string; prompt: Prompt }> {
    const [prompt] = await db.insert(prompts).values({
      name: input.name,
      content: input.content,
      category: input.category ?? "default",
      description: input.description,
      metadata: input.metadata,
    }).returning();

    return { id: prompt!.id, prompt: prompt! };
  },

  /**
   * Update a prompt
   */
  async update(input: UpdatePromptInput): Promise<{ success: boolean }> {
    const updateData: Partial<Prompt> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    await db
      .update(prompts)
      .set(updateData)
      .where(eq(prompts.id, input.id));

    return { success: true };
  },

  /**
   * Soft delete a prompt
   */
  async delete(id: string): Promise<{ success: boolean }> {
    await db
      .update(prompts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(prompts.id, id));

    return { success: true };
  },

  /**
   * Hard delete a prompt (permanently remove)
   */
  async hardDelete(id: string): Promise<{ success: boolean }> {
    await db.delete(prompts).where(eq(prompts.id, id));
    return { success: true };
  },

  /**
   * Restore a soft-deleted prompt
   */
  async restore(id: string): Promise<{ success: boolean }> {
    await db
      .update(prompts)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(prompts.id, id));

    return { success: true };
  },

  /**
   * Get all categories
   */
  async getCategories(): Promise<string[]> {
    const results = await db
      .selectDistinct({ category: prompts.category })
      .from(prompts)
      .where(isNull(prompts.deletedAt));

    return results
      .map((r) => r.category)
      .filter((c): c is string => c !== null);
  },
};

export type PromptService = typeof promptService;
