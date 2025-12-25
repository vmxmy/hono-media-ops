// ==================== Service Exports ====================
// Centralized export for all services

export { taskService } from "./task.service";
export type { TaskService, GetAllTasksOptions, CreateTaskInput, UpdateTaskStatusInput } from "./task.service";

export { imagePromptService } from "./image-prompt.service";
export type { ImagePromptService, CreateImagePromptInput, UpdateImagePromptInput, GetAllInput as GetAllImagePromptsInput } from "./image-prompt.service";

export { reverseLogService } from "./reverse-log.service";
export type {
  ReverseLogService,
  GetAllReverseLogsOptions,
  CreateReverseLogInput,
  ReverseLogStatus,
  // Domain types
  UserStyleProfile,
  PromptSuggestion,
  MetricsTrendPoint,
} from "./reverse-log.service";

// ==================== Services Aggregate ====================
// For injection into tRPC context

import { taskService } from "./task.service";
import { imagePromptService } from "./image-prompt.service";
import { reverseLogService } from "./reverse-log.service";

export const services = {
  task: taskService,
  imagePrompt: imagePromptService,
  reverseLog: reverseLogService,
} as const;

export type Services = typeof services;
