/**
 * Common tRPC Schemas
 * 通用的 Zod 验证模式，供所有 router 复用
 */

import { z } from "zod";

// ==================== ID Schemas ====================

/**
 * 单个 ID 验证
 */
export const idSchema = z.object({
  id: z.string().uuid(),
});

/**
 * 批量 ID 验证
 */
export const idsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

// ==================== Pagination Schemas ====================

/**
 * 分页参数
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

/**
 * 带搜索的分页参数
 */
export const paginationWithSearchSchema = paginationSchema.extend({
  search: z.string().optional(),
});

// ==================== Soft Delete Schemas ====================

/**
 * 软删除输入 (单个)
 */
export const softDeleteSchema = idSchema;

/**
 * 批量软删除输入
 */
export const batchDeleteSchema = idsSchema;

// ==================== Status Schemas ====================

/**
 * 任务状态枚举
 */
export const taskStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

/**
 * 执行状态枚举
 */
export const executionStatusSchema = z.enum([
  "running",
  "completed",
  "failed",
]);

// ==================== Type Exports ====================

export type IdInput = z.infer<typeof idSchema>;
export type IdsInput = z.infer<typeof idsSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type PaginationWithSearchInput = z.infer<typeof paginationWithSearchSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type ExecutionStatus = z.infer<typeof executionStatusSchema>;
