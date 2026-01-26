# /tasks SDUI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Switch `/tasks` to server-driven A2UI nodes with client-side Markdown即时预览与节流保存。

**Architecture:** 新增 SDUI 接口聚合任务数据并构建 A2UI 节点；客户端通过轻量轮询获取节点并渲染，保留文章查看与编辑交互在客户端。

**Tech Stack:** Next.js App Router、tRPC、Drizzle、A2UI、node:test

**Skills:** @A2UI

---

### Task 1: 新增服务端翻译工具（用于 SDUI 文案）

**Files:**
- Create: `src/lib/i18n/server.ts`
- Create: `src/lib/i18n/__tests__/server.test.ts`

**Step 1: Write the failing test**

```ts
import test from "node:test"
import assert from "node:assert/strict"
import { createServerTranslator } from "@/lib/i18n/server"
import enMessages from "@/locales/en.json"

test("createServerTranslator returns localized strings", () => {
  const t = createServerTranslator("en")
  assert.equal(t("tasks.title"), enMessages["tasks.title"])
})
```

**Step 2: Run test to verify it fails**

Run: `node --test --loader tsx src/lib/i18n/__tests__/server.test.ts`

Expected: FAIL with module not found or missing export.

**Step 3: Write minimal implementation**

```ts
import enMessages from "@/locales/en.json"
import zhCNMessages from "@/locales/zh-CN.json"

export type ServerLocale = "en" | "zh-CN"

const MESSAGES: Record<ServerLocale, Record<string, string>> = {
  en: enMessages as Record<string, string>,
  "zh-CN": zhCNMessages as Record<string, string>,
}

function formatMessage(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key]?.toString() ?? `{${key}}`)
}

export function createServerTranslator(locale: ServerLocale) {
  return (key: string, vars?: Record<string, string | number>) => {
    const messages = MESSAGES[locale] ?? MESSAGES["zh-CN"]
    const template = messages[key] ?? MESSAGES.en[key] ?? key
    return formatMessage(template, vars)
  }
}
```

**Step 4: Run test to verify it passes**

Run: `node --test --loader tsx src/lib/i18n/__tests__/server.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/i18n/server.ts src/lib/i18n/__tests__/server.test.ts
git commit -m "feat: add server i18n helper for sdui"
```

---

### Task 2: 构建 Tasks SDUI 节点生成器

**Files:**
- Create: `src/server/sdui/tasks-builder.ts`
- Create: `src/server/sdui/__tests__/tasks-builder.test.ts`

**Step 1: Write the failing test**

```ts
import test from "node:test"
import assert from "node:assert/strict"
import { buildTasksSdui } from "@/server/sdui/tasks-builder"

const makeTask = (overrides = {}) => ({
  id: "task-1",
  topic: "Test Topic",
  keywords: "alpha,beta",
  status: "completed",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  totalWordCount: 1200,
  articleWordCount: 1100,
  articleTitle: "Test Title",
  articleSubtitle: null,
  coverPromptId: null,
  coverUrl: null,
  refMaterialId: null,
  currentChapter: null,
  totalChapters: null,
  refMaterial: null,
  ...overrides,
})

test("buildTasksSdui returns list nodes and meta", () => {
  const result = buildTasksSdui({
    tasks: [makeTask()],
    search: "",
    compact: false,
    viewingTaskId: undefined,
    locale: "en",
  })

  const flatten = (node: any): any[] => {
    if (!node) return []
    const children = Array.isArray(node.children) ? node.children : []
    return [node, ...children.flatMap((child) => flatten(child))]
  }

  assert.equal(result.nodes.type, "column")
  assert.equal(result.meta.processingCount, 0)

  const nodes = flatten(result.nodes)
  const regenerate = nodes.find((node) => node?.onClick?.action === "regenerate")
  assert.ok(regenerate)
})
```

**Step 2: Run test to verify it fails**

Run: `node --test --loader tsx src/server/sdui/__tests__/tasks-builder.test.ts`

Expected: FAIL with module not found or missing export.

**Step 3: Write minimal implementation**

```ts
import type { A2UINode, A2UICardNode, A2UIRowNode } from "@/lib/a2ui"
import { buildStandardCardNode } from "@/lib/a2ui/article-card"
import { createServerTranslator, type ServerLocale } from "@/lib/i18n/server"
import type { TaskWithMaterial } from "@/server/services/task.service"

type SduiTasksMeta = {
  processingCount: number
  hasActiveTasks: boolean
}

type BuildTasksSduiOptions = {
  tasks: TaskWithMaterial[]
  search: string
  compact: boolean
  viewingTaskId?: string
  locale: ServerLocale
}

const ACTIVE_STATUSES = new Set(["pending", "processing"])

export function buildTasksSdui(options: BuildTasksSduiOptions): { nodes: A2UINode; meta: SduiTasksMeta } {
  const { tasks, search, compact, viewingTaskId, locale } = options
  const t = createServerTranslator(locale)
  const dateLocale = locale === "zh-CN" ? "zh-CN" : "en-US"

  const formatWordCount = (articleWordCount?: number | null, totalWordCount?: number) => {
    if (articleWordCount && articleWordCount > 0) {
      return locale === "zh-CN"
        ? `${articleWordCount.toLocaleString(dateLocale)} 字`
        : `${articleWordCount.toLocaleString(dateLocale)} words`
    }
    if (totalWordCount && totalWordCount > 0) {
      return locale === "zh-CN"
        ? `目标 ${totalWordCount.toLocaleString(dateLocale)} 字`
        : `Target ${totalWordCount.toLocaleString(dateLocale)} words`
    }
    return locale === "zh-CN" ? "字数未知" : "Unknown word count"
  }

  const buildTaskCard = (task: TaskWithMaterial, highlight = false): A2UICardNode => {
    const canStop = task.status === "pending" || task.status === "processing"
    const canRetry = task.status === "failed" || task.status === "cancelled"
    const canViewArticle = task.status === "completed"
    const canEdit = task.status === "pending" || task.status === "failed" || task.status === "cancelled"

    const actions: A2UINode[] = []
    if (canViewArticle) {
      actions.push({
        type: "button",
        text: t("article.viewArticle"),
        variant: "primary",
        size: "sm",
        onClick: { action: "viewArticle", args: [task.id, task.topic] },
      })
      actions.push({
        type: "button",
        text: t("taskForm.regenerateTitle"),
        variant: "secondary",
        size: "sm",
        onClick: {
          action: "regenerate",
          args: [task.id, task.topic, task.keywords, task.coverPromptId, task.refMaterialId],
        },
      })
    }
    if (canRetry) {
      actions.push({
        type: "button",
        text: t("task.retry"),
        variant: "secondary",
        size: "sm",
        onClick: { action: "retry", args: [task.id] },
      })
    }
    if (canStop) {
      actions.push({
        type: "button",
        text: t("task.stop"),
        variant: "secondary",
        size: "sm",
        onClick: { action: "stop", args: [task.id] },
      })
    }
    actions.push({
      type: "button",
      text: t("common.delete"),
      variant: "destructive",
      size: "sm",
      onClick: { action: "delete", args: [task.id] },
    })

    const displayTitle = task.articleTitle || task.topic || t("tasks.untitledTask")
    const headerNodes: A2UINode[] = [
      {
        type: "text",
        text: displayTitle,
        variant: "h4",
        className: "line-clamp-2",
      },
      ...(task.articleSubtitle ? [{
        type: "text",
        text: task.articleSubtitle,
        variant: "body",
        color: "muted",
        className: "text-sm line-clamp-2",
      }] : []),
      {
        type: "row",
        align: "center",
        gap: "0.5rem",
        children: [
          { type: "text", text: t(`status.${task.status}`), variant: "caption", color: "muted" },
          { type: "text", text: "·", variant: "caption", color: "muted" },
          { type: "text", text: formatWordCount(task.articleWordCount, task.totalWordCount), variant: "caption", color: "muted" },
        ],
      } as A2UIRowNode,
    ]

    const hasProgress = task.status === "processing" && task.currentChapter != null && task.totalChapters != null && task.totalChapters > 0
    if (hasProgress) {
      const progressPercent = Math.min(Math.round((task.currentChapter! / task.totalChapters!) * 100), 100)
      const isPolishing = task.currentChapter! >= task.totalChapters!
      headerNodes.push({
        type: "column",
        gap: "0.25rem",
        children: [
          { type: "progress", status: "processing", value: progressPercent, className: "h-1.5" },
          {
            type: "row",
            align: "center",
            gap: "0.5rem",
            children: [
              {
                type: "text",
                text: isPolishing
                  ? t("tasks.polishing")
                  : t("tasks.writingProgress", { current: task.currentChapter!, total: task.totalChapters! }),
                variant: "caption",
                color: "primary",
              },
              { type: "container", className: "w-1.5 h-1.5 rounded-full bg-primary animate-pulse" },
            ],
          },
        ],
      })
    }

    const bodyNodes: A2UINode[] = compact ? [] : [
      {
        type: "row",
        align: "start",
        gap: "0.5rem",
        children: [
          { type: "text", text: `${t("taskForm.topic")}:`, variant: "caption", color: "muted", className: "shrink-0" },
          {
            type: "editable-text",
            value: task.topic || "",
            placeholder: t("tasks.untitledTask"),
            variant: "caption",
            editable: canEdit,
            onChange: { action: "updateTopic", args: [task.id] },
            className: "text-sm leading-normal flex-1",
          },
        ],
      },
      {
        type: "row",
        align: "start",
        gap: "0.5rem",
        children: [
          { type: "text", text: `${t("taskForm.keywords")}:`, variant: "caption", color: "muted", className: "shrink-0" },
          {
            type: "editable-text",
            value: task.keywords || "",
            placeholder: t("tasks.noKeywords"),
            variant: "caption",
            multiline: true,
            editable: canEdit,
            onChange: { action: "updateKeywords", args: [task.id] },
            style: {
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            },
          },
        ],
      },
    ]

    const footerNodes: A2UINode[] = [
      {
        type: "row",
        justify: "between",
        align: "center",
        wrap: true,
        gap: "0.5rem",
        children: [
          {
            type: "column",
            gap: "0.35rem",
            children: [
              ...(task.refMaterial
                ? [{
                    type: "column",
                    gap: "0.35rem",
                    children: [
                      {
                        type: "text",
                        text: `风格: ${task.refMaterial.styleName ?? t("tasks.refMaterial")}`,
                        variant: "caption",
                        color: "primary",
                      },
                      task.refMaterial.sourceUrl
                        ? ({
                            type: "link",
                            text: `原文: ${task.refMaterial.sourceTitle ?? task.refMaterial.sourceUrl}`,
                            href: task.refMaterial.sourceUrl,
                            external: true,
                            className: "text-xs max-w-[var(--a2ui-ref-title-max)] overflow-hidden text-ellipsis whitespace-[var(--a2ui-ref-title-white-space)]",
                          } as A2UINode)
                        : ({
                            type: "text",
                            text: `原文: ${task.refMaterial.sourceTitle ?? "-"}`,
                            variant: "caption",
                            color: "muted",
                            className: "max-w-[var(--a2ui-ref-title-max)] overflow-hidden text-ellipsis whitespace-[var(--a2ui-ref-title-white-space)]",
                          } as A2UINode),
                    ],
                  }]
                : []),
              {
                type: "row",
                align: "center",
                gap: "0.5rem",
                children: [
                  {
                    type: "text",
                    text: `${t("tasks.created")}: ${new Date(task.createdAt).toLocaleString(dateLocale)}`,
                    variant: "caption",
                    color: "muted",
                  },
                ],
              } as A2UIRowNode,
            ],
          },
          { type: "row", gap: "0.5rem", children: actions } as A2UIRowNode,
        ],
      } as A2UIRowNode,
    ]

    return buildStandardCardNode({
      id: `task-${task.id}`,
      hoverable: true,
      cover: task.coverUrl
        ? { type: "image", src: task.coverUrl, alt: task.topic, className: "w-full h-40 object-cover" }
        : {
            type: "container",
            className: "w-full h-40 bg-muted flex items-center justify-center",
            children: [{ type: "text", text: t("tasks.title"), color: "muted" }],
          },
      header: headerNodes,
      body: bodyNodes,
      footer: footerNodes,
      cardStyle: {
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: 0,
        ...(highlight ? { boxShadow: "0 0 0 2px var(--primary)", backgroundColor: "var(--accent)" } : {}),
      },
    })
  }

  const hasSearch = search.trim().length > 0
  const listContent: A2UINode = tasks.length === 0
    ? {
        type: "card",
        hoverable: false,
        className: "p-8 text-center",
        children: [
          {
            type: "column",
            gap: "0.75rem",
            className: "items-center",
            children: [
              { type: "text", text: hasSearch ? t("tasks.noSearchResults") : t("tasks.noTasks"), color: "muted" },
              ...(hasSearch ? [
                { type: "text", text: t("tasks.tryDifferentKeywords"), variant: "caption", color: "muted" },
                { type: "button", text: t("tasks.clearSearch"), variant: "secondary", size: "sm", onClick: { action: "clearSearch" } },
              ] : []),
            ],
          },
        ],
      }
    : {
        type: "column",
        gap: "1rem",
        children: tasks.map((task) => buildTaskCard(task, task.id === viewingTaskId)),
      }

  const processingCount = tasks.filter((task) => ACTIVE_STATUSES.has(task.status)).length

  return {
    nodes: listContent,
    meta: {
      processingCount,
      hasActiveTasks: processingCount > 0,
    },
  }
}
```

**Step 4: Run test to verify it passes**

Run: `node --test --loader tsx src/server/sdui/__tests__/tasks-builder.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/server/sdui/tasks-builder.ts src/server/sdui/__tests__/tasks-builder.test.ts
git commit -m "feat: add tasks sdui node builder"
```

---

### Task 3: 新增 SDUI API 路由并接入任务服务

**Files:**
- Create: `src/app/api/internal/sdui/tasks/route.ts`
- Modify: `src/server/sdui/tasks-builder.ts`

**Step 1: Write a failing request spec (manual)**

Command (after dev server running): `curl -s "http://localhost:3000/api/internal/sdui/tasks?page=1&pageSize=20&search=&locale=zh-CN&compact=false"`

Expected: 401 without session; 200 with `{ nodes, meta }` after login.

**Step 2: Implement route**

```ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { taskService } from "@/server/services/task.service"
import { buildTasksSdui } from "@/server/sdui/tasks-builder"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const page = Math.max(1, Number(params.get("page") ?? 1))
  const pageSize = Math.min(50, Math.max(1, Number(params.get("pageSize") ?? 20)))
  const search = params.get("search") ?? ""
  const compact = params.get("compact") === "true"
  const locale = (params.get("locale") === "en" ? "en" : "zh-CN")
  const viewingTaskId = params.get("viewingTaskId") ?? undefined

  const result = await taskService.getAll({
    page,
    pageSize,
    search: search || undefined,
    userId: session.user.id,
  })

  const sdui = buildTasksSdui({
    tasks: result.tasks,
    search,
    compact,
    viewingTaskId,
    locale,
  })

  return NextResponse.json(sdui)
}
```

**Step 3: Manual verification**

Run: `curl -s "http://localhost:3000/api/internal/sdui/tasks?page=1&pageSize=20&locale=zh-CN"` (after login)

Expected: JSON with `nodes` and `meta` fields.

**Step 4: Commit**

```bash
git add src/app/api/internal/sdui/tasks/route.ts src/server/sdui/tasks-builder.ts
git commit -m "feat: add tasks sdui api route"
```

---

### Task 4: 客户端接入 SDUI 轮询与渲染

**Files:**
- Create: `src/hooks/use-sdui-task-polling.ts`
- Modify: `src/app/tasks/page.tsx`

**Step 1: Add a failing type check (manual)**

Run: `npm run typecheck`

Expected: FAIL once new hook is referenced but not yet implemented.

**Step 2: Implement SDUI polling hook**

```ts
import { useEffect, useMemo, useState } from "react"
import type { A2UINode } from "@/lib/a2ui"

type SduiTasksMeta = { processingCount: number; hasActiveTasks: boolean }

type SduiTasksResponse = { nodes: A2UINode; meta: SduiTasksMeta }

export function useSduiTaskPolling(options: {
  page: number
  pageSize: number
  search: string
  locale: "en" | "zh-CN"
  compact: boolean
  viewingTaskId?: string
  enabled: boolean
  pollingInterval?: number
}) {
  const {
    page,
    pageSize,
    search,
    locale,
    compact,
    viewingTaskId,
    enabled,
    pollingInterval = 3000,
  } = options

  const [data, setData] = useState<SduiTasksResponse | null>(null)
  const [error, setError] = useState<{ message: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      search,
      locale,
      compact: String(compact),
    })
    if (viewingTaskId) params.set("viewingTaskId", viewingTaskId)
    return params.toString()
  }, [page, pageSize, search, locale, compact, viewingTaskId])

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/internal/sdui/tasks?${queryString}`)
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Request failed: ${response.status}`)
      }
      const json = await response.json() as SduiTasksResponse
      setData(json)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError({ message })
    }
  }

  useEffect(() => {
    if (!enabled) return
    setIsLoading(true)
    fetchData().finally(() => setIsLoading(false))
  }, [enabled, queryString])

  const hasActiveTasks = data?.meta.hasActiveTasks ?? false

  useEffect(() => {
    if (!enabled || !hasActiveTasks) return
    const timer = setInterval(fetchData, pollingInterval)
    return () => clearInterval(timer)
  }, [enabled, hasActiveTasks, pollingInterval, queryString])

  const processingCount = data?.meta.processingCount ?? 0
  const isPolling = hasActiveTasks && !isLoading

  return {
    data,
    isLoading,
    isPolling,
    processingCount,
    error,
    refetch: fetchData,
  }
}
```

**Step 3: Update `/tasks` to use SDUI response**

- 用 `useSduiTaskPolling` 代替 `useTaskPolling`。
- `headerNode` 仍在客户端构建，`listContent` 使用 SDUI `nodes`。
- `processingCount/isPolling` 改为来自 SDUI `meta`。
- `regenerate` action 改为直接使用 action args（不再依赖 `tasks` 列表）。
- `searchQuery` 变化触发 SDUI 重取。

**Step 4: Run typecheck**

Run: `npm run typecheck`

Expected: PASS

**Step 5: Manual verification**

- `npm run dev` → 打开 `http://localhost:3000/tasks`
- 校验：
  - 页面加载成功，任务列表与之前一致
  - 处理中的任务出现轮询标记
  - 搜索与清空搜索正常
  - 查看文章、更新章节、更新封面等交互正常
  - Markdown 编辑实时预览与保存依旧可用

**Step 6: Commit**

```bash
git add src/hooks/use-sdui-task-polling.ts src/app/tasks/page.tsx
git commit -m "feat: wire tasks page to sdui"
```

---

### Task 5: 最终验证

**Step 1: Run targeted tests**

Run:
- `node --test --loader tsx src/lib/i18n/__tests__/server.test.ts`
- `node --test --loader tsx src/server/sdui/__tests__/tasks-builder.test.ts`

Expected: PASS

**Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS

**Step 3: Final manual smoke test**

- `npm run dev`
- 打开 `/tasks` 验证 SDUI 结果与核心交互

**Step 4: Commit (if any fixes)**

```bash
git add -A
git commit -m "chore: polish tasks sdui"
```
