import { createCallerFactory, createTRPCRouter } from "./trpc";
import { tasksRouter } from "./routers/tasks";
import { imagePromptsRouter } from "./routers/image-prompts";
import { styleAnalysesRouter } from "./routers/style-analyses";
import { articlesRouter } from "./routers/articles";
import { usersRouter } from "./routers/users";
import { uploadsRouter } from "./routers/uploads";
import { userStorageConfigRouter } from "./routers/user-storage-config";
import { exportRouter } from "./routers/export";
import { chaptersRouter } from "./routers/chapters";
import { xhsImagesRouter } from "./routers/xhs-images";
import { pipelineRouter } from "./routers/pipeline";
import { wechatArticleRouter } from "./routers/wechat-articles";

export const appRouter = createTRPCRouter({
  tasks: tasksRouter,
  imagePrompts: imagePromptsRouter,
  styleAnalyses: styleAnalysesRouter,
  articles: articlesRouter,
  users: usersRouter,
  uploads: uploadsRouter,
  userStorageConfig: userStorageConfigRouter,
  export: exportRouter,
  chapters: chaptersRouter,
  xhsImages: xhsImagesRouter,
  pipeline: pipelineRouter,
  wechatArticles: wechatArticleRouter,
  // Backwards compatibility
  reverseLogs: styleAnalysesRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
