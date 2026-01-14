# Pipeline 快速创作功能实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现一个单页流水线，将素材分析→文章生成→小红书图文串联为 ADHD 友好的自动化工作流。

**Architecture:** 新增 Pipeline 数据模型追踪整个流程状态，通过 tRPC 实现前后端通信，前端使用 A2UI 渲染移动端优先的滑动选择界面。Embedding 相似度用于封面风格智能排序。

**Tech Stack:** Drizzle ORM, tRPC, React, A2UI, OpenAI Embeddings, react-swipeable

**Design Doc:** `docs/plans/2026-01-14-pipeline-design.md`

---

## Phase 1: 数据库层

### Task 1.1: 创建 Pipeline 状态枚举和表

**Files:**
- Create: `src/server/db/schema/enums/pipeline-status.ts`
- Create: `src/server/db/schema/tables/pipelines.ts`
- Modify: `src/server/db/schema/index.ts`

**Step 1: 创建枚举类型**

```typescript
// src/server/db/schema/enums/pipeline-status.ts
import { pgEnum } from "drizzle-orm/pg-core";

export const pipelineStatusEnum = pgEnum("pipeline_status", [
  "analyzing",        // 正在分析风格
  "pending_selection", // 等待用户选择封面
  "processing",       // 正在生成
  "completed",        // 完成
  "failed",           // 失败
]);
```

**Step 2: 创建 pipelines 表**

```typescript
// src/server/db/schema/tables/pipelines.ts
import { pgTable, uuid, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { styleAnalyses } from "./style-analyses";
import { imagePrompts } from "./image-prompts";
import { tasks } from "./tasks";
import { xhsImageJobs } from "./xhs-image-jobs";
import { pipelineStatusEnum } from "../enums/pipeline-status";

export const pipelines = pgTable(
  "pipelines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

    // 输入
    sourceUrl: text("source_url").notNull(),
    topic: text("topic").notNull(),
    keywords: text("keywords"),
    targetWordCount: integer("target_word_count").default(2000),

    // 关联的风格分析
    styleAnalysisId: uuid("style_analysis_id").references(() => styleAnalyses.id, { onDelete: "set null" }),

    // 用户选择的封面风格
    imagePromptId: uuid("image_prompt_id").references(() => imagePrompts.id, { onDelete: "set null" }),

    // 生成结果关联
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    xhsJobId: uuid("xhs_job_id").references(() => xhsImageJobs.id, { onDelete: "set null" }),

    // 状态
    status: pipelineStatusEnum("status").default("analyzing").notNull(),
    errorMessage: text("error_message"),

    // 进度追踪
    articleTotalChapters: integer("article_total_chapters").default(0),
    articleCompletedChapters: integer("article_completed_chapters").default(0),
    xhsTotalImages: integer("xhs_total_images").default(0),
    xhsCompletedImages: integer("xhs_completed_images").default(0),

    // 时间戳
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    userIdIdx: index("idx_pipelines_user_id").on(table.userId),
    statusIdx: index("idx_pipelines_status").on(table.status),
    createdAtIdx: index("idx_pipelines_created_at").on(table.createdAt),
  })
);

export type Pipeline = typeof pipelines.$inferSelect;
export type NewPipeline = typeof pipelines.$inferInsert;
```

**Step 3: 导出新表**

在 `src/server/db/schema/index.ts` 添加导出:

```typescript
export * from "./enums/pipeline-status";
export * from "./tables/pipelines";
```

**Step 4: 生成迁移**

Run: `npm run db:generate`
Expected: 生成迁移文件

**Step 5: 应用迁移**

Run: `npm run db:push`
Expected: 表创建成功

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(db): add pipelines table for workflow tracking"
```

---

### Task 1.2: 为 image_prompts 表添加 embedding 字段

**Files:**
- Modify: `src/server/db/schema/tables/image-prompts.ts`

**Step 1: 添加 embedding 列**

在 image-prompts 表中添加:

```typescript
// 在现有字段后添加
embedding: vector("embedding", { dimensions: 1536 }),
```

需要确保已启用 pgvector 扩展。

**Step 2: 生成并应用迁移**

Run: `npm run db:generate && npm run db:push`

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(db): add embedding column to image_prompts for similarity search"
```

---

## Phase 2: 服务层

### Task 2.1: 创建 Pipeline Service 基础结构

**Files:**
- Create: `src/server/services/pipeline.service.ts`
- Modify: `src/server/services/index.ts`

**Step 1: 创建服务文件**

```typescript
// src/server/services/pipeline.service.ts
import { eq, desc, and, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { pipelines } from "@/server/db/schema";
import type { Pipeline, NewPipeline } from "@/server/db/schema";

// ==================== Types ====================

export interface CreatePipelineInput {
  userId: string;
  sourceUrl: string;
  topic: string;
  keywords?: string;
  targetWordCount?: number;
}

export interface UpdatePipelineInput {
  id: string;
  styleAnalysisId?: string;
  imagePromptId?: string;
  taskId?: string;
  xhsJobId?: string;
  status?: Pipeline["status"];
  errorMessage?: string;
  articleTotalChapters?: number;
  articleCompletedChapters?: number;
  xhsTotalImages?: number;
  xhsCompletedImages?: number;
}

export interface GetPipelinesOptions {
  userId: string;
  page?: number;
  pageSize?: number;
  status?: Pipeline["status"];
}

// ==================== Service ====================

export const pipelineService = {
  async getAll(options: GetPipelinesOptions) {
    const { userId, page = 1, pageSize = 20, status } = options;
    const offset = (page - 1) * pageSize;

    const conditions = [
      eq(pipelines.userId, userId),
      isNull(pipelines.deletedAt),
    ];

    if (status) {
      conditions.push(eq(pipelines.status, status));
    }

    const whereClause = and(...conditions);

    const items = await db
      .select()
      .from(pipelines)
      .where(whereClause)
      .orderBy(desc(pipelines.createdAt))
      .limit(pageSize)
      .offset(offset);

    return { items, page, pageSize };
  },

  async getById(id: string): Promise<Pipeline | null> {
    const [item] = await db
      .select()
      .from(pipelines)
      .where(and(eq(pipelines.id, id), isNull(pipelines.deletedAt)))
      .limit(1);
    return item ?? null;
  },

  async create(input: CreatePipelineInput): Promise<{ id: string }> {
    const [item] = await db
      .insert(pipelines)
      .values({
        userId: input.userId,
        sourceUrl: input.sourceUrl,
        topic: input.topic,
        keywords: input.keywords,
        targetWordCount: input.targetWordCount ?? 2000,
        status: "analyzing",
      })
      .returning();
    return { id: item!.id };
  },

  async update(input: UpdatePipelineInput): Promise<{ success: boolean }> {
    const { id, ...data } = input;
    await db
      .update(pipelines)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(pipelines.id, id));
    return { success: true };
  },

  async delete(id: string): Promise<{ success: boolean }> {
    await db
      .update(pipelines)
      .set({ deletedAt: new Date() })
      .where(eq(pipelines.id, id));
    return { success: true };
  },

  async getProgress(id: string) {
    const pipeline = await this.getById(id);
    if (!pipeline) return null;

    const articleProgress = pipeline.articleTotalChapters > 0
      ? pipeline.articleCompletedChapters / pipeline.articleTotalChapters
      : 0;

    const xhsProgress = pipeline.xhsTotalImages > 0
      ? pipeline.xhsCompletedImages / pipeline.xhsTotalImages
      : 0;

    // 文章占 60%，图文占 40%
    const totalProgress = Math.round((articleProgress * 60) + (xhsProgress * 40));

    return {
      status: pipeline.status,
      totalProgress,
      article: {
        completed: pipeline.articleCompletedChapters,
        total: pipeline.articleTotalChapters,
      },
      xhs: {
        completed: pipeline.xhsCompletedImages,
        total: pipeline.xhsTotalImages,
      },
    };
  },
};

export type PipelineService = typeof pipelineService;
```

**Step 2: 注册服务**

在 `src/server/services/index.ts` 添加:

```typescript
export { pipelineService } from "./pipeline.service";
export type { PipelineService, CreatePipelineInput, UpdatePipelineInput } from "./pipeline.service";

// 在 services 对象中添加
import { pipelineService } from "./pipeline.service";

export const services = {
  // ... existing services
  pipeline: pipelineService,
} as const;
```

**Step 3: 验证 TypeScript**

Run: `npm run typecheck`
Expected: 无错误

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(service): add pipeline service with CRUD and progress tracking"
```

---

### Task 2.2: 添加封面风格相似度排序功能

**Files:**
- Modify: `src/server/services/pipeline.service.ts`
- Modify: `src/server/services/image-prompt.service.ts` (如存在)

**Step 1: 添加 embedding 生成工具函数**

创建或修改 `src/lib/embedding.ts`:

```typescript
import OpenAI from "openai";
import { env } from "@/env";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0]!.embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

**Step 2: 在 pipeline service 中添加获取排序后的封面风格方法**

```typescript
// 在 pipelineService 对象中添加
async getSortedImagePrompts(styleAnalysisId: string) {
  // 1. 获取风格分析的摘要文本
  const styleAnalysis = await db
    .select()
    .from(styleAnalyses)
    .where(eq(styleAnalyses.id, styleAnalysisId))
    .limit(1);

  if (!styleAnalysis[0]) return [];

  // 2. 生成风格摘要的 embedding
  const summaryText = `${styleAnalysis[0].styleName} ${styleAnalysis[0].coreTraits}`;
  const queryEmbedding = await generateEmbedding(summaryText);

  // 3. 获取所有有 embedding 的图片提示词
  const prompts = await db
    .select()
    .from(imagePrompts)
    .where(isNull(imagePrompts.deletedAt));

  // 4. 计算相似度并排序
  const scoredPrompts = prompts
    .filter((p) => p.embedding)
    .map((p) => ({
      ...p,
      similarity: cosineSimilarity(queryEmbedding, p.embedding as number[]),
    }))
    .sort((a, b) => b.similarity - a.similarity);

  return scoredPrompts.map((p) => ({
    id: p.id,
    name: p.name,
    prompt: p.prompt,
    previewUrl: p.previewUrl,
    similarity: Math.round(p.similarity * 100),
  }));
},
```

**Step 3: 验证 TypeScript**

Run: `npm run typecheck`

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(service): add embedding-based image prompt sorting"
```

---

## Phase 3: API 路由层

### Task 3.1: 创建 Pipeline Router

**Files:**
- Create: `src/server/api/routers/pipeline.ts`
- Modify: `src/server/api/root.ts`

**Step 1: 创建路由文件**

```typescript
// src/server/api/routers/pipeline.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

// ==================== Input Schemas ====================

const createInputSchema = z.object({
  sourceUrl: z.string().url(),
  topic: z.string().min(1),
  keywords: z.string().optional(),
  targetWordCount: z.number().int().min(500).max(10000).optional(),
});

const selectStyleInputSchema = z.object({
  pipelineId: z.string().uuid(),
  imagePromptId: z.string().uuid(),
});

const updateProgressInputSchema = z.object({
  pipelineId: z.string().uuid(),
  articleTotalChapters: z.number().int().optional(),
  articleCompletedChapters: z.number().int().optional(),
  xhsTotalImages: z.number().int().optional(),
  xhsCompletedImages: z.number().int().optional(),
  status: z.enum(["analyzing", "pending_selection", "processing", "completed", "failed"]).optional(),
  errorMessage: z.string().optional(),
});

// ==================== Router ====================

export const pipelineRouter = createTRPCRouter({
  // 获取用户的 pipeline 列表
  getAll: protectedProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(50).default(20),
      status: z.enum(["analyzing", "pending_selection", "processing", "completed", "failed"]).optional(),
    }))
    .query(({ ctx, input }) =>
      ctx.services.pipeline.getAll({
        userId: ctx.user.id,
        ...input,
      })
    ),

  // 获取单个 pipeline
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => ctx.services.pipeline.getById(input.id)),

  // 获取进度
  getProgress: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => ctx.services.pipeline.getProgress(input.id)),

  // 创建新 pipeline（触发风格分析）
  create: protectedProcedure
    .input(createInputSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.services.pipeline.create({
        userId: ctx.user.id,
        ...input,
      });
      // TODO: 触发风格分析 webhook
      return result;
    }),

  // 获取排序后的封面风格列表
  getSortedImagePrompts: protectedProcedure
    .input(z.object({ pipelineId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const pipeline = await ctx.services.pipeline.getById(input.pipelineId);
      if (!pipeline?.styleAnalysisId) return [];
      return ctx.services.pipeline.getSortedImagePrompts(pipeline.styleAnalysisId);
    }),

  // 选择封面风格
  selectStyle: protectedProcedure
    .input(selectStyleInputSchema)
    .mutation(({ ctx, input }) =>
      ctx.services.pipeline.update({
        id: input.pipelineId,
        imagePromptId: input.imagePromptId,
        status: "pending_selection",
      })
    ),

  // 开始生成
  start: protectedProcedure
    .input(z.object({ pipelineId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.services.pipeline.update({
        id: input.pipelineId,
        status: "processing",
      });
      // TODO: 触发文章生成 webhook
      return { success: true };
    }),

  // Webhook 回调更新进度（公开接口）
  updateProgress: publicProcedure
    .input(updateProgressInputSchema)
    .mutation(({ ctx, input }) => {
      const { pipelineId, ...data } = input;
      return ctx.services.pipeline.update({ id: pipelineId, ...data });
    }),

  // 删除
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => ctx.services.pipeline.delete(input.id)),

  // 再来一篇
  cloneWithNewTopic: protectedProcedure
    .input(z.object({
      pipelineId: z.string().uuid(),
      newTopic: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const original = await ctx.services.pipeline.getById(input.pipelineId);
      if (!original) throw new Error("Pipeline not found");

      const result = await ctx.services.pipeline.create({
        userId: ctx.user.id,
        sourceUrl: original.sourceUrl,
        topic: input.newTopic,
        keywords: original.keywords ?? undefined,
        targetWordCount: original.targetWordCount ?? undefined,
      });

      // 复用风格选择
      if (original.imagePromptId) {
        await ctx.services.pipeline.update({
          id: result.id,
          styleAnalysisId: original.styleAnalysisId ?? undefined,
          imagePromptId: original.imagePromptId,
        });
      }

      return result;
    }),
});
```

**Step 2: 注册路由**

在 `src/server/api/root.ts` 添加:

```typescript
import { pipelineRouter } from "./routers/pipeline";

export const appRouter = createTRPCRouter({
  // ... existing routers
  pipeline: pipelineRouter,
});
```

**Step 3: 验证 TypeScript**

Run: `npm run typecheck`

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(api): add pipeline tRPC router with all endpoints"
```

---

## Phase 4: 前端页面

### Task 4.1: 创建 Pipeline 页面基础结构

**Files:**
- Create: `src/app/pipeline/page.tsx`

**Step 1: 创建页面文件**

```typescript
// src/app/pipeline/page.tsx
"use client";

import { useState, useCallback } from "react";
import { api } from "@/trpc/react";
import { A2UIRenderer } from "@/components/a2ui";
import type { A2UINode, A2UIAppShellNode } from "@/lib/a2ui";

type PipelineStep = "input" | "analyzing" | "selection" | "processing" | "completed";

export default function PipelinePage() {
  const [step, setStep] = useState<PipelineStep>("input");
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    sourceUrl: "",
    topic: "",
  });

  // 创建 pipeline
  const createMutation = api.pipeline.create.useMutation({
    onSuccess: (data) => {
      setPipelineId(data.id);
      setStep("analyzing");
    },
  });

  // 获取 pipeline 详情
  const { data: pipeline } = api.pipeline.getById.useQuery(
    { id: pipelineId! },
    { enabled: !!pipelineId, refetchInterval: step === "analyzing" ? 3000 : false }
  );

  // 获取历史记录
  const { data: history } = api.pipeline.getAll.useQuery({
    page: 1,
    pageSize: 10,
  });

  // Action handler
  const handleAction = useCallback(
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "setSourceUrl":
          setFormData((prev) => ({ ...prev, sourceUrl: args?.[0] as string }));
          break;
        case "setTopic":
          setFormData((prev) => ({ ...prev, topic: args?.[0] as string }));
          break;
        case "analyze":
          createMutation.mutate(formData);
          break;
        case "back":
          setStep("input");
          setPipelineId(null);
          break;
      }
    },
    [formData, createMutation]
  );

  // Build input form node
  const buildInputNode = (): A2UINode => ({
    type: "card",
    children: [
      { type: "text", text: "🚀 快速创作", variant: "h2" },
      {
        type: "input",
        label: "参考文章 URL",
        placeholder: "粘贴链接...",
        value: formData.sourceUrl,
        onChange: { action: "setSourceUrl" },
      },
      {
        type: "input",
        label: "新话题",
        placeholder: "想写什么...",
        value: formData.topic,
        onChange: { action: "setTopic" },
      },
      {
        type: "button",
        text: "分析风格 →",
        variant: "primary",
        disabled: !formData.sourceUrl || !formData.topic,
        onClick: { action: "analyze" },
      },
    ],
  });

  // Build analyzing node
  const buildAnalyzingNode = (): A2UINode => ({
    type: "card",
    children: [
      { type: "text", text: "正在分析文章风格...", variant: "h3" },
      { type: "progress", value: 50, max: 100 },
      { type: "text", text: "约需 30 秒", variant: "caption" },
    ],
  });

  // Build main content based on step
  const buildContentNode = (): A2UINode => {
    switch (step) {
      case "input":
        return buildInputNode();
      case "analyzing":
        return buildAnalyzingNode();
      default:
        return buildInputNode();
    }
  };

  // Build history list
  const buildHistoryNode = (): A2UINode => ({
    type: "column",
    gap: "md",
    children: [
      { type: "text", text: "📋 历史创作", variant: "h3" },
      ...(history?.items ?? []).map((item) => ({
        type: "card" as const,
        children: [
          { type: "text" as const, text: item.topic, variant: "body" as const },
          { type: "badge" as const, text: item.status, color: "default" as const },
        ],
      })),
    ],
  });

  const appShellNode: A2UIAppShellNode = {
    type: "app-shell",
    brand: "快速创作",
    children: [
      {
        type: "column",
        gap: "lg",
        children: [buildContentNode(), buildHistoryNode()],
      },
    ],
  };

  return <A2UIRenderer node={appShellNode} onAction={handleAction} />;
}
```

**Step 2: 验证 TypeScript**

Run: `npm run typecheck`

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): add pipeline page with input form and history list"
```

---

### Task 4.2: 创建滑动选择器组件

**Files:**
- Create: `src/components/swipe-selector.tsx`

**Step 1: 安装依赖**

Run: `npm install react-swipeable`

**Step 2: 创建组件**

```typescript
// src/components/swipe-selector.tsx
"use client";

import { useState, useCallback } from "react";
import { useSwipeable } from "react-swipeable";
import Image from "next/image";

interface SwipeSelectorItem {
  id: string;
  name: string;
  previewUrl?: string;
  similarity?: number;
}

interface SwipeSelectorProps {
  items: SwipeSelectorItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  title: string;
}

export function SwipeSelector({
  items,
  selectedId,
  onSelect,
  title,
}: SwipeSelectorProps) {
  const currentIndex = items.findIndex((item) => item.id === selectedId);
  const [displayIndex, setDisplayIndex] = useState(
    currentIndex >= 0 ? currentIndex : 0
  );

  const goTo = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      setDisplayIndex(clampedIndex);
      onSelect(items[clampedIndex]!.id);
    },
    [items, onSelect]
  );

  const handlers = useSwipeable({
    onSwipedLeft: () => goTo(displayIndex + 1),
    onSwipedRight: () => goTo(displayIndex - 1),
    trackMouse: true,
  });

  const currentItem = items[displayIndex];

  if (!currentItem) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-gray-500">
        {title} ← 滑动 →
      </p>

      <div
        {...handlers}
        className="w-full max-w-sm aspect-square bg-gray-100 rounded-lg overflow-hidden touch-pan-y"
      >
        {currentItem.previewUrl ? (
          <Image
            src={currentItem.previewUrl}
            alt={currentItem.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            无预览
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="font-medium">{currentItem.name}</p>
        {currentItem.similarity !== undefined && (
          <p className="text-sm text-gray-500">{currentItem.similarity}% 匹配</p>
        )}
      </div>

      {/* 圆点指示器 */}
      <div className="flex gap-1">
        {items.slice(0, 10).map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === displayIndex ? "bg-blue-500" : "bg-gray-300"
            }`}
          />
        ))}
        {items.length > 10 && (
          <span className="text-xs text-gray-400 ml-1">
            +{items.length - 10}
          </span>
        )}
      </div>

      <p className="text-xs text-gray-400">
        {displayIndex + 1} / {items.length}
      </p>
    </div>
  );
}
```

**Step 3: 验证 TypeScript**

Run: `npm run typecheck`

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): add SwipeSelector component for mobile-friendly selection"
```

---

### Task 4.3: 实现风格选择步骤

**Files:**
- Modify: `src/app/pipeline/page.tsx`

**Step 1: 添加风格选择状态和查询**

在 page.tsx 中添加:

```typescript
const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

// 获取排序后的封面风格
const { data: sortedPrompts } = api.pipeline.getSortedImagePrompts.useQuery(
  { pipelineId: pipelineId! },
  { enabled: !!pipelineId && step === "selection" }
);

// 选择风格
const selectStyleMutation = api.pipeline.selectStyle.useMutation();

// 开始生成
const startMutation = api.pipeline.start.useMutation({
  onSuccess: () => setStep("processing"),
});
```

**Step 2: 添加风格选择 UI**

```typescript
const buildSelectionNode = (): A2UINode => ({
  type: "column",
  gap: "lg",
  children: [
    {
      type: "card",
      children: [
        { type: "text", text: "✅ 风格分析完成", variant: "h3" },
        { type: "text", text: `风格: ${pipeline?.styleName ?? ""}`, variant: "body" },
      ],
    },
    {
      type: "card",
      children: [
        // SwipeSelector 需要作为自定义组件渲染
        { type: "text", text: "🎨 选择视觉风格", variant: "h3" },
        { type: "text", text: "💡 此风格同时用于封面和小红书图文", variant: "caption" },
      ],
    },
    {
      type: "button",
      text: "🚀 开始生成",
      variant: "primary",
      disabled: !selectedPromptId,
      onClick: { action: "startGeneration" },
    },
    {
      type: "text",
      text: "将生成：文章 + 封面 + 9张图文",
      variant: "caption",
    },
  ],
});
```

**Step 3: 更新 handleAction**

```typescript
case "selectPrompt":
  setSelectedPromptId(args?.[0] as string);
  selectStyleMutation.mutate({
    pipelineId: pipelineId!,
    imagePromptId: args?.[0] as string,
  });
  break;
case "startGeneration":
  startMutation.mutate({ pipelineId: pipelineId! });
  break;
```

**Step 4: 验证并提交**

Run: `npm run typecheck`

```bash
git add -A
git commit -m "feat(ui): implement style selection step with swipe selector"
```

---

### Task 4.4: 实现进度展示步骤

**Files:**
- Modify: `src/app/pipeline/page.tsx`

**Step 1: 添加进度查询**

```typescript
// 获取进度
const { data: progress } = api.pipeline.getProgress.useQuery(
  { id: pipelineId! },
  {
    enabled: !!pipelineId && step === "processing",
    refetchInterval: 3000,
  }
);

// 监听完成状态
useEffect(() => {
  if (progress?.status === "completed") {
    setStep("completed");
  }
}, [progress?.status]);
```

**Step 2: 添加进度展示 UI**

```typescript
const buildProcessingNode = (): A2UINode => ({
  type: "column",
  gap: "md",
  children: [
    { type: "text", text: "⚡ 正在生成...", variant: "h3" },
    {
      type: "progress",
      value: progress?.totalProgress ?? 0,
      max: 100,
    },
    {
      type: "row",
      gap: "md",
      children: [
        {
          type: "text",
          text: `📄 文章 ${progress?.article.completed ?? 0}/${progress?.article.total ?? 0} 章节`,
          variant: "body",
        },
        {
          type: "badge",
          text: progress?.article.completed === progress?.article.total ? "✅" : "✍️",
          color: "default",
        },
      ],
    },
    {
      type: "row",
      gap: "md",
      children: [
        {
          type: "text",
          text: `📱 小红书 ${progress?.xhs.completed ?? 0}/${progress?.xhs.total ?? 0} 张`,
          variant: "body",
        },
        {
          type: "badge",
          text: progress?.xhs.completed === progress?.xhs.total ? "✅" : "🖼️",
          color: "default",
        },
      ],
    },
    {
      type: "text",
      text: "💡 可随时离开，完成后通知你",
      variant: "caption",
    },
  ],
});
```

**Step 3: 验证并提交**

Run: `npm run typecheck`

```bash
git add -A
git commit -m "feat(ui): implement progress display with real-time updates"
```

---

### Task 4.5: 实现完成结果页

**Files:**
- Modify: `src/app/pipeline/page.tsx`

**Step 1: 添加完成状态 UI**

```typescript
const buildCompletedNode = (): A2UINode => ({
  type: "column",
  gap: "lg",
  children: [
    { type: "text", text: "✅ 全部完成！", variant: "h2" },
    // 文章卡片
    {
      type: "card",
      children: [
        { type: "text", text: "📄 文章", variant: "h3" },
        { type: "text", text: pipeline?.topic ?? "", variant: "body" },
        {
          type: "row",
          gap: "sm",
          children: [
            { type: "button", text: "预览文章", variant: "secondary", onClick: { action: "previewArticle" } },
            { type: "button", text: "复制全文", variant: "secondary", onClick: { action: "copyArticle" } },
          ],
        },
      ],
    },
    // 小红书图文卡片
    {
      type: "card",
      children: [
        { type: "text", text: "📱 小红书图文", variant: "h3" },
        // 图片网格将通过自定义组件渲染
        {
          type: "row",
          gap: "sm",
          children: [
            { type: "button", text: "预览大图", variant: "secondary", onClick: { action: "previewImages" } },
            { type: "button", text: "下载全部", variant: "secondary", onClick: { action: "downloadAll" } },
          ],
        },
      ],
    },
    // 操作按钮
    {
      type: "button",
      text: "📤 发布到小红书",
      variant: "primary",
      onClick: { action: "publishToXhs" },
    },
    {
      type: "button",
      text: "➕ 开始新创作",
      variant: "secondary",
      onClick: { action: "newPipeline" },
    },
  ],
});
```

**Step 2: 添加相关 action handlers**

```typescript
case "previewArticle":
  // TODO: 打开文章预览
  break;
case "copyArticle":
  // TODO: 复制文章到剪贴板
  break;
case "publishToXhs":
  // TODO: 调用小红书发布
  break;
case "newPipeline":
  setStep("input");
  setPipelineId(null);
  setFormData({ sourceUrl: "", topic: "" });
  break;
```

**Step 3: 验证并提交**

Run: `npm run typecheck`

```bash
git add -A
git commit -m "feat(ui): implement completion view with result display and actions"
```

---

## Phase 5: 导航集成

### Task 5.1: 添加侧边栏入口

**Files:**
- Modify: `src/components/sidebar.tsx` (或相应导航组件)

**Step 1: 添加 Pipeline 菜单项**

在导航配置中添加:

```typescript
{
  name: "快速创作",
  href: "/pipeline",
  icon: "🚀",
  // 或使用图标组件
}
```

确保放在菜单列表的第一位。

**Step 2: 验证并提交**

Run: `npm run typecheck`

```bash
git add -A
git commit -m "feat(nav): add pipeline entry to sidebar as first menu item"
```

---

## Phase 6: 全局状态栏

### Task 6.1: 创建全局进度提示栏组件

**Files:**
- Create: `src/components/global-pipeline-status.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: 创建组件**

```typescript
// src/components/global-pipeline-status.tsx
"use client";

import { api } from "@/trpc/react";
import Link from "next/link";

export function GlobalPipelineStatus() {
  // 查询是否有进行中的 pipeline
  const { data } = api.pipeline.getAll.useQuery(
    { page: 1, pageSize: 1, status: "processing" },
    { refetchInterval: 5000 }
  );

  const activePipeline = data?.items?.[0];

  if (!activePipeline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-500 text-white px-4 py-2 flex items-center justify-between">
      <span>
        ⚡ 创作进行中：「{activePipeline.topic}」
        {activePipeline.articleCompletedChapters}/{activePipeline.articleTotalChapters} 章节
      </span>
      <Link
        href="/pipeline"
        className="text-sm underline hover:no-underline"
      >
        查看详情 →
      </Link>
    </div>
  );
}
```

**Step 2: 在 layout 中添加**

在 `src/app/layout.tsx` 中添加组件。

**Step 3: 验证并提交**

Run: `npm run typecheck`

```bash
git add -A
git commit -m "feat(ui): add global pipeline status bar for cross-page visibility"
```

---

## Phase 7: 最终集成测试

### Task 7.1: 端到端验证

**Step 1: 启动开发服务器**

Run: `npm run dev`

**Step 2: 手动测试流程**

1. 访问 `/pipeline`
2. 输入 URL 和话题
3. 点击分析风格
4. 滑动选择封面
5. 开始生成
6. 观察进度
7. 查看完成结果

**Step 3: 修复发现的问题**

根据测试结果修复任何问题。

**Step 4: 最终提交**

```bash
git add -A
git commit -m "feat: complete pipeline feature implementation"
```

---

## 总结

| Phase | Tasks | 预计代码量 |
|-------|-------|-----------|
| 1. 数据库层 | 2 | ~100 行 |
| 2. 服务层 | 2 | ~200 行 |
| 3. API 路由 | 1 | ~150 行 |
| 4. 前端页面 | 5 | ~400 行 |
| 5. 导航集成 | 1 | ~10 行 |
| 6. 全局状态栏 | 1 | ~50 行 |
| 7. 集成测试 | 1 | - |

**总计**: 13 个 Task，约 900 行新代码
