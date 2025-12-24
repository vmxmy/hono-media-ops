"use client"

/**
 * Custom A2UI Components Example
 *
 * This file demonstrates how to create and register custom A2UI components.
 * Custom components extend the standard catalog with domain-specific UI elements.
 *
 * Usage:
 * 1. Define your custom node type in types
 * 2. Create the React component
 * 3. Register it with the registry
 */

import type { A2UIBaseNode } from "@/lib/a2ui"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"

// Extend the base node type for custom components
interface CustomA2UINode extends A2UIBaseNode {
  type: string
}

// ============================================================================
// Custom Type Definitions
// ============================================================================

/**
 * Task Status Card - A domain-specific component for displaying task status
 */
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

/**
 * Stat Card - Display a metric with label
 */
export interface A2UIStatCardNode extends A2UIBaseNode {
  type: "stat-card"
  label: string
  value: string | number
  change?: {
    value: number
    direction: "up" | "down"
  }
  icon?: string
}

/**
 * Empty State - Placeholder for empty content
 */
export interface A2UIEmptyStateNode extends A2UIBaseNode {
  type: "empty-state"
  title: string
  description?: string
  icon?: string
  actionLabel?: string
  onAction?: { action: string; args?: unknown[] }
}

// ============================================================================
// Custom Component Implementations
// ============================================================================

/**
 * Task Status Card Component
 */
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
                onClick={() => onAction("retry", [node.taskId])}
                className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
              >
                Retry
              </button>
            )}
            {(node.status === "pending" || node.status === "processing") && (
              <button
                onClick={() => onAction("cancel", [node.taskId])}
                className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => onAction("delete", [node.taskId])}
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

/**
 * Stat Card Component
 */
export function A2UIStatCard({ node }: A2UIComponentProps<A2UIStatCardNode>) {
  return (
    <div
      className="rounded-lg border border-border bg-card p-4"
      style={node.style}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {node.label}
        </span>
        {node.icon && (
          <span className="text-lg text-muted-foreground">{node.icon}</span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-foreground">{node.value}</span>
        {node.change && (
          <span
            className={`text-sm font-medium ${
              node.change.direction === "up" ? "text-success" : "text-destructive"
            }`}
          >
            {node.change.direction === "up" ? "↑" : "↓"} {Math.abs(node.change.value)}%
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Empty State Component
 */
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

// ============================================================================
// Registration Helper
// ============================================================================

import { type A2UIRegistry } from "@/lib/a2ui/registry"
import { type A2UIComponentDefinition } from "@/lib/a2ui/catalog"

/**
 * Custom component definitions for catalog
 */
export const CUSTOM_COMPONENT_DEFINITIONS: A2UIComponentDefinition[] = [
  {
    type: "task-status-card",
    description: "Task status display card with actions",
    category: "custom",
    properties: {
      taskId: { type: "string", required: true },
      title: { type: "string", required: true },
      description: { type: "string" },
      status: { type: "string", required: true, enum: ["pending", "processing", "completed", "failed", "cancelled"] },
      progress: { type: "number" },
      createdAt: { type: "string", required: true },
      showActions: { type: "boolean", default: false },
    },
  },
  {
    type: "stat-card",
    description: "Metric display card with change indicator",
    category: "custom",
    properties: {
      label: { type: "string", required: true },
      value: { type: "string", required: true },
      change: { type: "object" },
      icon: { type: "string" },
    },
  },
  {
    type: "empty-state",
    description: "Empty state placeholder with optional action",
    category: "custom",
    properties: {
      title: { type: "string", required: true },
      description: { type: "string" },
      icon: { type: "string" },
      actionLabel: { type: "string" },
      onAction: { type: "action" },
    },
  },
]

/**
 * Register all custom components to a registry
 */
export function registerCustomComponents(registry: A2UIRegistry): void {
  registry.register("task-status-card", A2UITaskStatusCard, { source: "custom", priority: 10 })
  registry.register("stat-card", A2UIStatCard, { source: "custom", priority: 10 })
  registry.register("empty-state", A2UIEmptyState, { source: "custom", priority: 10 })
}
