"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer, a2uiToast } from "@/components/a2ui"
import type {
  A2UIAppShellNode,
  A2UIColumnNode,
  A2UINode,
  A2UICardNode,
  A2UIRowNode,
} from "@/lib/a2ui"
import { buildNavItems } from "@/lib/navigation"
import { buildStandardCardNode } from "@/lib/a2ui/article-card"

// Mobile breakpoint (matches Tailwind md:)
const MOBILE_BREAKPOINT = 768

// Task type from API
interface TaskWithMaterial {
  id: string
  topic: string
  keywords: string | null
  status: "pending" | "processing" | "completed" | "failed" | "cancelled"
  createdAt: Date
  totalWordCount: number
  coverPromptId: string | null
  coverUrl?: string | null
  refMaterialId: string | null
  refMaterial?: {
    styleName: string | null
    sourceTitle: string | null
    sourceUrl: string | null
  } | null
}

export default function TasksPage() {
  const { t } = useI18n()
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const mounted = status !== "loading"
  const logout = () => signOut({ callbackUrl: "/login" })
  const navItems = buildNavItems(t)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [articleViewerState, setArticleViewerState] = useState<{
    isOpen: boolean
    markdown: string
    title: string
    taskId?: string
    executionId?: string
    executionResult?: { coverUrl?: string; wechatMediaId?: string } | null
  }>({ isOpen: false, markdown: "", title: "", taskId: undefined, executionId: undefined, executionResult: null })
  const [regenerateData, setRegenerateData] = useState<{
    topic?: string
    keywords?: string
    coverPromptId?: string
    refMaterialId?: string
  } | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const { data, isLoading, error, refetch } = api.tasks.getAll.useQuery(
    { page: 1, pageSize: 20, search: searchQuery || undefined },
    { enabled: mounted }
  )

  const tasks = data?.tasks ?? []

  const cancelMutation = api.tasks.cancel.useMutation({
    onSuccess: () => refetch(),
  })

  const retryMutation = api.tasks.retry.useMutation({
    onSuccess: () => refetch(),
  })

  const deleteMutation = api.tasks.delete.useMutation({
    onSuccess: () => refetch(),
  })

  const updateMutation = api.tasks.update.useMutation({
    onSuccess: () => {
      refetch()
      a2uiToast.success(t("common.update"))
    },
    onError: () => {
      a2uiToast.error(t("task.updateFailed"))
    },
  })

  const handleNewTask = () => setIsModalOpen(true)

  const handleStop = (id: string) => {
    if (confirm(t("task.stopConfirm"))) {
      cancelMutation.mutate({ id })
    }
  }

  const handleRetry = (id: string) => {
    if (confirm(t("task.retryConfirm"))) {
      retryMutation.mutate({ id })
    }
  }

  const handleDelete = (id: string) => {
    if (confirm(t("task.deleteConfirm"))) {
      deleteMutation.mutate({ id })
    }
  }

  // Get trpc utils for imperative queries
  const trpcUtils = api.useUtils()

  const handleViewArticle = async (taskId: string, taskTopic: string) => {
    const execution = await trpcUtils.tasks.getLatestExecution.fetch({ id: taskId })
    if (execution?.articleMarkdown) {
      setArticleViewerState({
        isOpen: true,
        markdown: execution.articleMarkdown,
        title: taskTopic,
        taskId,
        executionId: execution.id,
        executionResult: execution.result,
      })
    }
  }

  const updateExecutionResultMutation = api.tasks.updateExecutionResult.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const handleUpdateExecutionResult = (result: { coverUrl?: string; wechatMediaId?: string }) => {
    if (articleViewerState.executionId) {
      updateExecutionResultMutation.mutate({
        executionId: articleViewerState.executionId,
        result,
      })
      // Update local state
      setArticleViewerState((prev) => ({
        ...prev,
        executionResult: result,
      }))
    }
  }

  const updateExecutionMarkdownMutation = api.tasks.updateExecutionMarkdown.useMutation({
    onSuccess: () => {
      refetch()
      a2uiToast.success(t("common.saved"))
    },
    onError: () => {
      a2uiToast.error(t("task.updateFailed"))
    },
  })

  const handleUpdateMarkdown = (markdown: string) => {
    if (articleViewerState.executionId) {
      updateExecutionMarkdownMutation.mutate({
        executionId: articleViewerState.executionId,
        markdown,
      })
      // Update local state
      setArticleViewerState((prev) => ({
        ...prev,
        markdown,
      }))
    }
  }

  const handleRegenerate = (task: TaskWithMaterial) => {
    setRegenerateData({
      topic: task.topic,
      keywords: task.keywords ?? undefined,
      coverPromptId: task.coverPromptId ?? undefined,
      refMaterialId: task.refMaterialId ?? undefined,
    })
    setIsModalOpen(true)
  }

  const handleUpdate = useCallback((id: string, data: { topic?: string; keywords?: string }) => {
    updateMutation.mutate({ id, ...data })
  }, [updateMutation])

  const formatWordCount = (count?: number) => {
    if (!count || count <= 0) return "字数未知"
    return `约 ${count.toLocaleString("zh-CN")} 字`
  }

  // Build A2UI task card
  const buildTaskCard = (task: TaskWithMaterial, options?: { compact?: boolean; highlighted?: boolean }): A2UICardNode => {
    const isCompact = options?.compact ?? false
    const isHighlighted = options?.highlighted ?? false
    const statusColors: Record<string, string> = {
      pending: "default",
      processing: "processing",
      completed: "completed",
      failed: "failed",
      cancelled: "cancelled",
    }

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
        onClick: { action: "regenerate", args: [task.id] },
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

    const headerContentChildren: A2UINode[] = [
      {
        type: "editable-text",
        value: task.topic || t("tasks.untitledTask"),
        placeholder: t("tasks.untitledTask"),
        variant: "h4",
        editable: canEdit,
        onChange: { action: "updateTopic", args: [task.id] },
      },
    ]

    // Keywords and reference material move to body for consistent layout

    const headerNodes: A2UINode[] = [
      ...headerContentChildren,
      {
        type: "row",
        align: "center",
        gap: "0.5rem",
        children: [
          { type: "text", text: t(`status.${task.status}`), variant: "caption", color: "muted" },
          { type: "text", text: "·", variant: "caption", color: "muted" },
          { type: "text", text: formatWordCount(task.totalWordCount), variant: "caption", color: "muted" },
        ],
      } as A2UIRowNode,
    ]

    const bodyNodes: A2UINode[] = [
      ...(!isCompact ? [{
        type: "editable-text",
        value: task.keywords || "",
        placeholder: t("tasks.noKeywords"),
        variant: "caption",
        multiline: true,
        editable: canEdit,
        onChange: { action: "updateKeywords", args: [task.id] },
        style: {
          fontSize: "0.875rem",
          lineHeight: "1.5",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        },
      } as A2UINode] : []),
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
                ? [
                    {
                      type: "column" as const,
                      gap: "0.35rem",
                      children: [
                        {
                          type: "text",
                          text: `风格: ${task.refMaterial.styleName ?? t("tasks.refMaterial")}`,
                          variant: "caption",
                          color: "primary",
                        } as A2UINode,
                        task.refMaterial.sourceUrl
                          ? ({
                              type: "link",
                              text: `原文: ${task.refMaterial.sourceTitle ?? task.refMaterial.sourceUrl}`,
                              href: task.refMaterial.sourceUrl,
                              external: true,
                              style: {
                                fontSize: "0.75rem",
                                maxWidth: "var(--a2ui-ref-title-max)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "var(--a2ui-ref-title-white-space)",
                              },
                            } as A2UINode)
                          : ({
                              type: "text",
                              text: `原文: ${task.refMaterial.sourceTitle ?? "-"}`,
                              variant: "caption",
                              color: "muted",
                              style: {
                                maxWidth: "var(--a2ui-ref-title-max)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "var(--a2ui-ref-title-white-space)",
                              },
                            } as A2UINode),
                      ],
                    } as A2UINode,
                  ]
                : []),
              {
                type: "row",
                align: "center",
                gap: "0.5rem",
                children: [
                  {
                    type: "text",
                    text: `${t("tasks.created")}: ${new Date(task.createdAt).toLocaleString()}`,
                    variant: "caption",
                    color: "muted",
                  },
                ],
              } as A2UIRowNode,
            ],
          } as A2UINode,
          { type: "row", gap: "0.5rem", children: actions } as A2UIRowNode,
        ],
      } as A2UIRowNode,
    ]

    return buildStandardCardNode({
      id: `task-${task.id}`,
      hoverable: true,
      cover: task.coverUrl
        ? {
            type: "image",
            src: task.coverUrl,
            alt: task.topic,
            style: { width: "100%", height: "160px", objectFit: "cover" },
          }
        : {
            type: "container",
            style: {
              width: "100%",
              height: "160px",
              backgroundColor: "var(--muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
            children: [{ type: "text", text: "任务", color: "muted" }],
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
        ...(isHighlighted ? {
          boxShadow: "0 0 0 2px var(--primary)",
          backgroundColor: "var(--accent)",
        } : {}),
      },
    })
  }

  // Build task list content
  const viewingTaskId = articleViewerState.isOpen ? articleViewerState.taskId : undefined

  const getTaskListContent = (compact: boolean): A2UINode => {
    if (error) {
      return {
        type: "card",
        hoverable: false,
        style: { padding: "2rem", textAlign: "center" },
        children: [{ type: "text", text: `错误: ${error.message}`, color: "muted" }],
      }
    }

    if (isLoading) {
      return {
        type: "row",
        justify: "center",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    if (tasks.length === 0) {
      const hasSearch = searchQuery.trim().length > 0
      return {
        type: "card",
        hoverable: false,
        style: { padding: "2rem", textAlign: "center" },
        children: [
          {
            type: "column",
            gap: "0.75rem",
            style: { alignItems: "center" },
            children: [
              { type: "text", text: hasSearch ? t("tasks.noSearchResults") : t("tasks.noTasks"), color: "muted" },
              ...(hasSearch ? [
                { type: "text", text: t("tasks.tryDifferentKeywords"), variant: "caption", color: "muted" } as A2UINode,
                { type: "button", text: t("tasks.clearSearch"), variant: "secondary", size: "sm", onClick: { action: "clearSearch" } } as A2UINode,
              ] : []),
            ],
          },
        ],
      }
    }

    return {
      type: "column",
      gap: "1rem",
      children: tasks.map((task) => buildTaskCard(task as TaskWithMaterial, {
        compact,
        highlighted: task.id === viewingTaskId,
      })),
    }
  }

  // 页面头部
  const headerNode: A2UIColumnNode = {
    type: "column",
    gap: "1rem",
    children: [
      {
        type: "row",
        justify: "between",
        align: "center",
        wrap: true,
        gap: "0.75rem",
        children: [
          { type: "text", text: t("tasks.title"), variant: "h2", weight: "bold" },
          { type: "button", text: t("tasks.newTask"), variant: "primary", size: "md", onClick: { action: "newTask" } },
        ],
      },
      // 搜索框
      {
        type: "input",
        id: "search-tasks",
        value: searchQuery,
        placeholder: t("tasks.searchPlaceholder"),
        inputType: "text",
        style: { maxWidth: "100%" },
        onChange: { action: "setSearch" },
      },
    ],
  }

  // Memoize callbacks and data to prevent unnecessary re-renders
  const handleCreateTaskClose = useCallback(() => {
    setIsModalOpen(false)
    setRegenerateData(null)
  }, [])

  const handleCreateTaskSuccess = useCallback(() => {
    refetch()
  }, [refetch])

  const handleA2UIAction = useCallback(
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "navigate": {
          const href = args?.[0] as string
          if (href) router.push(href)
          break
        }
        case "logout":
          logout()
          break
        case "newTask":
          handleNewTask()
          break
        case "stop":
          handleStop(args?.[0] as string)
          break
        case "retry":
          handleRetry(args?.[0] as string)
          break
        case "delete":
          handleDelete(args?.[0] as string)
          break
        case "viewArticle":
          handleViewArticle(args?.[0] as string, args?.[1] as string)
          break
        case "regenerate": {
          const taskId = args?.[0] as string
          const task = tasks.find((t) => t.id === taskId)
          if (task) handleRegenerate(task)
          break
        }
        case "closeCreateTask":
          handleCreateTaskClose()
          break
        case "createTaskSuccess":
          handleCreateTaskSuccess()
          break
        case "closeArticleViewer":
          setArticleViewerState({ isOpen: false, markdown: "", title: "", taskId: undefined, executionId: undefined, executionResult: null })
          break
        case "updateExecutionResult": {
          const result = args?.[0] as { coverUrl?: string; wechatMediaId?: string }
          handleUpdateExecutionResult(result)
          break
        }
        case "updateMarkdown": {
          const markdown = args?.[0] as string
          handleUpdateMarkdown(markdown)
          break
        }
        // Editable text actions
        case "updateTopic": {
          const [newValue, taskId] = args as [string, string]
          if (newValue?.trim()) {
            handleUpdate(taskId, { topic: newValue.trim() })
          }
          break
        }
        case "updateKeywords": {
          const [newValue, taskId] = args as [string, string]
          handleUpdate(taskId, { keywords: newValue?.trim() || undefined })
          break
        }
        case "setSearch":
          setSearchQuery(args?.[0] as string ?? "")
          break
        case "clearSearch":
          setSearchQuery("")
          break
      }
    },
    [
      router,
      logout,
      t,
      trpcUtils,
      tasks,
      handleNewTask,
      handleStop,
      handleRetry,
      handleDelete,
      handleViewArticle,
      handleRegenerate,
      handleUpdate,
      handleCreateTaskClose,
      handleCreateTaskSuccess,
      handleUpdateExecutionResult,
      handleUpdateMarkdown,
    ]
  )

  const createTaskInitialData = useMemo(
    () => regenerateData ?? undefined,
    [regenerateData]
  )

  const isRegenerate = regenerateData !== null

  if (!mounted) return null

  const isArticleOpen = articleViewerState.isOpen
  // On mobile, show full screen article; on desktop, show split view
  const isSplitView = isArticleOpen && !isMobile
  const isMobileArticleView = isArticleOpen && isMobile

  const listColumn: A2UINode = {
    type: "container",
    style: {
      flex: 1,
      minWidth: "280px",
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    },
    children: [
      // Header stays fixed
      {
        type: "container",
        style: { flexShrink: 0, paddingBottom: "0.75rem" },
        children: [headerNode],
      },
      // Task list scrolls independently
      {
        type: "scroll-area",
        style: { flex: 1, minHeight: 0 },
        children: [
          {
            type: "container",
            style: { display: "flex", flexDirection: "column", gap: "0.75rem" },
            children: [getTaskListContent(isSplitView)],
          },
        ],
      },
    ],
  }

  const viewerColumn: A2UINode = {
    type: "container",
    style: {
      flex: isMobileArticleView ? 1 : 1.4,
      minWidth: isMobileArticleView ? 0 : "320px",
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    },
    children: [
      {
        type: "container",
        style: {
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
        children: [
          {
            type: "article-viewer-modal",
            open: articleViewerState.isOpen,
            markdown: articleViewerState.markdown,
            title: articleViewerState.title,
            executionId: articleViewerState.executionId,
            executionResult: articleViewerState.executionResult ?? undefined,
            onClose: { action: "closeArticleViewer" },
            onUpdateResult: { action: "updateExecutionResult" },
            onUpdateMarkdown: { action: "updateMarkdown" },
          },
        ],
      },
    ],
  }

  // Build content based on view mode
  const buildContentNode = (): A2UINode => {
    // Mobile: show only article viewer (full screen)
    if (isMobileArticleView) {
      return {
        type: "container",
        style: {
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
        children: [viewerColumn],
      }
    }

    // Desktop: split view with list and viewer side by side
    if (isSplitView) {
      return {
        type: "container",
        style: {
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "row",
          gap: "1rem",
          overflow: "hidden",
        },
        children: [listColumn, viewerColumn],
      }
    }

    // Default: show only task list
    return {
      type: "container",
      style: {
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      },
      children: [
        {
          type: "container",
          style: { flexShrink: 0, paddingBottom: "0.75rem" },
          children: [headerNode],
        },
        {
          type: "scroll-area",
          style: { flex: 1, minHeight: 0 },
          children: [
            {
              type: "container",
              style: { display: "flex", flexDirection: "column", gap: "0.75rem" },
              children: [getTaskListContent(false)],
            },
          ],
        },
      ],
    }
  }

  const contentNode = buildContentNode()

  const appShellNode: A2UIAppShellNode = {
    type: "app-shell",
    brand: t("app.title"),
    logoSrc: "/logo.png",
    logoAlt: "Wonton",
    navItems,
    activePath: pathname,
    onNavigate: { action: "navigate" },
    onLogout: { action: "logout" },
    logoutLabel: t("auth.logout"),
    headerActions: [{ type: "theme-switcher" }],
    children: [contentNode],
  }

  const modalNodes: A2UINode[] = [
    {
      type: "create-task-modal",
      open: isModalOpen,
      initialData: createTaskInitialData,
      isRegenerate,
      onClose: { action: "closeCreateTask" },
      onSuccess: { action: "createTaskSuccess" },
    },
  ]

  return <A2UIRenderer node={[appShellNode, ...modalNodes]} onAction={handleA2UIAction} />
}
