"use client"

import { useState, useCallback } from "react"
import { api } from "@/trpc/react"
import { AppLayout } from "@/components/app-layout"
import { CreateTaskModal } from "@/components/create-task-modal"
import { useI18n } from "@/contexts/i18n-context"
import { useAuth } from "@/hooks/use-auth"
import { useTaskPolling } from "@/hooks/use-task-polling"
import { A2UIRenderer } from "@/components/a2ui"
import {
  transformTaskListToA2UI,
  createEmptyStateA2UI,
  createLoadingStateA2UI,
  type TaskData,
  type A2UIColumnNode,
  type A2UINode,
} from "@/lib/a2ui"

export default function TasksPage() {
  const { t } = useI18n()
  const { mounted, logout } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [regenerateData, setRegenerateData] = useState<{
    topic?: string
    keywords?: string
    style?: string
    openingExample?: string
    structureGuide?: string
    outputSchema?: string
    coverPrompt?: string
    coverRatio?: string
    coverResolution?: string
    coverModel?: string
    coverMode?: string
    coverNegativePrompt?: string
  } | undefined>(undefined)
  const [isRegenerate, setIsRegenerate] = useState(false)

  const utils = api.useUtils()

  // 使用智能轮询 - 有 processing 任务时每 3 秒刷新，否则停止
  const {
    data,
    isLoading,
    isPolling,
    processingCount,
    invalidate,
  } = useTaskPolling({
    pollingInterval: 3000,
    page: 1,
    pageSize: 20,
    enabled: mounted,
  })
  const tasks = data?.tasks

  const cancelMutation = api.tasks.cancel.useMutation({
    onSuccess: () => invalidate(),
  })

  const deleteMutation = api.tasks.delete.useMutation({
    onSuccess: () => invalidate(),
  })

  const handleNewTask = () => {
    setRegenerateData(undefined)
    setIsRegenerate(false)
    setIsModalOpen(true)
  }

  const findTaskById = (id: string) => {
    return tasks?.find((task) => task.id === id)
  }

  const handleRegenerate = (taskId: string) => {
    const task = findTaskById(taskId)
    if (!task) return

    // Extract from JSONB configs
    const articleConfig = task.articleConfig as Record<string, string> | null
    const coverConfig = task.coverConfig as Record<string, string> | null

    setRegenerateData({
      topic: task.topic ?? "",
      keywords: task.keywords ?? "",
      style: articleConfig?.style ?? "",
      openingExample: articleConfig?.openingExample ?? "",
      structureGuide: articleConfig?.structureGuide ?? "",
      outputSchema: articleConfig?.outputSchema ?? "",
      coverPrompt: coverConfig?.prompt ?? "",
      coverRatio: coverConfig?.ratio ?? "16:9",
      coverResolution: coverConfig?.resolution ?? "1k",
      coverModel: coverConfig?.model ?? "jimeng-4.5",
      coverMode: coverConfig?.mode ?? "text2img",
      coverNegativePrompt: coverConfig?.negativePrompt ?? "模糊, 变形, 低质量, 水印, 文字",
    })
    setIsRegenerate(true)
    setIsModalOpen(true)
  }

  const handleStop = (id: string) => {
    if (confirm(t("task.stopConfirm"))) {
      cancelMutation.mutate({ id })
    }
  }

  const handleDelete = (id: string) => {
    if (confirm(t("task.deleteConfirm"))) {
      deleteMutation.mutate({ id })
    }
  }

  const canRetry = (status: string) => {
    return status === "completed" || status === "failed" || status === "cancelled"
  }

  const canStop = (status: string) => {
    return status === "pending" || status === "processing"
  }

  // A2UI action handler
  const handleA2UIAction = useCallback(
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "newTask":
          handleNewTask()
          break
        case "regenerate":
          handleRegenerate(args?.[0] as string)
          break
        case "stop":
          handleStop(args?.[0] as string)
          break
        case "delete":
          handleDelete(args?.[0] as string)
          break
      }
    },
    [tasks]
  )

  // Transform options for A2UI
  const transformOptions = {
    canRetry,
    canStop,
    labels: {
      untitledTask: t("tasks.untitledTask"),
      noKeywords: t("tasks.noKeywords"),
      created: t("tasks.created"),
      retry: t("task.retry"),
      stop: t("task.stop"),
      delete: t("common.delete"),
    },
    statusLabels: {
      pending: t("status.pending"),
      processing: t("status.processing"),
      completed: t("status.completed"),
      failed: t("status.failed"),
      cancelled: t("status.cancelled"),
    },
  }

  // Generate A2UI nodes based on state
  const getTaskListNode = () => {
    if (isLoading) {
      return createLoadingStateA2UI(t("common.loading"))
    }

    if (!tasks || tasks.length === 0) {
      return createEmptyStateA2UI(t("tasks.noTasks"))
    }

    const taskData: TaskData[] = tasks.map((task) => ({
      id: task.id,
      topic: task.topic,
      keywords: task.keywords,
      status: task.status,
      createdAt: task.createdAt,
    }))

    return transformTaskListToA2UI(taskData, transformOptions)
  }

  // Generate full tasks page A2UI
  const getTasksPageNode = (): A2UIColumnNode => {
    const headerNode: A2UINode = {
      type: "row",
      justify: "between",
      align: "center",
      wrap: true,
      gap: "0.75rem",
      style: { marginBottom: "1rem" },
      children: [
        { type: "text", text: t("tasks.title"), variant: "h2", weight: "bold" },
        {
          type: "button",
          text: "✏️",
          variant: "primary",
          size: "md",
          onClick: { action: "newTask" },
          style: { width: "40px", height: "40px", padding: 0, fontSize: "1.25rem" },
        },
      ],
    }

    return {
      type: "column",
      gap: "0",
      children: [headerNode, getTaskListNode()],
    }
  }

  if (!mounted) return null

  return (
    <AppLayout onLogout={logout}>
      {/* 轮询状态指示器 */}
      {isPolling && processingCount > 0 && (
        <div className="-mx-6 -mt-6 mb-6 border-b border-border bg-muted/50">
          <div className="flex items-center gap-2 px-6 py-2 text-sm text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span>
              {t("tasks.polling", { count: processingCount })}
            </span>
          </div>
        </div>
      )}

      <A2UIRenderer node={getTasksPageNode()} onAction={handleA2UIAction} />

      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => invalidate()}
        initialData={regenerateData}
        isRegenerate={isRegenerate}
      />
    </AppLayout>
  )
}
