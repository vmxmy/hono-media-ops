import { createCallerFactory, createTRPCRouter } from "./trpc";
import { tasksRouter } from "./routers/tasks";
import { imagePromptsRouter } from "./routers/image-prompts";
import { styleAnalysesRouter } from "./routers/style-analyses";
import { articlesRouter } from "./routers/articles";
import { usersRouter } from "./routers/users";
import { uploadsRouter } from "./routers/uploads";
import { userStorageConfigRouter } from "./routers/user-storage-config";

export const appRouter = createTRPCRouter({
  tasks: tasksRouter,
  imagePrompts: imagePromptsRouter,
  styleAnalyses: styleAnalysesRouter,
  articles: articlesRouter,
  users: usersRouter,
  uploads: uploadsRouter,
  userStorageConfig: userStorageConfigRouter,
  // Backwards compatibility
  reverseLogs: styleAnalysesRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
