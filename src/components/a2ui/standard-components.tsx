"use client"

import { useState, useRef, useEffect, type CSSProperties } from "react"
import type {
  A2UINode,
  A2UIColumnNode,
  A2UIRowNode,
  A2UIContainerNode,
  A2UIScrollAreaNode,
  A2UICardNode,
  A2UITextNode,
  A2UIButtonNode,
  A2UIBadgeNode,
  A2UIProgressNode,
  A2UICheckboxNode,
  A2UITabsNode,
  A2UIInputNode,
  A2UIEditableTextNode,
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
  A2UICollapsibleNode,
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
    flexWrap: node.wrap ? "wrap" : undefined,
    ...node.style,
  }

  // Use CSS classes for responsive behavior
  const className = node.responsive
    ? "a2ui-row-responsive"
    : ""

  return (
    <div style={style} className={className}>
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

export function A2UIScrollArea({ node, renderChildren }: A2UIComponentProps<A2UIScrollAreaNode>) {
  const orientation = node.orientation ?? "vertical"
  const overflowStyle: CSSProperties = {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    overflowY: orientation === "horizontal" ? "hidden" : "auto",
    overflowX: orientation === "vertical" ? "hidden" : "auto",
    ...node.style,
  }

  return (
    <div className="a2ui-scroll-area" style={overflowStyle}>
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
      className={`rounded-lg border border-border bg-card p-3 shadow-sm transition-colors md:p-4 ${
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

import * as LucideIcons from "lucide-react"

// Map of icon names to lucide components
const iconMap: Record<string, LucideIcons.LucideIcon> = {
  eye: LucideIcons.Eye,
  "eye-off": LucideIcons.EyeOff,
  search: LucideIcons.Search,
  check: LucideIcons.Check,
  x: LucideIcons.X,
  plus: LucideIcons.Plus,
  minus: LucideIcons.Minus,
  edit: LucideIcons.Pencil,
  trash: LucideIcons.Trash2,
  copy: LucideIcons.Copy,
  link: LucideIcons.Link,
  "external-link": LucideIcons.ExternalLink,
  chevron_up: LucideIcons.ChevronUp,
  chevron_down: LucideIcons.ChevronDown,
  chevron_left: LucideIcons.ChevronLeft,
  chevron_right: LucideIcons.ChevronRight,
  arrow_up: LucideIcons.ArrowUp,
  arrow_down: LucideIcons.ArrowDown,
  refresh: LucideIcons.RefreshCw,
  loading: LucideIcons.Loader2,
  info: LucideIcons.Info,
  warning: LucideIcons.AlertTriangle,
  error: LucideIcons.AlertCircle,
  success: LucideIcons.CheckCircle,
  file: LucideIcons.File,
  folder: LucideIcons.Folder,
  settings: LucideIcons.Settings,
  user: LucideIcons.User,
  logout: LucideIcons.LogOut,
  menu: LucideIcons.Menu,
  sparkles: LucideIcons.Sparkles,
}

export function A2UIIcon({ node }: A2UIComponentProps<A2UIIconNode>) {
  const IconComponent = iconMap[node.name.toLowerCase()]

  if (IconComponent) {
    return (
      <IconComponent
        size={node.size ?? 16}
        color={node.color}
        style={node.style}
        className="inline-flex items-center justify-center"
      />
    )
  }

  // Fallback to text/emoji if icon not found
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

// OAuth Icon Components
function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  )
}

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
    outline: "border border-border bg-background hover:bg-accent",
  }

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  }

  const variant = node.variant ?? "primary"
  const size = node.size ?? "md"

  const renderIcon = () => {
    if (!node.icon) return null
    switch (node.icon) {
      case "google":
        return <GoogleIcon />
      case "github":
        return <GitHubIcon />
      default:
        return null
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={node.disabled}
      className={`flex items-center justify-center gap-3 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${node.fullWidth ? "w-full" : ""}`}
      style={node.style}
    >
      {renderIcon()}
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

// Click-to-edit text component
export function A2UIEditableText({ node, onAction }: A2UIComponentProps<A2UIEditableTextNode>) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(node.value)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const editable = node.editable !== false

  // Sync editValue when node.value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(node.value)
    }
  }, [node.value, isEditing])

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing) {
      if (node.multiline && textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.select()
      } else if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.select()
      }
    }
  }, [isEditing, node.multiline])

  const handleSave = () => {
    if (editValue !== node.value && node.onChange) {
      onAction(node.onChange.action, [editValue, ...(node.onChange.args ?? [])])
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(node.value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel()
    } else if (e.key === "Enter" && !node.multiline) {
      handleSave()
    }
  }

  // Text variant styles
  const variantClasses: Record<string, string> = {
    h1: "text-3xl font-bold",
    h2: "text-2xl font-semibold",
    h3: "text-xl font-semibold",
    h4: "text-lg font-semibold",
    body: "text-base",
    caption: "text-sm text-muted-foreground",
  }
  const variantClass = variantClasses[node.variant ?? "body"] ?? variantClasses.body

  // Edit mode
  if (isEditing) {
    if (node.multiline) {
      return (
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={node.placeholder}
          rows={3}
          className={`w-full rounded border border-primary bg-background px-2 py-1 outline-none ring-2 ring-primary/20 ${variantClass}`}
          style={node.style}
        />
      )
    }
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={node.placeholder}
        className={`w-full rounded border border-primary bg-background px-2 py-1 outline-none ring-2 ring-primary/20 ${variantClass}`}
        style={node.style}
      />
    )
  }

  // Display mode - editable
  if (editable) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        onKeyDown={(e) => e.key === "Enter" && setIsEditing(true)}
        role="button"
        tabIndex={0}
        className={`cursor-pointer rounded px-1 py-0.5 transition-colors hover:bg-primary/10 hover:text-primary ${variantClass}`}
        style={node.style}
        title="Click to edit"
      >
        {node.value || <span className="text-muted-foreground">{node.placeholder || "Click to edit"}</span>}
      </div>
    )
  }

  // Display mode - not editable
  return (
    <div className={`px-1 py-0.5 ${variantClass}`} style={node.style}>
      {node.value || <span className="text-muted-foreground">{node.placeholder}</span>}
    </div>
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
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex min-w-max border-b border-border md:min-w-0">
          {node.tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`flex-1 whitespace-nowrap px-3 py-2.5 text-xs font-medium transition-colors md:px-4 md:py-3 md:text-sm ${
                activeTab === index
                  ? "border-b-2 border-primary font-semibold text-foreground"
                  : "border-b-2 border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="py-3 md:py-4">
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 md:px-4"
      onClick={handleBackdropClick}
    >
      <div
        className="h-full w-full overflow-auto border-border bg-card shadow-xl md:h-auto md:max-h-[90vh] md:max-w-lg md:rounded-lg md:border"
        style={node.style}
      >
        {node.title && (
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3 md:px-6 md:py-4">
            <h2 className="text-base font-semibold md:text-lg">{node.title}</h2>
            <button
              onClick={handleClose}
              className="rounded-md p-1 text-2xl text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              &times;
            </button>
          </div>
        )}
        <div className="p-4 md:p-6">
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
    // External links open in new window
    const isExternal = node.href.startsWith("http://") || node.href.startsWith("https://")
    return (
      <a
        href={node.href}
        className={className}
        style={node.style}
        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
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
// Collapsible Component
// ============================================================================

export function A2UICollapsible({ node, renderChildren }: A2UIComponentProps<A2UICollapsibleNode>) {
  const [isOpen, setIsOpen] = useState(node.defaultOpen ?? false)

  const badgeColorClasses: Record<string, string> = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-accent/10 text-accent-foreground",
  }

  // Check if there's expandable content (children beyond previewChildren)
  const hasExpandableContent = node.children && node.children.length > 0

  return (
    <div
      className="rounded-lg border border-border overflow-hidden"
      style={node.style}
    >
      {/* Header - clickable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-3 bg-muted/50 px-4 py-3 text-left transition-colors hover:bg-muted"
      >
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">{node.title}</span>
            {node.badges?.map((badge: { text: string; color?: string }, idx: number) => (
              <span
                key={idx}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeColorClasses[badge.color ?? "default"]}`}
              >
                {badge.text}
              </span>
            ))}
          </div>
          {node.subtitle && (
            <span className="text-sm text-muted-foreground line-clamp-2">{node.subtitle}</span>
          )}
        </div>
        {/* Chevron icon - only show if there's expandable content */}
        {hasExpandableContent && (
          <svg
            className={`h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Always visible content: summary + previewChildren */}
      {(node.summary || (node.previewChildren && node.previewChildren.length > 0)) && (
        <div className="border-t border-border bg-card/50 px-4 py-3">
          {/* Summary text */}
          {node.summary && (
            <p className="text-sm text-foreground leading-relaxed">{node.summary}</p>
          )}
          {/* Preview children - always visible */}
          {node.previewChildren && node.previewChildren.length > 0 && (
            <div className={node.summary ? "mt-3" : ""}>
              {renderChildren?.(node.previewChildren as A2UINode[])}
            </div>
          )}
        </div>
      )}

      {/* Collapsible content - only children, hidden when collapsed */}
      {hasExpandableContent && (
        <div
          className={`overflow-hidden transition-all duration-200 ease-in-out ${
            isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="border-t border-border bg-card px-4 py-3">
            {renderChildren?.(node.children!)}
          </div>
        </div>
      )}
    </div>
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
