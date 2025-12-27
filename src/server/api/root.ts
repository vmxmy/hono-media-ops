import { createCallerFactory, createTRPCRouter } from "./trpc";
import { tasksRouter } from "./routers/tasks";
import { imagePromptsRouter } from "./routers/image-prompts";
import { styleAnalysesRouter } from "./routers/style-analyses";

export const appRouter = createTRPCRouter({
  tasks: tasksRouter,
  imagePrompts: imagePromptsRouter,
  styleAnalyses: styleAnalysesRouter,
  // Backwards compatibility
  reverseLogs: styleAnalysesRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
