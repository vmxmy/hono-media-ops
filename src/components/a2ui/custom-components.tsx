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

import { useCallback, useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type {
  A2UIBaseNode,
  A2UIAction,
  A2UINode,
  A2UIAppShellNode,
  A2UIThemeSwitcherNode,
  A2UIMaterialsTableNode,
  A2UIArticleViewerModalNode,
  A2UICreateTaskModalNode,
  A2UIReverseSubmitModalNode,
  A2UIMarkdownNode,
} from "@/lib/a2ui"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { MaterialsTable, type StyleAnalysis } from "@/components/materials-table"
import { ArticleViewerModal } from "@/components/article-viewer-modal"
import { CreateTaskModal } from "@/components/create-task-modal"
import { ReverseSubmitModal } from "@/components/reverse-submit-modal"
import { A2UIToaster } from "./toaster"

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
// App Shell & Utility Components
// ============================================================================

function dispatchAction(
  onAction: A2UIComponentProps<A2UIBaseNode>["onAction"],
  action?: A2UIAction,
  extraArgs?: unknown[]
) {
  if (!action) return
  const args = extraArgs ? [...extraArgs, ...(action.args ?? [])] : action.args
  onAction(action.action, args)
}

export function A2UIThemeSwitcher({
  node,
}: A2UIComponentProps<A2UIThemeSwitcherNode>) {
  return (
    <div style={node.style}>
      <ThemeSwitcher />
    </div>
  )
}

// Nav item icons
const NavIcons: Record<string, React.ReactNode> = {
  tasks: (
    <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  ),
  reverse: (
    <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  ),
  insights: (
    <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  prompts: (
    <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
}

export function A2UIAppShell({
  node,
  onAction,
  renderChildren,
}: A2UIComponentProps<A2UIAppShellNode>) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved !== null) {
      setIsCollapsed(saved === "true")
    }
  }, [])

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newValue = !isCollapsed
    setIsCollapsed(newValue)
    localStorage.setItem("sidebar-collapsed", String(newValue))
  }

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [node.activePath])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleNavigate = useCallback(
    (path: string) => {
      dispatchAction(onAction, node.onNavigate, [path])
      setIsMobileMenuOpen(false)
    },
    [node.onNavigate, onAction]
  )

  const handleLogout = useCallback(() => {
    dispatchAction(onAction, node.onLogout)
  }, [node.onLogout, onAction])

  const headerActions = node.headerActions as A2UINode[] | undefined

  return (
    <div className="flex h-screen overflow-hidden bg-background" style={node.style}>
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen border-r border-border bg-card transition-all duration-200 ease-in-out md:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"
        } ${isCollapsed ? "md:w-16" : "md:w-56"}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center justify-between border-b border-border px-3">
            {node.logoSrc ? (
              isCollapsed ? (
                <img src={node.logoSrc} alt={node.logoAlt ?? node.brand ?? ""} className="mx-auto h-8 w-8 object-contain" />
              ) : (
                <img src={node.logoSrc} alt={node.logoAlt ?? node.brand ?? ""} className="h-8 w-auto" />
              )
            ) : (
              !isCollapsed && <span className="text-lg font-semibold text-foreground">{node.brand}</span>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent md:hidden"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 space-y-1 p-2">
            {node.navItems.map((item) => {
              const isActive = node.activePath === item.path
              const icon = NavIcons[item.key]
              // On mobile (when menu is open), always show labels
              // On desktop, respect the isCollapsed state
              const showLabel = isMobileMenuOpen || !isCollapsed
              return (
                <button
                  key={item.key}
                  onClick={() => handleNavigate(item.path)}
                  title={!showLabel ? item.label : undefined}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  } ${!showLabel ? "justify-center px-2 md:justify-center md:px-2" : ""}`}
                >
                  {icon}
                  {showLabel && <span>{item.label}</span>}
                </button>
              )
            })}
          </nav>

          {/* Collapse toggle button (desktop only) */}
          <div className="hidden border-t border-border p-2 md:block">
            <button
              onClick={toggleCollapsed}
              className="flex w-full items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              title={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
            >
              <svg
                className={`h-5 w-5 transition-transform ${isCollapsed ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {node.onLogout && (
            <div className="border-t border-border p-3 md:hidden">
              <button
                onClick={handleLogout}
                className="flex w-full items-center rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {node.logoutLabel ?? "退出"}
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden transition-all duration-200 ${isCollapsed ? "md:ml-16" : "md:ml-56"}`}>
        <header className="z-30 flex h-14 flex-shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 md:justify-end md:px-6">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent md:hidden"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-4">
            {headerActions && renderChildren?.(headerActions)}
            {node.onLogout && (
              <button
                onClick={handleLogout}
                className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:block"
              >
                {node.logoutLabel ?? "退出"}
              </button>
            )}
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
          {node.children && renderChildren?.(node.children)}
        </main>
      </div>

      <A2UIToaster />
    </div>
  )
}

export function A2UIMaterialsTable({
  node,
  onAction,
}: A2UIComponentProps<A2UIMaterialsTableNode>) {
  const data = (node.data ?? []) as StyleAnalysis[]

  return (
    <MaterialsTable
      data={data}
      onClone={(id) => dispatchAction(onAction, node.onClone, [id])}
      onDelete={(id) => dispatchAction(onAction, node.onDelete, [id])}
      onViewDetail={(analysis) => dispatchAction(onAction, node.onViewDetail, [analysis.id])}
    />
  )
}

export function A2UIArticleViewerModal({
  node,
  onAction,
}: A2UIComponentProps<A2UIArticleViewerModalNode>) {
  if (!node.open) return null

  return (
    <ArticleViewerModal
      isOpen={node.open}
      onClose={() => dispatchAction(onAction, node.onClose)}
      markdown={node.markdown}
      title={node.title}
    />
  )
}

export function A2UICreateTaskModal({
  node,
  onAction,
}: A2UIComponentProps<A2UICreateTaskModalNode>) {
  if (!node.open) return null

  return (
    <CreateTaskModal
      isOpen={node.open}
      onClose={() => dispatchAction(onAction, node.onClose)}
      onSuccess={() => dispatchAction(onAction, node.onSuccess)}
      initialData={node.initialData as Record<string, string | undefined> | undefined}
      isRegenerate={node.isRegenerate}
    />
  )
}

export function A2UIReverseSubmitModal({
  node,
  onAction,
}: A2UIComponentProps<A2UIReverseSubmitModalNode>) {
  if (!node.open) return null

  return (
    <ReverseSubmitModal
      isOpen={node.open}
      onClose={() => dispatchAction(onAction, node.onClose)}
      onSuccess={() => dispatchAction(onAction, node.onSuccess)}
    />
  )
}

export function A2UIMarkdown({ node }: A2UIComponentProps<A2UIMarkdownNode>) {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none" style={node.style}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {node.content}
      </ReactMarkdown>
    </article>
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
  registry.register("app-shell", A2UIAppShell, { source: "custom", priority: 10 })
  registry.register("theme-switcher", A2UIThemeSwitcher, { source: "custom", priority: 10 })
  registry.register("materials-table", A2UIMaterialsTable, { source: "custom", priority: 10 })
  registry.register("article-viewer-modal", A2UIArticleViewerModal, { source: "custom", priority: 10 })
  registry.register("create-task-modal", A2UICreateTaskModal, { source: "custom", priority: 10 })
  registry.register("reverse-submit-modal", A2UIReverseSubmitModal, { source: "custom", priority: 10 })
  registry.register("markdown", A2UIMarkdown, { source: "custom", priority: 10 })
}
