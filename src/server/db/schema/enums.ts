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
  "single",   // 单图
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

// ==================== Pipeline Enums ====================

export const pipelineStatusEnum = pgEnum("pipeline_status", [
  "analyzing",         // 正在分析风格
  "pending_selection", // 等待用户选择封面
  "processing",        // 正在生成
  "completed",         // 完成
  "failed",            // 失败
]);
