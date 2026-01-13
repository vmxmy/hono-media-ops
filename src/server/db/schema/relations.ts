/**
 * Database Relations
 * All table relations are defined here to avoid circular dependencies
 */

import { relations } from "drizzle-orm";
import {
  users,
  accounts,
  sessions,
  userStorageConfigs,
  tasks,
  taskExecutions,
  taskBlueprints,
  chapterOutputs,
  styleAnalyses,
  articleEmbeddings,
  xhsImageJobs,
  xhsImages,
} from "./tables";

// ==================== User Relations ====================

export const usersRelations = relations(users, ({ many, one }) => ({
  tasks: many(tasks),
  styleAnalyses: many(styleAnalyses),
  storageConfig: one(userStorageConfigs),
}));

export const userStorageConfigsRelations = relations(userStorageConfigs, ({ one }) => ({
  user: one(users, {
    fields: [userStorageConfigs.userId],
    references: [users.id],
  }),
}));

// ==================== Task Relations ====================

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  executions: many(taskExecutions),
}));

export const taskExecutionsRelations = relations(taskExecutions, ({ one }) => ({
  task: one(tasks, {
    fields: [taskExecutions.taskId],
    references: [tasks.id],
  }),
  blueprint: one(taskBlueprints),
}));

export const taskBlueprintsRelations = relations(taskBlueprints, ({ one, many }) => ({
  execution: one(taskExecutions, {
    fields: [taskBlueprints.executionId],
    references: [taskExecutions.id],
  }),
  chapters: many(chapterOutputs),
}));

export const chapterOutputsRelations = relations(chapterOutputs, ({ one }) => ({
  blueprint: one(taskBlueprints, {
    fields: [chapterOutputs.blueprintId],
    references: [taskBlueprints.id],
  }),
}));

// ==================== Style Analysis Relations ====================

export const styleAnalysesRelations = relations(styleAnalyses, ({ one }) => ({
  user: one(users, {
    fields: [styleAnalyses.userId],
    references: [users.id],
  }),
}));

// ==================== Article Embedding Relations ====================

export const articleEmbeddingsRelations = relations(articleEmbeddings, ({ one }) => ({
  execution: one(taskExecutions, {
    fields: [articleEmbeddings.executionId],
    references: [taskExecutions.id],
  }),
  task: one(tasks, {
    fields: [articleEmbeddings.taskId],
    references: [tasks.id],
  }),
}));

// ==================== XHS Relations ====================

export const xhsImageJobsRelations = relations(xhsImageJobs, ({ one, many }) => ({
  user: one(users, {
    fields: [xhsImageJobs.userId],
    references: [users.id],
  }),
  images: many(xhsImages),
}));

export const xhsImagesRelations = relations(xhsImages, ({ one }) => ({
  job: one(xhsImageJobs, {
    fields: [xhsImages.jobId],
    references: [xhsImageJobs.id],
  }),
}));
