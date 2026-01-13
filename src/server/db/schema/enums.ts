/**
 * Database Enum Types
 */

import { pgEnum } from "drizzle-orm/pg-core";

// ==================== Task & Execution Enums ====================

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const executionStatusEnum = pgEnum("execution_status", [
  "running",
  "completed",
  "failed",
]);

// ==================== Style Analysis Enums ====================

export const reverseLogStatusEnum = pgEnum("reverse_log_status", [
  "PENDING",
  "SUCCESS",
  "FAILED",
]);

// ==================== Storage Enums ====================

export const storageProviderEnum = pgEnum("storage_provider", [
  "local",
  "r2",
  "s3",
]);

// ==================== XHS (Xiaohongshu) Enums ====================

export const xhsImageTypeEnum = pgEnum("xhs_image_type", [
  "cover",    // 封面
  "content",  // 正文
  "ending",   // 结尾
]);

export const xhsJobStatusEnum = pgEnum("xhs_job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

// ==================== Image Prompt Enums ====================

export const imagePromptSourceEnum = pgEnum("image_prompt_source", [
  "manual",    // 手动创建
  "ai",        // AI 生成
  "imported",  // 导入
]);
