// ==================== Service Exports ====================
// Centralized export for all services

export { taskService } from "./task.service";
export type { TaskService, GetAllTasksOptions, CreateTaskInput, UpdateTaskStatusInput, TaskWithMaterial } from "./task.service";

export { imagePromptService } from "./image-prompt.service";
export type { ImagePromptService, CreateImagePromptInput, UpdateImagePromptInput, GetAllInput as GetAllImagePromptsInput, ImagePromptListItem } from "./image-prompt.service";

export { styleAnalysisService } from "./style-analysis.service";
export type {
  StyleAnalysisService,
  GetAllStyleAnalysesOptions,
  CreateStyleAnalysisInput,
  UpdateStyleAnalysisInput,
  // Domain types
  UserStyleProfile,
  MetricsTrendPoint,
} from "./style-analysis.service";

export { articleService } from "./article.service";
export type { ArticleService, PublishedArticle, ArticleListItem, GetPublishedInput } from "./article.service";

export { embeddingService } from "./embedding.service";
export type { EmbeddingService, VectorSearchResult } from "./embedding.service";

export { storageService } from "./storage.service";
export type { StorageService, GetPresignedUrlInput, GetPresignedUrlResult } from "./storage.service";

export { userStorageConfigService } from "./user-storage-config.service";
export type {
  UserStorageConfigService,
  UserStorageConfigInput,
  UserStorageConfigSafeOutput,
  StorageProvider,
} from "./user-storage-config.service";

export { exportService } from "./export.service";
export type { ExportService, WechatExportOptions, WechatExportResult, MarkdownExportResult } from "./export.service";

export { chapterService } from "./chapter.service";
export type { ChapterService, ChapterOutputItem } from "./chapter.service";

export { xhsImageService } from "./xhs-image.service";
export type {
  XhsImageService,
  XhsJobStatus,
  XhsImageType,
  GetAllXhsJobsOptions,
  XhsJobWithImages,
  XhsJobListItem,
} from "./xhs-image.service";

// Backwards compatibility alias
export { styleAnalysisService as reverseLogService } from "./style-analysis.service";

// ==================== Services Aggregate ====================
// For injection into tRPC context

import { taskService } from "./task.service";
import { imagePromptService } from "./image-prompt.service";
import { styleAnalysisService } from "./style-analysis.service";
import { articleService } from "./article.service";
import { embeddingService } from "./embedding.service";
import { storageService } from "./storage.service";
import { userStorageConfigService } from "./user-storage-config.service";
import { exportService } from "./export.service";
import { chapterService } from "./chapter.service";
import { xhsImageService } from "./xhs-image.service";

export const services = {
  task: taskService,
  imagePrompt: imagePromptService,
  styleAnalysis: styleAnalysisService,
  article: articleService,
  embedding: embeddingService,
  storage: storageService,
  userStorageConfig: userStorageConfigService,
  export: exportService,
  chapter: chapterService,
  xhsImage: xhsImageService,
  // Backwards compatibility
  reverseLog: styleAnalysisService,
} as const;

export type Services = typeof services;
