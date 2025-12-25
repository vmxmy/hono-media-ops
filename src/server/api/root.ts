import { createCallerFactory, createTRPCRouter } from "./trpc";
import { tasksRouter } from "./routers/tasks";
import { imagePromptsRouter } from "./routers/image-prompts";
import { reverseLogsRouter } from "./routers/reverse-logs";

export const appRouter = createTRPCRouter({
  tasks: tasksRouter,
  imagePrompts: imagePromptsRouter,
  reverseLogs: reverseLogsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
