"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useSession } from "next-auth/react"
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { useSduiTaskPolling } from "@/hooks/use-sdui-task-polling"
import { DashboardShell } from "@/components/dashboard-shell"
import { A2UIRenderer, a2uiToast, showConfirmToast } from "@/components/a2ui"
import type {
  A2UIColumnNode,
  A2UINode,
} from "@/lib/a2ui"
import { assembleChapterMarkdown, type MediaLike } from "@/lib/markdown"

// Mobile breakpoint (matches Tailwind md:)
const MOBILE_BREAKPOINT = 768

export default function TasksPage() {
  const { t, locale } = useI18n()
  const { status } = useSession()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [articleViewerState, setArticleViewerState] = useState<{
    isOpen: boolean
    markdown: string
    title: string
    taskId?: string
    executionId?: string
    wechatMediaInfo?: unknown | null
    chapters?: Array<{
      id: string
      actNumber: number
      actName: string
      formattedContent: string
    }>
  }>({ isOpen: false, markdown: "", title: "", taskId: undefined, executionId: undefined, wechatMediaInfo: null })
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

  const isArticleOpen = articleViewerState.isOpen
  const viewingTaskId = isArticleOpen ? articleViewerState.taskId : undefined
  const isSplitView = isArticleOpen && !isMobile
  const isMobileArticleView = isArticleOpen && isMobile

  const {
    data: sduiData,
    isPolling,
    processingCount,
    error,
    refetch,
  } = useSduiTaskPolling({
    page: 1,
    pageSize: 20,
    search: searchQuery,
    locale,
    compact: isSplitView,
    viewingTaskId,
    enabled: status !== "loading",
    pollingInterval: 3000,
  })

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

  const confirmLabel = t("common.confirm")

  const handleStop = (id: string) => {
    showConfirmToast(t("task.stopConfirm"), () => cancelMutation.mutate({ id }), {
      label: confirmLabel,
    })
  }

  const handleRetry = (id: string) => {
    showConfirmToast(t("task.retryConfirm"), () => retryMutation.mutate({ id }), {
      label: confirmLabel,
    })
  }

  const handleDelete = (id: string) => {
    showConfirmToast(t("task.deleteConfirm"), () => deleteMutation.mutate({ id }), {
      label: confirmLabel,
    })
  }

  // Get trpc utils for imperative queries
  const trpcUtils = api.useUtils()

  const handleViewArticle = async (taskId: string, taskTopic: string) => {
    const execution = await trpcUtils.tasks.getLatestExecution.fetch({ id: taskId })
    if (!execution) return

    const chaptersRaw = await trpcUtils.chapters.getByExecutionId.fetch({ executionId: execution.id })
    const chapters = chaptersRaw.map((chapter) => ({
      id: chapter.id,
      actNumber: chapter.actNumber,
      actName: chapter.actName ?? "",
      formattedContent: chapter.formattedContent ?? "",
    }))
    const markdown = chapters.length > 0
      ? assembleChapterMarkdown(chapters, { media: execution.wechatMediaInfo as MediaLike | MediaLike[] | null | undefined, mediaStrategy: "latest" })
      : (execution.articleMarkdown ?? "")

    setArticleViewerState({
      isOpen: true,
      markdown,
      title: execution.articleTitle || taskTopic,
      taskId,
      executionId: execution.id,
      wechatMediaInfo: execution.wechatMediaInfo,
      chapters,
    })
  }

  const updateExecutionResultMutation = api.tasks.updateExecutionResult.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const handleUpdateExecutionResult = (updates: { coverUrl?: string; wechatMediaId?: string }) => {
    if (articleViewerState.executionId) {
      updateExecutionResultMutation.mutate({
        executionId: articleViewerState.executionId,
        coverUrl: updates.coverUrl,
        wechatMediaId: updates.wechatMediaId,
      })
      // Update local state
      setArticleViewerState((prev) => ({
        ...prev,
        wechatMediaInfo: {
          ...(prev.wechatMediaInfo as Record<string, unknown> | null),
          r2_url: updates.coverUrl ?? (prev.wechatMediaInfo as any)?.r2_url,
          media_id: updates.wechatMediaId ?? (prev.wechatMediaInfo as any)?.media_id,
        },
      }))
    }
  }

  const updateChapterMutation = api.chapters.update.useMutation({
    onSuccess: () => {
      refetch()
      a2uiToast.success(t("common.saved"))
    },
    onError: () => {
      a2uiToast.error(t("task.updateFailed"))
    },
  })

  const handleUpdateChapter = (chapterId: string, formattedContent: string) => {
    updateChapterMutation.mutate({ chapterId, formattedContent })
    setArticleViewerState((prev) => {
      const chapters = prev.chapters?.map((chapter) =>
        chapter.id === chapterId ? { ...chapter, formattedContent } : chapter
      )
      return {
        ...prev,
        chapters,
        markdown: chapters ? assembleChapterMarkdown(chapters) : prev.markdown,
      }
    })
  }

  const updateMediaInfoMutation = api.tasks.updateExecutionMediaInfo.useMutation({
    onSuccess: () => {
      refetch()
      a2uiToast.success(t("common.saved"))
    },
    onError: () => {
      a2uiToast.error(t("task.updateFailed"))
    },
  })

  const handleUpdateMediaInfo = (wechatMediaInfo: unknown) => {
    if (!articleViewerState.executionId) return
    updateMediaInfoMutation.mutate({
      executionId: articleViewerState.executionId,
      wechatMediaInfo,
    })
    setArticleViewerState((prev) => ({
      ...prev,
      wechatMediaInfo: wechatMediaInfo as any,
    }))
  }

  const handleRegenerate = (data: {
    topic?: string
    keywords?: string | null
    coverPromptId?: string | null
    refMaterialId?: string | null
  }) => {
    setRegenerateData({
      topic: data.topic,
      keywords: data.keywords ?? undefined,
      coverPromptId: data.coverPromptId ?? undefined,
      refMaterialId: data.refMaterialId ?? undefined,
    })
    setIsModalOpen(true)
  }

  const handleUpdate = useCallback((id: string, data: { topic?: string; keywords?: string }) => {
    updateMutation.mutate({ id, ...data })
  }, [updateMutation])

  const listContentNode: A2UINode = useMemo(() => {
    if (error) {
      return {
        type: "card",
        hoverable: false,
        className: "p-8 text-center",
        children: [{ type: "text", text: `错误: ${error.message}`, color: "muted" }],
      }
    }

    if (!sduiData) {
      return {
        type: "row",
        justify: "center",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    return sduiData.nodes
  }, [error, sduiData, t])

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
          {
            type: "row",
            align: "center",
            gap: "0.75rem",
            children: [
              { type: "text", text: t("tasks.title"), variant: "h2", weight: "bold" },
              // 轮询状态指示器
              ...(isPolling ? [{
                type: "badge" as const,
                text: t("tasks.polling", { count: processingCount }),
                color: "processing" as const,
              }] : []),
            ],
          },
          { type: "button", text: t("tasks.newTask"), variant: "primary", size: "md", onClick: { action: "newTask" } },
        ],
      },
      // 搜索框
      {
        type: "input",
        id: "search-tasks",
        name: "search-tasks",
        value: searchQuery,
        placeholder: t("tasks.searchPlaceholder"),
        inputType: "text",
        autocomplete: "off",
        className: "max-w-full",
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
          const [_taskId, topic, keywords, coverPromptId, refMaterialId] = args as [
            string,
            string | undefined,
            string | null | undefined,
            string | null | undefined,
            string | null | undefined
          ]
          handleRegenerate({ topic, keywords, coverPromptId, refMaterialId })
          break
        }
        case "closeCreateTask":
          handleCreateTaskClose()
          break
        case "createTaskSuccess":
          handleCreateTaskSuccess()
          break
        case "closeArticleViewer":
          setArticleViewerState({ isOpen: false, markdown: "", title: "", taskId: undefined, executionId: undefined, wechatMediaInfo: null })
          break
        case "updateExecutionResult": {
          const result = args?.[0] as { coverUrl?: string; wechatMediaId?: string }
          handleUpdateExecutionResult(result)
          break
        }
        case "updateChapter": {
          const [chapterId, formattedContent] = args as [string, string]
          handleUpdateChapter(chapterId, formattedContent)
          break
        }
        case "updateMediaInfo": {
          const next = args?.[0]
          handleUpdateMediaInfo(next)
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
      t,
      trpcUtils,
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
      handleUpdateChapter,
      handleUpdateMediaInfo,
    ]
  )

  const createTaskInitialData = useMemo(
    () => regenerateData ?? undefined,
    [regenerateData]
  )

  const isRegenerate = regenerateData !== null

  if (status === "loading") return null

  const listColumn: A2UINode = {
    type: "container",
    className: "flex-1 min-w-[280px] min-h-0 flex flex-col overflow-hidden",
    children: [
      // Header stays fixed
      {
        type: "container",
        className: "shrink-0 pb-3",
        children: [headerNode],
      },
      // Task list scrolls independently
      {
        type: "scroll-area",
        className: "flex-1 min-h-0",
        children: [
          {
            type: "container",
            className: "flex flex-col gap-3",
            children: [listContentNode],
          },
        ],
      },
    ],
  }

  const viewerColumn: A2UINode = {
    type: "container",
    className: `${isMobileArticleView ? "flex-1 min-w-0" : "flex-[1.4] min-w-[320px]"} min-h-0 flex flex-col overflow-hidden`,
    children: [
      {
        type: "container",
        className: "flex-1 min-h-0 flex flex-col overflow-hidden",
        children: [
          {
            type: "article-viewer-modal",
            open: articleViewerState.isOpen,
            markdown: articleViewerState.markdown,
            title: articleViewerState.title,
            executionId: articleViewerState.executionId,
            wechatMediaInfo: (articleViewerState.wechatMediaInfo ?? undefined) as any,
            chapters: articleViewerState.chapters ?? undefined,
            onClose: { action: "closeArticleViewer" },
            onUpdateResult: { action: "updateExecutionResult" },
            onUpdateChapter: { action: "updateChapter" },
            onUpdateMediaInfo: { action: "updateMediaInfo" },
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
        className: "flex-1 min-h-0 flex flex-col overflow-hidden",
        children: [viewerColumn],
      }
    }

    // Desktop: split view with list and viewer side by side
    if (isSplitView) {
      return {
        type: "container",
        className: "flex-1 min-h-0 flex flex-row gap-4 overflow-hidden",
        children: [listColumn, viewerColumn],
      }
    }

    // Default: show only task list
    return {
      type: "container",
      className: "flex-1 min-h-0 flex flex-col overflow-hidden",
      children: [
        {
          type: "container",
          className: "shrink-0 pb-3",
          children: [headerNode],
        },
        {
          type: "scroll-area",
          className: "flex-1 min-h-0",
          children: [
            {
              type: "container",
              className: "flex flex-col gap-3",
              children: [listContentNode],
            },
          ],
        },
      ],
    }
  }

  const contentNode = buildContentNode()

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

  return (
    <DashboardShell>
      <A2UIRenderer node={[contentNode, ...modalNodes]} onAction={handleA2UIAction} />
    </DashboardShell>
  )
}
