// ==================== Service Exports ====================
// Centralized export for all services

export { taskService } from "./task.service";
export type { TaskService, GetAllTasksOptions, CreateTaskInput, UpdateTaskStatusInput, TaskWithMaterial } from "./task.service";

export { imagePromptService } from "./image-prompt.service";
export type { ImagePromptService, CreateImagePromptInput, UpdateImagePromptInput, GetAllInput as GetAllImagePromptsInput, ImagePromptListItem } from "./image-prompt.service";

export { styleAnalysisService } from "./style-analysis";
export type {
  StyleAnalysisService,
  GetAllStyleAnalysesOptions,
  CreateStyleAnalysisInput,
  UpdateStyleAnalysisInput,
  // Domain types
  UserStyleProfile,
  MetricsTrendPoint,
  PrimaryTypeInsights,
  StyleAnalysisListItem,
  GetAllStyleAnalysesResult,
} from "./style-analysis";
// Sub-services for direct access
export { styleAnalysisCrudService, styleAnalysisSearchService, styleAnalysisAnalyticsService } from "./style-analysis";

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

export { pipelineService } from "./pipeline.service";
export type {
  PipelineService,
  PipelineStatus,
  CreatePipelineInput,
  UpdatePipelineInput,
  GetPipelinesOptions,
  PipelineProgress,
} from "./pipeline.service";

// Backwards compatibility alias
export { styleAnalysisService as reverseLogService } from "./style-analysis";

// ==================== Services Aggregate ====================
// For injection into tRPC context

export { wechatArticleService } from "./wechat-article.service";
export type { WechatArticleService, GetWechatArticlesInput } from "./wechat-article.service";

export { materialAnalyticsService } from "./material-analytics.service";
export type {
  MaterialAnalyticsService,
  MaterialOverview,
  GrowthTrend,
  UsageStats,
  QualityMetrics,
  StatusDistribution,
  CreationTrend,
  WordCountDistribution,
  MetricsScatterPoint,
  ParaCountDistribution,
  SentLenDistribution,
  QualityGrade,
  QualityScore,
  MaterialQualityDetail,
  TypeDistribution,
  TypeRadarComparison,
  TypeTrend,
  TopUsedMaterial,
  MaterialLifecycle,
  LifecycleStage,
} from "./material-analytics.service";

export { imagePromptAnalyticsService } from "./image-prompt-analytics.service";
export type {
  ImagePromptAnalyticsService,
  PromptOverview,
  PromptUsageTrend,
  CategoryDistribution,
  CategoryUsage,
  ModelDistribution,
  RatioDistribution,
  ResolutionDistribution,
  RatingDistribution,
  TopRatedPrompt,
  SourceDistribution,
  PromptCreationTrend,
  TagCount,
} from "./image-prompt-analytics.service";

export { taskAnalyticsService } from "./task-analytics.service";
export type {
  TaskAnalyticsService,
  TaskOverview,
  TaskStatusDistribution,
  TaskCreationTrend,
  TaskCompletionTrend,
  ProgressAnalysis,
  ReferenceUsage,
  ExecutionStats,
  TopTopic,
  TopKeyword,
} from "./task-analytics.service";

export { xhsAnalyticsService } from "./xhs-analytics.service";
export type {
  XhsAnalyticsService,
  XhsOverview,
  XhsStatusDistribution,
  XhsCreationTrend,
  XhsCompletionTrend,
  XhsImageTypeDistribution,
  XhsRatioDistribution,
  XhsResolutionDistribution,
  XhsCompletionAnalysis,
  XhsTopSource,
  XhsPerformanceMetrics,
} from "./xhs-analytics.service";

export { wechatArticleAnalyticsService } from "./wechat-article-analytics.service";
export type {
  WechatArticleAnalyticsService,
  WechatArticleOverview,
  AccountDistribution,
  AuthorDistribution,
  ImportTrend,
  PublishTrend,
  AdAnalysis,
  CoverAnalysis,
  TimeDistribution,
  TopArticles,
  AccountStats,
} from "./wechat-article-analytics.service";

export { pipelineAnalyticsService } from "./pipeline-analytics.service";
export type {
  PipelineAnalyticsService,
  PipelineOverview,
  PipelineStatusDistribution,
  PipelineCreationTrend,
  PipelineCompletionTrend,
  PipelineProgressAnalysis,
  PipelineTopSource,
  PipelineTopTopic,
  PipelineTopKeyword,
  PipelinePerformanceMetrics,
} from "./pipeline-analytics.service";

export { embeddingAnalyticsService } from "./embedding-analytics.service";
export type {
  EmbeddingAnalyticsService,
  EmbeddingOverview,
  ModelVersionDistribution,
  EmbeddingCreationTrend,
  TaskEmbeddingStatus,
  ContentHashAnalysis,
  EmbeddingAge,
  RecentEmbedding,
  EmbeddingGrowthRate,
} from "./embedding-analytics.service";

import { taskService } from "./task.service";
import { imagePromptService } from "./image-prompt.service";
import { styleAnalysisService } from "./style-analysis";
import { articleService } from "./article.service";
import { embeddingService } from "./embedding.service";
import { storageService } from "./storage.service";
import { userStorageConfigService } from "./user-storage-config.service";
import { exportService } from "./export.service";
import { chapterService } from "./chapter.service";
import { xhsImageService } from "./xhs-image.service";
import { pipelineService } from "./pipeline.service";
import { wechatArticleService } from "./wechat-article.service";
import { materialAnalyticsService } from "./material-analytics.service";
import { imagePromptAnalyticsService } from "./image-prompt-analytics.service";
import { taskAnalyticsService } from "./task-analytics.service";
import { xhsAnalyticsService } from "./xhs-analytics.service";
import { wechatArticleAnalyticsService } from "./wechat-article-analytics.service";
import { pipelineAnalyticsService } from "./pipeline-analytics.service";
import { embeddingAnalyticsService } from "./embedding-analytics.service";

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
  pipeline: pipelineService,
  wechatArticle: wechatArticleService,
  materialAnalytics: materialAnalyticsService,
  imagePromptAnalytics: imagePromptAnalyticsService,
  taskAnalytics: taskAnalyticsService,
  xhsAnalytics: xhsAnalyticsService,
  wechatArticleAnalytics: wechatArticleAnalyticsService,
  pipelineAnalytics: pipelineAnalyticsService,
  embeddingAnalytics: embeddingAnalyticsService,
  // Backwards compatibility
  reverseLog: styleAnalysisService,
} as const;

export type Services = typeof services;
