import { createCallerFactory, createTRPCRouter } from "./trpc";
import { tasksRouter } from "./routers/tasks";
import { promptsRouter } from "./routers/prompts";
import { reverseLogsRouter } from "./routers/reverse-logs";

export const appRouter = createTRPCRouter({
  tasks: tasksRouter,
  prompts: promptsRouter,
  reverseLogs: reverseLogsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
