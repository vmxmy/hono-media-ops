"use client"

import type { A2UIBaseNode } from "@/lib/a2ui"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"

export interface A2UIEmptyStateNode extends A2UIBaseNode {
  type: "empty-state"
  title: string
  description?: string
  icon?: string
  actionLabel?: string
  onAction?: { action: string; args?: unknown[] }
}

export function A2UIEmptyState({
  node,
  onAction,
}: A2UIComponentProps<A2UIEmptyStateNode>) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-8 text-center"
      style={node.style}
    >
      {node.icon && (
        <span className="mb-4 text-4xl text-muted-foreground">{node.icon}</span>
      )}
      <h3 className="text-lg font-semibold text-foreground">{node.title}</h3>
      {node.description && (
        <p className="mt-2 text-sm text-muted-foreground">{node.description}</p>
      )}
      {node.actionLabel && node.onAction && (
        <button
          onClick={() => onAction(node.onAction!.action, node.onAction!.args)}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {node.actionLabel}
        </button>
      )}
    </div>
  )
}
