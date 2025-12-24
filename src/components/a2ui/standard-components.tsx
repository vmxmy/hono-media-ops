"use client"

import { useState, type CSSProperties } from "react"
import type {
  A2UIColumnNode,
  A2UIRowNode,
  A2UIContainerNode,
  A2UICardNode,
  A2UITextNode,
  A2UIButtonNode,
  A2UIBadgeNode,
  A2UIProgressNode,
  A2UICheckboxNode,
  A2UITabsNode,
  A2UIInputNode,
  A2UITextareaNode,
  A2UISelectNode,
  A2UIDividerNode,
  A2UIImageNode,
  A2UIIconNode,
  A2UIModalNode,
  A2UIPageNode,
  A2UINavNode,
  A2UINavLinkNode,
  A2UIFormNode,
  A2UIFormFieldNode,
  A2UIAlertNode,
  A2UILinkNode,
  A2UISpacerNode,
} from "@/lib/a2ui"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"

// ============================================================================
// Layout Components
// ============================================================================

export function A2UIColumn({ node, renderChildren }: A2UIComponentProps<A2UIColumnNode>) {
  const style: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: node.gap ?? "0.5rem",
    ...node.style,
  }

  return (
    <div style={style}>
      {node.children && renderChildren?.(node.children)}
    </div>
  )
}

export function A2UIRow({ node, renderChildren }: A2UIComponentProps<A2UIRowNode>) {
  const alignMap = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
    stretch: "stretch",
  }

  const justifyMap = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
    between: "space-between",
    around: "space-around",
  }

  const style: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    gap: node.gap ?? "0.5rem",
    alignItems: node.align ? alignMap[node.align] : undefined,
    justifyContent: node.justify ? justifyMap[node.justify] : undefined,
    ...node.style,
  }

  return (
    <div style={style}>
      {node.children && renderChildren?.(node.children)}
    </div>
  )
}

export function A2UIContainer({ node, renderChildren }: A2UIComponentProps<A2UIContainerNode>) {
  return (
    <div style={node.style}>
      {node.children && renderChildren?.(node.children)}
    </div>
  )
}

export function A2UICard({ node, onAction, renderChildren }: A2UIComponentProps<A2UICardNode>) {
  const handleClick = node.onClick
    ? () => onAction(node.onClick!.action, node.onClick!.args)
    : undefined

  return (
    <div
      className={`rounded-lg border border-border bg-card p-4 shadow-sm transition-colors ${
        node.hoverable !== false ? "hover:bg-card/80" : ""
      } ${handleClick ? "cursor-pointer" : ""}`}
      style={node.style}
      onClick={handleClick}
    >
      {node.children && renderChildren?.(node.children)}
    </div>
  )
}

// ============================================================================
// Content Components
// ============================================================================

export function A2UIText({ node }: A2UIComponentProps<A2UITextNode>) {
  const variantClasses = {
    h1: "text-3xl font-bold",
    h2: "text-2xl font-bold",
    h3: "text-lg font-semibold",
    h4: "text-base font-semibold",
    body: "text-sm",
    caption: "text-xs",
    label: "text-sm font-medium",
  }

  const colorClasses = {
    foreground: "text-foreground",
    muted: "text-muted-foreground",
    primary: "text-primary",
    destructive: "text-destructive",
    success: "text-success",
  }

  const weightClasses = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  }

  const className = [
    variantClasses[node.variant ?? "body"],
    colorClasses[node.color ?? "foreground"],
    node.weight ? weightClasses[node.weight] : "",
  ]
    .filter(Boolean)
    .join(" ")

  const Tag =
    node.variant === "h1"
      ? "h1"
      : node.variant === "h2"
        ? "h2"
        : node.variant === "h3"
          ? "h3"
          : node.variant === "h4"
            ? "h4"
            : "span"

  return (
    <Tag className={className} style={node.style}>
      {node.text}
    </Tag>
  )
}

export function A2UIImage({ node }: A2UIComponentProps<A2UIImageNode>) {
  return (
    <img
      src={node.src}
      alt={node.alt ?? ""}
      style={{ width: node.width, height: node.height, ...node.style }}
      className="rounded-md"
    />
  )
}

export function A2UIIcon({ node }: A2UIComponentProps<A2UIIconNode>) {
  // Simple icon implementation using emoji or text
  // Can be extended to use icon libraries like lucide-react
  return (
    <span
      style={{
        fontSize: node.size ?? 16,
        color: node.color,
        ...node.style,
      }}
      className="inline-flex items-center justify-center"
    >
      {node.name}
    </span>
  )
}

export function A2UIDivider({ node }: A2UIComponentProps<A2UIDividerNode>) {
  const isVertical = node.orientation === "vertical"

  return (
    <div
      className={isVertical ? "border-l border-border mx-2 h-full" : "border-t border-border my-2"}
      style={node.style}
    />
  )
}

// ============================================================================
// Interactive Components
// ============================================================================

export function A2UIButton({ node, onAction }: A2UIComponentProps<A2UIButtonNode>) {
  const handleClick = (e: React.MouseEvent) => {
    if (node.onClick?.stopPropagation) {
      e.stopPropagation()
    }
    if (node.onClick) {
      onAction(node.onClick.action, node.onClick.args)
    }
  }

  const variantClasses = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    text: "text-primary hover:underline",
  }

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  }

  const variant = node.variant ?? "primary"
  const size = node.size ?? "md"

  return (
    <button
      onClick={handleClick}
      disabled={node.disabled}
      className={`rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]}`}
      style={node.style}
    >
      {node.text}
    </button>
  )
}

export function A2UIInput({ node, onAction }: A2UIComponentProps<A2UIInputNode>) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (node.onChange) {
      onAction(node.onChange.action, [e.target.value, ...(node.onChange.args ?? [])])
    }
  }

  return (
    <input
      type={node.inputType ?? "text"}
      value={node.value ?? ""}
      onChange={handleChange}
      placeholder={node.placeholder}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      style={node.style}
    />
  )
}

export function A2UITextarea({ node, onAction }: A2UIComponentProps<A2UITextareaNode>) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (node.onChange) {
      onAction(node.onChange.action, [e.target.value, ...(node.onChange.args ?? [])])
    }
  }

  return (
    <textarea
      value={node.value ?? ""}
      onChange={handleChange}
      placeholder={node.placeholder}
      rows={node.rows ?? 4}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      style={node.style}
    />
  )
}

export function A2UISelect({ node, onAction }: A2UIComponentProps<A2UISelectNode>) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (node.onChange) {
      onAction(node.onChange.action, [e.target.value, ...(node.onChange.args ?? [])])
    }
  }

  return (
    <select
      value={node.value ?? ""}
      onChange={handleChange}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      style={node.style}
    >
      {node.options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

export function A2UICheckbox({ node, onAction }: A2UIComponentProps<A2UICheckboxNode>) {
  const handleChange = () => {
    if (node.onChange) {
      onAction(node.onChange.action, [!node.checked, node.taskId, ...(node.onChange.args ?? [])])
    }
  }

  return (
    <input
      type="checkbox"
      checked={node.checked ?? false}
      onChange={handleChange}
      className="h-4 w-4 cursor-pointer rounded border-border"
      style={node.style}
    />
  )
}

export function A2UITabs({ node, renderChildren }: A2UIComponentProps<A2UITabsNode>) {
  const [activeTab, setActiveTab] = useState(node.defaultTab ?? 0)

  return (
    <div style={node.style}>
      <div className="flex border-b border-border">
        {node.tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === index
                ? "border-b-2 border-primary font-semibold text-foreground"
                : "border-b-2 border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="py-4">
        {node.tabs[activeTab]?.content && renderChildren?.(node.tabs[activeTab].content!)}
      </div>
    </div>
  )
}

// ============================================================================
// Feedback Components
// ============================================================================

export function A2UIBadge({ node }: A2UIComponentProps<A2UIBadgeNode>) {
  const colorClasses: Record<string, string> = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    completed: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    failed: "bg-destructive/10 text-destructive",
    info: "bg-accent/10 text-accent-foreground",
    processing: "bg-accent/10 text-accent-foreground",
    pending: "bg-muted text-muted-foreground",
    cancelled: "bg-muted text-muted-foreground",
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClasses[node.color ?? "default"]}`}
      style={node.style}
    >
      {node.color === "processing" && (
        <span className="inline-block h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
      )}
      {node.text}
    </span>
  )
}

export function A2UIProgress({ node }: A2UIComponentProps<A2UIProgressNode>) {
  const statusStyles: Record<string, { width: string; bg: string; animate?: boolean }> = {
    pending: { width: "10%", bg: "bg-muted-foreground/50", animate: true },
    processing: { width: "60%", bg: "bg-primary", animate: true },
    completed: { width: "100%", bg: "bg-success" },
    failed: { width: "100%", bg: "bg-destructive" },
    cancelled: { width: "50%", bg: "bg-muted-foreground" },
  }

  const status = statusStyles[node.status] ?? statusStyles.pending

  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-muted" style={node.style}>
      <div
        className={`h-full rounded-full transition-all ${status.bg} ${status.animate ? "animate-pulse" : ""}`}
        style={{ width: node.value ? `${node.value}%` : status.width }}
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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={handleBackdropClick}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg border border-border bg-card shadow-xl"
        style={node.style}
      >
        {node.title && (
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold">{node.title}</h2>
            <button
              onClick={handleClose}
              className="text-2xl text-muted-foreground hover:text-foreground"
            >
              &times;
            </button>
          </div>
        )}
        <div className="p-6">
          {node.children && renderChildren?.(node.children)}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Page & Navigation Components
// ============================================================================

export function A2UIPage({ node, renderChildren }: A2UIComponentProps<A2UIPageNode>) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-full",
  }

  const containerClass = node.centered
    ? "min-h-screen flex items-center justify-center bg-background"
    : "min-h-screen bg-background"

  const contentClass = `mx-auto px-4 py-8 ${maxWidthClasses[node.maxWidth ?? "xl"]}`

  return (
    <div className={containerClass} style={node.style}>
      <div className={node.centered ? "" : contentClass}>
        {node.title && (
          <h1 className="mb-6 text-2xl font-bold text-foreground">{node.title}</h1>
        )}
        {node.children && renderChildren?.(node.children)}
      </div>
    </div>
  )
}

export function A2UINav({ node, renderChildren }: A2UIComponentProps<A2UINavNode>) {
  return (
    <nav
      className="border-b border-border bg-card"
      style={node.style}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {node.brand && (
          <span className="text-lg font-semibold text-foreground">{node.brand}</span>
        )}
        <div className="flex items-center gap-4">
          {node.children && renderChildren?.(node.children)}
        </div>
      </div>
    </nav>
  )
}

export function A2UINavLink({ node, onAction }: A2UIComponentProps<A2UINavLinkNode>) {
  const handleClick = (e: React.MouseEvent) => {
    if (node.onClick) {
      e.preventDefault()
      onAction(node.onClick.action, node.onClick.args)
    }
  }

  const className = `text-sm font-medium transition-colors ${
    node.active
      ? "text-foreground"
      : "text-muted-foreground hover:text-foreground"
  }`

  if (node.href && !node.onClick) {
    return (
      <a href={node.href} className={className} style={node.style}>
        {node.text}
      </a>
    )
  }

  return (
    <button onClick={handleClick} className={className} style={node.style}>
      {node.text}
    </button>
  )
}

export function A2UISpacer({ node }: A2UIComponentProps<A2UISpacerNode>) {
  const style: CSSProperties = {
    ...(node.flex !== false ? { flex: 1 } : {}),
    ...(node.size ? { width: node.size, height: node.size, flex: "none" } : {}),
    ...node.style,
  }

  return <div style={style} />
}

// ============================================================================
// Form Components
// ============================================================================

export function A2UIForm({ node, onAction, renderChildren }: A2UIComponentProps<A2UIFormNode>) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (node.onSubmit) {
      onAction(node.onSubmit.action, node.onSubmit.args)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" style={node.style}>
      {node.children && renderChildren?.(node.children)}
    </form>
  )
}

export function A2UIFormField({ node, renderChildren }: A2UIComponentProps<A2UIFormFieldNode>) {
  return (
    <div style={node.style}>
      <label className="mb-2 block text-sm font-medium text-foreground">
        {node.label}
        {node.required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {node.children && renderChildren?.(node.children)}
      {node.error && (
        <p className="mt-1 text-sm text-destructive">{node.error}</p>
      )}
    </div>
  )
}

export function A2UIAlert({ node }: A2UIComponentProps<A2UIAlertNode>) {
  const variantClasses = {
    info: "bg-accent/10 text-accent-foreground border-accent/20",
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    error: "bg-destructive/10 text-destructive border-destructive/20",
  }

  return (
    <div
      className={`rounded-md border p-3 text-sm ${variantClasses[node.variant ?? "info"]}`}
      style={node.style}
    >
      {node.message}
    </div>
  )
}

export function A2UILink({ node, onAction }: A2UIComponentProps<A2UILinkNode>) {
  const handleClick = (e: React.MouseEvent) => {
    if (node.onClick) {
      e.preventDefault()
      onAction(node.onClick.action, node.onClick.args)
    }
  }

  const variantClasses = {
    default: "text-foreground hover:underline",
    muted: "text-muted-foreground hover:text-foreground",
    primary: "text-primary hover:underline",
  }

  const className = `text-sm ${variantClasses[node.variant ?? "primary"]}`

  if (node.href && !node.onClick) {
    return (
      <a href={node.href} className={className} style={node.style}>
        {node.text}
      </a>
    )
  }

  return (
    <button onClick={handleClick} className={className} style={node.style}>
      {node.text}
    </button>
  )
}

// ============================================================================
// Fallback Component
// ============================================================================

export function A2UIFallback({ node }: A2UIComponentProps) {
  if (process.env.NODE_ENV === "development") {
    console.warn("Unknown A2UI node type:", (node as { type: string }).type)
  }
  return null
}
