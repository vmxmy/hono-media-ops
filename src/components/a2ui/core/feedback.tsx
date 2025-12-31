"use client"

import type {
  A2UIBadgeNode,
  A2UIProgressNode,
  A2UIModalNode,
  A2UIAlertNode,
} from "@/lib/a2ui"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"

export function A2UIBadge({ node }: A2UIComponentProps<A2UIBadgeNode>) {
  const colorClasses = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-accent/10 text-accent-foreground",
    pending: "bg-muted text-muted-foreground",
    processing: "bg-accent/10 text-accent-foreground",
    completed: "bg-success/10 text-success",
    failed: "bg-destructive/10 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        colorClasses[node.color ?? "default"]
      }`}
      style={node.style}
    >
      {node.text}
    </span>
  )
}

export function A2UIProgress({ node }: A2UIComponentProps<A2UIProgressNode>) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-muted" style={node.style}>
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${node.value}%` }}
      />
    </div>
  )
}

export function A2UIModal({ node, onAction, renderChildren }: A2UIComponentProps<A2UIModalNode>) {
  if (!node.open) return null

  const handleClose = () => {
    if (node.onClose) {
      onAction(node.onClose.action, node.onClose.args)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="h-full w-full overflow-auto border-border bg-card shadow-xl md:h-auto md:max-h-[90vh] md:max-w-lg md:rounded-lg md:border"
        style={node.style}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-foreground">{node.title}</h2>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          >
            ✕
          </button>
        </div>
        <div className="px-4 py-4">
          {node.children && renderChildren?.(node.children)}
        </div>
      </div>
    </div>
  )
}

export function A2UIAlert({ node }: A2UIComponentProps<A2UIAlertNode>) {
  const variantClasses = {
    default: "bg-muted text-muted-foreground",
    error: "bg-destructive/10 text-destructive",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
    info: "bg-accent/10 text-accent-foreground",
  }

  return (
    <div
      className={`rounded-md px-4 py-3 text-sm ${variantClasses[node.variant ?? "default"]}`}
      style={node.style}
    >
      <p>{node.message}</p>
    </div>
  )
}

export function A2UIFallback({ node }: A2UIComponentProps) {
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
      未知组件类型: <code>{(node as { type?: string }).type ?? "unknown"}</code>
    </div>
  )
}
