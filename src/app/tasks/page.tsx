"use client"

import { useState, useCallback } from "react"
import { api } from "@/trpc/react"
import { AppLayout } from "@/components/app-layout"
import { useI18n } from "@/contexts/i18n-context"
import { useAuth } from "@/hooks/use-auth"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UIColumnNode, A2UINode, A2UICardNode, A2UIRowNode } from "@/lib/a2ui"

// 延迟加载 CreateTaskModal
import dynamic from "next/dynamic"
const CreateTaskModal = dynamic(
  () => import("@/components/create-task-modal").then((mod) => mod.CreateTaskModal),
  { ssr: false }
)

export default function TasksPage() {
  const { t } = useI18n()
  const { mounted, logout } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)

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
      }
    },
    [t, cancelMutation, retryMutation, deleteMutation]
  )

  // 构建任务卡片
  const buildTaskCard = (task: typeof tasks[0]): A2UICardNode => {
    const statusColors: Record<string, string> = {
      pending: "default",
      processing: "processing",
      completed: "completed",
      failed: "failed",
      cancelled: "cancelled",
    }

    const canStop = task.status === "pending" || task.status === "processing"
    const canRetry = task.status === "failed" || task.status === "cancelled"

    const actions: A2UINode[] = []
    if (canRetry) {
      actions.push({
        type: "button",
        text: t("task.retry"),
        variant: "primary",
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
                  children: [
                    { type: "text", text: task.topic || t("tasks.untitledTask"), variant: "h4" },
                    { type: "text", text: task.keywords || t("tasks.noKeywords"), variant: "body", color: "muted" },
                  ],
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

  // 构建页面内容
  const getContent = (): A2UINode => {
    if (error) {
      return {
        type: "card",
        hoverable: false,
        style: { padding: "2rem", textAlign: "center" },
        children: [
          { type: "text", text: `错误: ${error.message}`, color: "muted" },
        ],
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
      children: tasks.map(buildTaskCard),
    }
  }

  const pageNode: A2UIColumnNode = {
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
      getContent(),
    ],
  }

  if (!mounted) return null

  return (
    <AppLayout onLogout={logout}>
      <A2UIRenderer node={pageNode} onAction={handleA2UIAction} />
      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => refetch()}
      />
    </AppLayout>
  )
}
