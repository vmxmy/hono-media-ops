/**
 * Style Analysis Service
 * Aggregates all style analysis sub-services into a unified interface
 */

// Re-export types
export type {
  GetAllStyleAnalysesOptions,
  CreateStyleAnalysisInput,
  UpdateStyleAnalysisInput,
  UserStyleProfile,
  MetricsTrendPoint,
  PrimaryTypeInsights,
} from "./types";

// Import sub-services
import { styleAnalysisCrudService } from "./crud.service";
import { styleAnalysisSearchService } from "./search.service";
import { styleAnalysisAnalyticsService } from "./analytics.service";

// Re-export sub-services for direct access if needed
export { styleAnalysisCrudService } from "./crud.service";
export { styleAnalysisSearchService } from "./search.service";
export { styleAnalysisAnalyticsService } from "./analytics.service";

// ==================== Unified Service ====================

/**
 * Unified style analysis service that delegates to specialized sub-services
 * Maintains backward compatibility with the original monolithic service
 */
export const styleAnalysisService = {
  // ==================== CRUD Operations ====================
  getAll: styleAnalysisCrudService.getAll.bind(styleAnalysisCrudService),
  getById: styleAnalysisCrudService.getById.bind(styleAnalysisCrudService),
  getBySourceUrl: styleAnalysisCrudService.getBySourceUrl.bind(styleAnalysisCrudService),
  getByUserId: styleAnalysisCrudService.getByUserId.bind(styleAnalysisCrudService),
  create: styleAnalysisCrudService.create.bind(styleAnalysisCrudService),
  upsert: styleAnalysisCrudService.upsert.bind(styleAnalysisCrudService),
  update: styleAnalysisCrudService.update.bind(styleAnalysisCrudService),
  delete: styleAnalysisCrudService.delete.bind(styleAnalysisCrudService),
  batchDelete: styleAnalysisCrudService.batchDelete.bind(styleAnalysisCrudService),
  getPrimaryTypes: styleAnalysisCrudService.getPrimaryTypes.bind(styleAnalysisCrudService),
  export: styleAnalysisCrudService.export.bind(styleAnalysisCrudService),

  // Execution prompt generation
  generateExecutionPromptFromRecord: styleAnalysisCrudService.generateExecutionPromptFromRecord.bind(styleAnalysisCrudService),
  generateExecutionPromptPreviewFromRecord: styleAnalysisCrudService.generateExecutionPromptPreviewFromRecord.bind(styleAnalysisCrudService),
  getByIdWithExecutionPrompt: styleAnalysisCrudService.getByIdWithExecutionPrompt.bind(styleAnalysisCrudService),

  // ==================== Search Operations ====================
  generateEmbedding: styleAnalysisSearchService.generateEmbedding.bind(styleAnalysisSearchService),
  generateAndStoreEmbedding: styleAnalysisSearchService.generateAndStoreEmbedding.bind(styleAnalysisSearchService),
  generateMissingEmbeddings: styleAnalysisSearchService.generateMissingEmbeddings.bind(styleAnalysisSearchService),
  searchByVector: styleAnalysisSearchService.searchByVector.bind(styleAnalysisSearchService),
  hybridSearch: styleAnalysisSearchService.hybridSearch.bind(styleAnalysisSearchService),
  getEmbeddingStats: styleAnalysisSearchService.getEmbeddingStats.bind(styleAnalysisSearchService),

  // Embedding utilities
  getEmbeddingClient: styleAnalysisSearchService.getEmbeddingClient.bind(styleAnalysisSearchService),
  createContentHash: styleAnalysisSearchService.createContentHash.bind(styleAnalysisSearchService),
  prepareEmbeddingContent: styleAnalysisSearchService.prepareEmbeddingContent.bind(styleAnalysisSearchService),

  // ==================== Analytics Operations ====================
  getStatistics: styleAnalysisAnalyticsService.getStatistics.bind(styleAnalysisAnalyticsService),
  getUserStyleProfile: styleAnalysisAnalyticsService.getUserStyleProfile.bind(styleAnalysisAnalyticsService),
  getMetricsTrend: styleAnalysisAnalyticsService.getMetricsTrend.bind(styleAnalysisAnalyticsService),
  getPrimaryTypeInsights: styleAnalysisAnalyticsService.getPrimaryTypeInsights.bind(styleAnalysisAnalyticsService),
};

export type StyleAnalysisService = typeof styleAnalysisService;
