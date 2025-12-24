// Task to A2UI Node Transformer
// Converts task data into A2UI declarative JSON format

import type { A2UINode, A2UICardNode, A2UIColumnNode, A2UIRowNode } from "./generated/types"

export interface TaskData {
  id: string
  topic: string | null
  keywords: string | null
  status: string
  createdAt: Date
}

export interface TaskTransformOptions {
  canRetry: (status: string) => boolean
  canStop: (status: string) => boolean
  labels: {
    untitledTask: string
    noKeywords: string
    created: string
    retry: string
    stop: string
    delete: string
  }
  statusLabels: Record<string, string>
}

export function transformTaskToA2UI(
  task: TaskData,
  options: TaskTransformOptions
): A2UICardNode {
  const { canRetry, canStop, labels, statusLabels } = options

  const actionButtons: A2UINode[] = []

  if (canRetry(task.status)) {
    actionButtons.push({
      type: "button",
      id: `retry-${task.id}`,
      text: labels.retry,
      variant: "secondary",
      size: "sm",
      onClick: {
        action: "regenerate",
        args: [task.id],
      },
    })
  }

  if (canStop(task.status)) {
    actionButtons.push({
      type: "button",
      id: `stop-${task.id}`,
      text: labels.stop,
      variant: "secondary",
      size: "sm",
      onClick: {
        action: "stop",
        args: [task.id],
      },
    })
  }

  actionButtons.push({
    type: "button",
    id: `delete-${task.id}`,
    text: labels.delete,
    variant: "destructive",
    size: "sm",
    onClick: {
      action: "delete",
      args: [task.id],
    },
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
          // Header row with title and status
          {
            type: "row",
            justify: "between",
            align: "start",
            children: [
              {
                type: "column",
                gap: "0.25rem",
                style: { flex: 1 },
                children: [
                  {
                    type: "text",
                    text: task.topic || labels.untitledTask,
                    variant: "h4",
                  },
                  {
                    type: "text",
                    text: task.keywords || labels.noKeywords,
                    variant: "body",
                    color: "muted",
                  },
                ],
              },
              {
                type: "badge",
                id: `status-${task.id}`,
                text: statusLabels[task.status] || task.status,
                color: task.status as "pending" | "processing" | "completed" | "failed" | "cancelled",
              },
            ],
          } as A2UIRowNode,
          // Footer row with date and actions
          {
            type: "row",
            justify: "between",
            align: "center",
            children: [
              {
                type: "text",
                text: `${labels.created}: ${new Date(task.createdAt).toLocaleString()}`,
                variant: "caption",
                color: "muted",
              },
              {
                type: "row",
                gap: "0.5rem",
                children: actionButtons,
              } as A2UIRowNode,
            ],
          } as A2UIRowNode,
        ],
      } as A2UIColumnNode,
    ],
  }
}

export function transformTaskListToA2UI(
  tasks: TaskData[],
  options: TaskTransformOptions
): A2UIColumnNode {
  return {
    type: "column",
    gap: "1rem",
    children: tasks.map((task) => transformTaskToA2UI(task, options)),
  }
}

export function createEmptyStateA2UI(message: string): A2UICardNode {
  return {
    type: "card",
    hoverable: false,
    style: { padding: "2rem", textAlign: "center" },
    children: [
      {
        type: "text",
        text: message,
        color: "muted",
      },
    ],
  }
}

export function createLoadingStateA2UI(message: string): A2UINode {
  return {
    type: "row",
    justify: "center",
    children: [
      {
        type: "text",
        text: message,
        color: "muted",
      },
    ],
  }
}
