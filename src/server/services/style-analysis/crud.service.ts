/**
 * Style Analysis CRUD Service
 * Handles create, read, update, delete operations for style analyses
 */

import { eq, desc, like, and, or, sql, inArray, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { styleAnalyses, pipelines, type StyleAnalysis } from "@/server/db/schema";
import { generateExecutionPrompt, generateExecutionPromptPreview } from "@/lib/style-analysis";
import type {
  GetAllStyleAnalysesOptions,
  CreateStyleAnalysisInput,
  UpdateStyleAnalysisInput,
  StyleAnalysisListItem,
  GetAllStyleAnalysesResult,
} from "./types";

// ==================== CRUD Service ====================

export const styleAnalysisCrudService = {
  /**
   * Get all style analyses with pagination and filtering
   * Only selects fields needed for list display to optimize performance
   */
  async getAll(options: GetAllStyleAnalysesOptions): Promise<GetAllStyleAnalysesResult> {
    const { page, pageSize, search, primaryType, status, userId, sortMode } = options;
    const offset = (page - 1) * pageSize;

    const conditions = [];

    // 多字段模糊搜索: sourceTitle, styleName, primaryType
    // 注意：不搜索 executionPrompt，因为它是大文本字段，LIKE 查询极慢
    // 如需搜索提示词内容，使用向量搜索 (hybridSearch)
    if (search) {
      const searchCondition = or(
        like(styleAnalyses.sourceTitle, `%${search}%`),
        like(styleAnalyses.styleName, `%${search}%`),
        like(styleAnalyses.primaryType, `%${search}%`)
      );
      if (searchCondition) conditions.push(searchCondition);
    }
    if (primaryType) {
      conditions.push(eq(styleAnalyses.primaryType, primaryType));
    }
    if (status) {
      conditions.push(eq(styleAnalyses.status, status as "PENDING" | "SUCCESS" | "FAILED"));
    }
    if (userId) {
      conditions.push(eq(styleAnalyses.userId, userId));
    }
    // 排除已删除
    conditions.push(sql`${styleAnalyses.deletedAt} IS NULL`);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Select fields needed for card display (includes JSONB for tabs, excludes rawJsonFull)
    const orderByClause = sortMode === "reverse"
      ? [desc(sql`use_count`), desc(sql`coalesce(${styleAnalyses.updatedAt}, ${styleAnalyses.createdAt})`)]
      : [desc(sql`use_count`), desc(styleAnalyses.updatedAt)];

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: styleAnalyses.id,
          userId: styleAnalyses.userId,
          createdAt: styleAnalyses.createdAt,
          updatedAt: styleAnalyses.updatedAt,
          sourceUrl: styleAnalyses.sourceUrl,
          sourceTitle: styleAnalyses.sourceTitle,
          styleName: styleAnalyses.styleName,
          primaryType: styleAnalyses.primaryType,
          analysisVersion: styleAnalyses.analysisVersion,
          wordCount: styleAnalyses.wordCount,
          paraCount: styleAnalyses.paraCount,
          metricsBurstiness: styleAnalyses.metricsBurstiness,
          metricsTtr: styleAnalyses.metricsTtr,
          status: styleAnalyses.status,
          // JSONB fields for tabs
          styleIdentity: styleAnalyses.styleIdentity,
          lexicalLogic: styleAnalyses.lexicalLogic,
          metricsConstraints: styleAnalyses.metricsConstraints,
          rhetoricLogic: styleAnalyses.rhetoricLogic,
          coreRules: styleAnalyses.coreRules,
          blueprint: styleAnalyses.blueprint,
          antiPatterns: styleAnalyses.antiPatterns,
          goldenSample: styleAnalyses.goldenSample,
          transferDemo: styleAnalyses.transferDemo,
          executionPrompt: styleAnalyses.executionPrompt,
          useCount: sql<number>`(
            SELECT count(*)
            FROM ${pipelines}
            WHERE ${pipelines.styleAnalysisId} = "style_analyses"."id"
              AND ${pipelines.deletedAt} IS NULL
          )::int`.as("use_count"),
        })
        .from(styleAnalyses)
        .where(whereClause)
        .orderBy(...orderByClause)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(styleAnalyses)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count ?? 0;

    return {
      logs: data as StyleAnalysisListItem[],
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  /**
   * Get a single analysis by ID
   */
  async getById(id: string): Promise<StyleAnalysis | null> {
    const [analysis] = await db
      .select()
      .from(styleAnalyses)
      .where(and(
        eq(styleAnalyses.id, id),
        sql`${styleAnalyses.deletedAt} IS NULL`
      ))
      .limit(1);

    return analysis ?? null;
  },

  /**
   * Get analysis by source URL (includes soft-deleted for upsert)
   */
  async getBySourceUrl(sourceUrl: string, includeDeleted = false): Promise<StyleAnalysis | null> {
    const conditions = [eq(styleAnalyses.sourceUrl, sourceUrl)];
    if (!includeDeleted) {
      conditions.push(sql`${styleAnalyses.deletedAt} IS NULL`);
    }

    const [analysis] = await db
      .select()
      .from(styleAnalyses)
      .where(and(...conditions))
      .limit(1);

    return analysis ?? null;
  },

  /**
   * Get analyses by user ID
   */
  async getByUserId(userId: string): Promise<StyleAnalysis[]> {
    return db
      .select()
      .from(styleAnalyses)
      .where(and(
        eq(styleAnalyses.userId, userId),
        sql`${styleAnalyses.deletedAt} IS NULL`
      ))
      .orderBy(desc(styleAnalyses.createdAt));
  },

  /**
   * Create a new style analysis
   */
  async create(input: CreateStyleAnalysisInput): Promise<{ id: string; analysis: StyleAnalysis }> {
    // Extract fallback values from rawJsonFull.meta_info if available
    const rawJson = input.rawJsonFull as Record<string, unknown> | undefined;
    const metaInfo = rawJson?.meta_info as Record<string, unknown> | undefined;
    const styleIdentity = input.styleIdentity as Record<string, unknown> | undefined;

    // Default status to SUCCESS unless explicitly specified
    const derivedStatus = input.status ?? "SUCCESS";

    const [analysis] = await db.insert(styleAnalyses).values({
      userId: input.userId,
      sourceUrl: input.sourceUrl,
      sourceTitle: input.sourceTitle ?? (metaInfo?.source_title as string),
      styleName: input.styleName ?? (metaInfo?.style_name as string) ?? (styleIdentity?.style_name as string),
      primaryType: input.primaryType ?? (metaInfo?.primary_type as string),
      analysisVersion: input.analysisVersion ?? (metaInfo?.version as string),
      executionPrompt: input.executionPrompt,
      wordCount: input.wordCount ?? (metaInfo?.word_count as number),
      paraCount: input.paraCount ?? (metaInfo?.para_count as number),
      metricsBurstiness: input.metricsBurstiness ?? (metaInfo?.burstiness as number),
      metricsTtr: input.metricsTtr ?? (metaInfo?.ttr as number),
      metricsAvgSentLen: input.metricsAvgSentLen ?? (metaInfo?.avg_sent_len as number),
      styleIdentity: input.styleIdentity,
      metricsConstraints: input.metricsConstraints,
      lexicalLogic: input.lexicalLogic,
      rhetoricLogic: input.rhetoricLogic,
      goldenSample: input.goldenSample,
      transferDemo: input.transferDemo,
      coreRules: input.coreRules,
      blueprint: input.blueprint,
      antiPatterns: input.antiPatterns,
      rawJsonFull: input.rawJsonFull,
      metadata: input.metadata,
      status: derivedStatus,
    }).returning();

    return { id: analysis!.id, analysis: analysis! };
  },

  /**
   * Upsert by source URL (auto-restores soft-deleted records)
   */
  async upsert(input: CreateStyleAnalysisInput): Promise<{ id: string; analysis: StyleAnalysis; created: boolean }> {
    if (!input.sourceUrl) {
      const result = await this.create(input);
      return { ...result, created: true };
    }

    // Include soft-deleted records in lookup
    const existing = await this.getBySourceUrl(input.sourceUrl, true);
    if (existing) {
      // Extract fallback values from rawJsonFull.meta_info if available
      const inputRawJson = input.rawJsonFull as Record<string, unknown> | undefined;
      const existingRawJson = existing.rawJsonFull as Record<string, unknown> | undefined;
      const metaInfo = (inputRawJson?.meta_info ?? existingRawJson?.meta_info) as Record<string, unknown> | undefined;
      const styleIdentity = (input.styleIdentity ?? existing.styleIdentity) as Record<string, unknown> | undefined;

      // Default status to SUCCESS unless explicitly specified
      const derivedStatus = input.status ?? "SUCCESS";

      // Update existing (and restore if soft-deleted)
      const [updated] = await db
        .update(styleAnalyses)
        .set({
          sourceTitle: input.sourceTitle ?? (metaInfo?.source_title as string) ?? existing.sourceTitle,
          styleName: input.styleName ?? (metaInfo?.style_name as string) ?? (styleIdentity?.style_name as string) ?? existing.styleName,
          primaryType: input.primaryType ?? (metaInfo?.primary_type as string) ?? existing.primaryType,
          analysisVersion: input.analysisVersion ?? (metaInfo?.version as string) ?? existing.analysisVersion,
          executionPrompt: input.executionPrompt ?? existing.executionPrompt,
          wordCount: input.wordCount ?? (metaInfo?.word_count as number) ?? existing.wordCount,
          paraCount: input.paraCount ?? (metaInfo?.para_count as number) ?? existing.paraCount,
          metricsBurstiness: input.metricsBurstiness ?? (metaInfo?.burstiness as number) ?? existing.metricsBurstiness,
          metricsTtr: input.metricsTtr ?? (metaInfo?.ttr as number) ?? existing.metricsTtr,
          metricsAvgSentLen: input.metricsAvgSentLen ?? (metaInfo?.avg_sent_len as number) ?? existing.metricsAvgSentLen,
          styleIdentity: input.styleIdentity ?? existing.styleIdentity,
          metricsConstraints: input.metricsConstraints ?? existing.metricsConstraints,
          lexicalLogic: input.lexicalLogic ?? existing.lexicalLogic,
          rhetoricLogic: input.rhetoricLogic ?? existing.rhetoricLogic,
          goldenSample: input.goldenSample ?? existing.goldenSample,
          transferDemo: input.transferDemo ?? existing.transferDemo,
          coreRules: input.coreRules ?? existing.coreRules,
          blueprint: input.blueprint ?? existing.blueprint,
          antiPatterns: input.antiPatterns ?? existing.antiPatterns,
          rawJsonFull: input.rawJsonFull ?? existing.rawJsonFull,
          metadata: input.metadata ?? existing.metadata,
          status: derivedStatus,
          updatedAt: new Date(),
          deletedAt: null, // Auto-restore soft-deleted records
        })
        .where(eq(styleAnalyses.id, existing.id))
        .returning();
      return { id: updated!.id, analysis: updated!, created: false };
    }

    const result = await this.create(input);
    return { ...result, created: true };
  },

  /**
   * Update an existing analysis
   */
  async update(input: UpdateStyleAnalysisInput): Promise<{ success: boolean }> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (input.sourceTitle !== undefined) updateData.sourceTitle = input.sourceTitle;
    if (input.styleName !== undefined) updateData.styleName = input.styleName;
    if (input.primaryType !== undefined) updateData.primaryType = input.primaryType;
    if (input.analysisVersion !== undefined) updateData.analysisVersion = input.analysisVersion;
    if (input.executionPrompt !== undefined) updateData.executionPrompt = input.executionPrompt;
    if (input.styleIdentity !== undefined) updateData.styleIdentity = input.styleIdentity;
    if (input.metricsConstraints !== undefined) updateData.metricsConstraints = input.metricsConstraints;
    if (input.lexicalLogic !== undefined) updateData.lexicalLogic = input.lexicalLogic;
    if (input.rhetoricLogic !== undefined) updateData.rhetoricLogic = input.rhetoricLogic;
    if (input.goldenSample !== undefined) updateData.goldenSample = input.goldenSample;
    if (input.transferDemo !== undefined) updateData.transferDemo = input.transferDemo;
    if (input.coreRules !== undefined) updateData.coreRules = input.coreRules;
    if (input.blueprint !== undefined) updateData.blueprint = input.blueprint;
    if (input.antiPatterns !== undefined) updateData.antiPatterns = input.antiPatterns;
    if (input.status !== undefined) updateData.status = input.status;

    await db
      .update(styleAnalyses)
      .set(updateData)
      .where(eq(styleAnalyses.id, input.id));

    return { success: true };
  },

  /**
   * Hard delete a single analysis
   */
  async delete(id: string): Promise<{ success: boolean }> {
    await db
      .delete(styleAnalyses)
      .where(eq(styleAnalyses.id, id));
    return { success: true };
  },

  /**
   * Batch hard delete analyses by IDs
   */
  async batchDelete(ids: string[]): Promise<{ success: boolean; deletedCount: number }> {
    if (ids.length === 0) return { success: true, deletedCount: 0 };

    await db
      .delete(styleAnalyses)
      .where(inArray(styleAnalyses.id, ids));

    return { success: true, deletedCount: ids.length };
  },

  /**
   * Get all distinct primary types
   */
  async getPrimaryTypes(): Promise<string[]> {
    const result = await db
      .select({ primaryType: styleAnalyses.primaryType })
      .from(styleAnalyses)
      .where(and(
        sql`${styleAnalyses.primaryType} IS NOT NULL`,
        sql`${styleAnalyses.deletedAt} IS NULL`
      ))
      .groupBy(styleAnalyses.primaryType);

    return result.map((r) => r.primaryType).filter((t): t is string => t !== null && t !== '');
  },

  /**
   * Export analyses (optionally filtered by IDs)
   */
  async export(ids?: string[]): Promise<StyleAnalysis[]> {
    const baseCondition = sql`${styleAnalyses.deletedAt} IS NULL`;

    if (ids && ids.length > 0) {
      return db
        .select()
        .from(styleAnalyses)
        .where(and(baseCondition, inArray(styleAnalyses.id, ids)));
    }

    return db
      .select()
      .from(styleAnalyses)
      .where(baseCondition)
      .orderBy(desc(styleAnalyses.createdAt));
  },

  // ==================== Execution Prompt Generation ====================

  /**
   * 从 StyleAnalysis 记录动态生成 execution_prompt
   * 替代 LLM 单独输出，节省 token 并消除截断问题
   */
  generateExecutionPromptFromRecord(analysis: StyleAnalysis): string {
    return generateExecutionPrompt({
      styleName: analysis.styleName,
      paraCount: analysis.paraCount,
      styleIdentity: analysis.styleIdentity,
      metricsConstraints: analysis.metricsConstraints,
      lexicalLogic: analysis.lexicalLogic,
      rhetoricLogic: analysis.rhetoricLogic,
      goldenSample: analysis.goldenSample,
      coreRules: analysis.coreRules,
      blueprint: analysis.blueprint,
      antiPatterns: analysis.antiPatterns,
    });
  },

  /**
   * 生成简洁版预览（用于列表展示）
   */
  generateExecutionPromptPreviewFromRecord(analysis: StyleAnalysis): string {
    return generateExecutionPromptPreview({
      styleName: analysis.styleName,
      paraCount: analysis.paraCount,
      styleIdentity: analysis.styleIdentity,
      blueprint: analysis.blueprint,
    });
  },

  /**
   * 获取记录并附带动态生成的 execution_prompt
   */
  async getByIdWithExecutionPrompt(id: string): Promise<(StyleAnalysis & { generatedExecutionPrompt: string }) | null> {
    const analysis = await this.getById(id);
    if (!analysis) return null;

    return {
      ...analysis,
      generatedExecutionPrompt: this.generateExecutionPromptFromRecord(analysis),
    };
  },
};

export type StyleAnalysisCrudService = typeof styleAnalysisCrudService;
