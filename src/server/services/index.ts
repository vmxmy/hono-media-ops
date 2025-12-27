// ==================== Service Exports ====================
// Centralized export for all services

export { taskService } from "./task.service";
export type { TaskService, GetAllTasksOptions, CreateTaskInput, UpdateTaskStatusInput } from "./task.service";

export { imagePromptService } from "./image-prompt.service";
export type { ImagePromptService, CreateImagePromptInput, UpdateImagePromptInput, GetAllInput as GetAllImagePromptsInput } from "./image-prompt.service";

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

// Backwards compatibility alias
export { styleAnalysisService as reverseLogService } from "./style-analysis.service";

// ==================== Services Aggregate ====================
// For injection into tRPC context

import { taskService } from "./task.service";
import { imagePromptService } from "./image-prompt.service";
import { styleAnalysisService } from "./style-analysis.service";

export const services = {
  task: taskService,
  imagePrompt: imagePromptService,
  styleAnalysis: styleAnalysisService,
  // Backwards compatibility
  reverseLog: styleAnalysisService,
} as const;

export type Services = typeof services;
