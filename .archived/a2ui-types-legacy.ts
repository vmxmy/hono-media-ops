// A2UI Type Definitions
// Based on the A2UI protocol for declarative UI representation

import type { CSSProperties } from "react"

// Base node interface
export interface A2UIBaseNode {
  id?: string
  style?: CSSProperties
}

// Layout components
export interface A2UIColumnNode extends A2UIBaseNode {
  type: "column"
  children?: A2UINode[]
  gap?: number | string
}

export interface A2UIRowNode extends A2UIBaseNode {
  type: "row"
  children?: A2UINode[]
  gap?: number | string
  align?: "start" | "center" | "end" | "stretch"
  justify?: "start" | "center" | "end" | "between" | "around"
}

export interface A2UIContainerNode extends A2UIBaseNode {
  type: "container"
  children?: A2UINode[]
}

// Card component
export interface A2UICardNode extends A2UIBaseNode {
  type: "card"
  children?: A2UINode[]
  onClick?: A2UIAction
  hoverable?: boolean
}

// Text component
export interface A2UITextNode extends A2UIBaseNode {
  type: "text"
  text: string
  variant?: "h1" | "h2" | "h3" | "h4" | "body" | "caption" | "label"
  color?: "foreground" | "muted" | "primary" | "destructive" | "success"
  weight?: "normal" | "medium" | "semibold" | "bold"
}

// Button component
export interface A2UIButtonNode extends A2UIBaseNode {
  type: "button"
  text: string
  variant?: "primary" | "secondary" | "destructive" | "ghost" | "text"
  size?: "sm" | "md" | "lg"
  disabled?: boolean
  onClick?: A2UIAction
}

// Badge component
export interface A2UIBadgeNode extends A2UIBaseNode {
  type: "badge"
  text: string
  color?: "default" | "primary" | "success" | "warning" | "destructive" | "info" | "pending" | "processing" | "completed" | "failed" | "cancelled"
}

// Progress bar component
export interface A2UIProgressNode extends A2UIBaseNode {
  type: "progress"
  status: "pending" | "processing" | "completed" | "failed" | "cancelled"
  value?: number
}

// Checkbox component
export interface A2UICheckboxNode extends A2UIBaseNode {
  type: "checkbox"
  checked?: boolean
  taskId?: string
  onChange?: A2UIAction
}

// Tabs component
export interface A2UITabsNode extends A2UIBaseNode {
  type: "tabs"
  tabs: Array<{
    label: string
    content?: A2UINode
  }>
  defaultTab?: number
}

// Divider component
export interface A2UIDeviderNode extends A2UIBaseNode {
  type: "divider"
  orientation?: "horizontal" | "vertical"
}

// Image component
export interface A2UIImageNode extends A2UIBaseNode {
  type: "image"
  src: string
  alt?: string
  width?: number | string
  height?: number | string
}

// Icon component
export interface A2UIIconNode extends A2UIBaseNode {
  type: "icon"
  name: string
  size?: number
  color?: string
}

// Input component
export interface A2UIInputNode extends A2UIBaseNode {
  type: "input"
  value?: string
  placeholder?: string
  inputType?: "text" | "password" | "email" | "number"
  onChange?: A2UIAction
}

// Textarea component
export interface A2UITextareaNode extends A2UIBaseNode {
  type: "textarea"
  value?: string
  placeholder?: string
  rows?: number
  onChange?: A2UIAction
}

// Select component
export interface A2UISelectNode extends A2UIBaseNode {
  type: "select"
  value?: string
  options: Array<{
    label: string
    value: string
  }>
  onChange?: A2UIAction
}

// Modal component
export interface A2UIModalNode extends A2UIBaseNode {
  type: "modal"
  title?: string
  children?: A2UINode[]
  open?: boolean
  onClose?: A2UIAction
}

// Action definition
export interface A2UIAction {
  action: string
  args?: unknown[]
}

// Union type for all A2UI nodes
export type A2UINode =
  | A2UIColumnNode
  | A2UIRowNode
  | A2UIContainerNode
  | A2UICardNode
  | A2UITextNode
  | A2UIButtonNode
  | A2UIBadgeNode
  | A2UIProgressNode
  | A2UICheckboxNode
  | A2UITabsNode
  | A2UIDeviderNode
  | A2UIImageNode
  | A2UIIconNode
  | A2UIInputNode
  | A2UITextareaNode
  | A2UISelectNode
  | A2UIModalNode

// A2UI Response format (from server)
export interface A2UIResponse {
  nodes: A2UINode | A2UINode[]
  metadata?: Record<string, unknown>
}

// Action handler type
export type A2UIActionHandler = (action: string, args?: unknown[]) => void
