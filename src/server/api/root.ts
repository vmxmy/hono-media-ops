import { createCallerFactory, createTRPCRouter } from "./trpc";
import { tasksRouter } from "./routers/tasks";
import { imagePromptsRouter } from "./routers/image-prompts";
import { styleAnalysesRouter } from "./routers/style-analyses";
import { articlesRouter } from "./routers/articles";
import { usersRouter } from "./routers/users";

export const appRouter = createTRPCRouter({
  tasks: tasksRouter,
  imagePrompts: imagePromptsRouter,
  styleAnalyses: styleAnalysesRouter,
  articles: articlesRouter,
  users: usersRouter,
  // Backwards compatibility
  reverseLogs: styleAnalysesRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
