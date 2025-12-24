// ==================== Service Exports ====================
// Centralized export for all services

export { taskService } from "./task.service";
export type { TaskService, GetAllTasksOptions, CreateTaskInput, UpdateTaskStatusInput } from "./task.service";

export { promptService } from "./prompt.service";
export type { PromptService, CreatePromptInput, UpdatePromptInput } from "./prompt.service";

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
import { promptService } from "./prompt.service";
import { reverseLogService } from "./reverse-log.service";

export const services = {
  task: taskService,
  prompt: promptService,
  reverseLog: reverseLogService,
} as const;

export type Services = typeof services;
