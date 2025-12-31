"use client"

import type { A2UIBaseNode } from "@/lib/a2ui"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"
import { dispatchA2UIAction } from "@/lib/a2ui/registry"

export interface A2UITaskStatusCardNode extends A2UIBaseNode {
  type: "task-status-card"
  taskId: string
  title: string
  description?: string
  status: "pending" | "processing" | "completed" | "failed" | "cancelled"
  progress?: number
  createdAt: string
  showActions?: boolean
}

export function A2UITaskStatusCard({
  node,
  onAction,
}: A2UIComponentProps<A2UITaskStatusCardNode>) {
  const statusColors = {
    pending: "bg-muted text-muted-foreground",
    processing: "bg-accent/10 text-accent-foreground",
    completed: "bg-success/10 text-success",
    failed: "bg-destructive/10 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  }

  const statusLabels = {
    pending: "Pending",
    processing: "Processing",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
  }

  return (
    <div
      className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-card/80"
      style={node.style}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-foreground">{node.title}</h3>
          {node.description && (
            <p className="mt-1 text-sm text-muted-foreground">{node.description}</p>
          )}
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[node.status]}`}
        >
          {node.status === "processing" && (
            <span className="mr-1.5 inline-block h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
          )}
          {statusLabels[node.status]}
        </span>
      </div>

      {node.progress !== undefined && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${node.progress}%` }}
          />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Created: {new Date(node.createdAt).toLocaleString()}
        </span>

        {node.showActions && (
          <div className="flex gap-2">
            {(node.status === "completed" || node.status === "failed" || node.status === "cancelled") && (
              <button
                onClick={() => dispatchA2UIAction(onAction, { action: "retry", args: [node.taskId] })}
                className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
              >
                Retry
              </button>
            )}
            {(node.status === "pending" || node.status === "processing") && (
              <button
                onClick={() => dispatchA2UIAction(onAction, { action: "cancel", args: [node.taskId] })}
                className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => dispatchA2UIAction(onAction, { action: "delete", args: [node.taskId] })}
              className="rounded-md bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
