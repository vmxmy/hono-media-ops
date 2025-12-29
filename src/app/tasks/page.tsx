"use client"

import { useState, useCallback, useMemo } from "react"
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

// Task type from API
interface TaskWithMaterial {
  id: string
  topic: string
  keywords: string | null
  status: "pending" | "processing" | "completed" | "failed" | "cancelled"
  createdAt: Date
  coverPromptId: string | null
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
  const logout = () => signOut({ callbackUrl: "/" })
  const navItems = buildNavItems(t)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [articleViewerState, setArticleViewerState] = useState<{
    isOpen: boolean
    markdown: string
    title: string
  }>({ isOpen: false, markdown: "", title: "" })
  const [regenerateData, setRegenerateData] = useState<{
    topic?: string
    keywords?: string
    coverPromptId?: string
    refMaterialId?: string
  } | null>(null)

  const { data, isLoading, error, refetch } = api.tasks.getAll.useQuery(
    { page: 1, pageSize: 20 },
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
      })
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

  // Build A2UI task card
  const buildTaskCard = (task: TaskWithMaterial): A2UICardNode => {
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

    // Build children array with editable text and optional reference material
    const contentChildren: A2UINode[] = [
      {
        type: "editable-text",
        value: task.topic || t("tasks.untitledTask"),
        placeholder: t("tasks.untitledTask"),
        variant: "h4",
        editable: canEdit,
        onChange: { action: "updateTopic", args: [task.id] },
      },
      {
        type: "editable-text",
        value: task.keywords || "",
        placeholder: t("tasks.noKeywords"),
        variant: "caption",
        multiline: true,
        editable: canEdit,
        onChange: { action: "updateKeywords", args: [task.id] },
      },
    ]

    // Add reference material if exists
    if (task.refMaterial) {
      contentChildren.push({
        type: "row",
        gap: "0.5rem",
        align: "center",
        style: { marginTop: "0.25rem" },
        children: [
          { type: "text", text: "📄", variant: "caption" },
          task.refMaterial.sourceUrl
            ? {
                type: "link",
                text: task.refMaterial.styleName || task.refMaterial.sourceTitle || t("tasks.refMaterial"),
                href: task.refMaterial.sourceUrl,
                external: true,
                style: { fontSize: "0.75rem" },
              }
            : {
                type: "text",
                text: task.refMaterial.styleName || task.refMaterial.sourceTitle || t("tasks.refMaterial"),
                variant: "caption",
                color: "muted",
              },
        ],
      } as A2UIRowNode)
    }

    return {
      type: "card",
      id: `task-${task.id}`,
      hoverable: true,
      children: [
        {
          type: "column",
          gap: "0.75rem",
          children: [
            {
              type: "row",
              justify: "between",
              align: "start",
              wrap: true,
              gap: "0.5rem",
              children: [
                {
                  type: "column",
                  gap: "0.25rem",
                  style: { flex: 1, minWidth: "150px" },
                  children: contentChildren,
                },
                {
                  type: "badge",
                  text: t(`status.${task.status}`),
                  color: statusColors[task.status] || "default",
                },
              ],
            } as A2UIRowNode,
            {
              type: "row",
              justify: "between",
              align: "center",
              wrap: true,
              gap: "0.5rem",
              children: [
                {
                  type: "text",
                  text: `${t("tasks.created")}: ${new Date(task.createdAt).toLocaleString()}`,
                  variant: "caption",
                  color: "muted",
                },
                { type: "row", gap: "0.5rem", children: actions } as A2UIRowNode,
              ],
            } as A2UIRowNode,
          ],
        },
      ],
    }
  }

  // Build task list content
  const getTaskListContent = (): A2UINode => {
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
      return {
        type: "card",
        hoverable: false,
        style: { padding: "2rem", textAlign: "center" },
        children: [{ type: "text", text: t("tasks.noTasks"), color: "muted" }],
      }
    }

    return {
      type: "column",
      gap: "1rem",
      children: tasks.map((task) => buildTaskCard(task as TaskWithMaterial)),
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
          setArticleViewerState({ isOpen: false, markdown: "", title: "" })
          break
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
    ]
  )

  const createTaskInitialData = useMemo(
    () => regenerateData ?? undefined,
    [regenerateData]
  )

  const isRegenerate = regenerateData !== null

  if (!mounted) return null

  const contentNode: A2UIColumnNode = {
    type: "column",
    gap: "1rem",
    children: [headerNode, getTaskListContent()],
  }

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
    {
      type: "article-viewer-modal",
      open: articleViewerState.isOpen,
      markdown: articleViewerState.markdown,
      title: articleViewerState.title,
      onClose: { action: "closeArticleViewer" },
    },
  ]

  return <A2UIRenderer node={[appShellNode, ...modalNodes]} onAction={handleA2UIAction} />
}
