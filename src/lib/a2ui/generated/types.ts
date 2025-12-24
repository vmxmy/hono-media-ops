// AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
// Generated from: src/lib/a2ui/schema/standard-catalog.json
// Generated at: 2025-12-24T18:02:52.979Z

import type { CSSProperties } from "react"

// Base node interface
export interface A2UIBaseNode {
  id?: string
  style?: CSSProperties
}

// Action definition
export interface A2UIAction {
  action: string
  args?: unknown[]
  stopPropagation?: boolean
}

// Forward declaration for recursive types
export type A2UINode =
  | A2UIColumnNode
  | A2UIRowNode
  | A2UIContainerNode
  | A2UICardNode
  | A2UITextNode
  | A2UIImageNode
  | A2UIIconNode
  | A2UIDividerNode
  | A2UIButtonNode
  | A2UIInputNode
  | A2UITextareaNode
  | A2UISelectNode
  | A2UICheckboxNode
  | A2UITabsNode
  | A2UIBadgeNode
  | A2UIProgressNode
  | A2UIModalNode
  | A2UIPageNode
  | A2UINavNode
  | A2UINavLinkNode
  | A2UIFormNode
  | A2UIFormFieldNode
  | A2UIAlertNode
  | A2UILinkNode
  | A2UISpacerNode

// Vertical flex container
export interface A2UIColumnNode extends A2UIBaseNode {
  type: "column"
  children?: A2UINode[]
  gap?: string // Gap between children
}

// Horizontal flex container
export interface A2UIRowNode extends A2UIBaseNode {
  type: "row"
  children?: A2UINode[]
  gap?: string // Gap between children
  align?: "start" | "center" | "end" | "stretch" // Align items vertically
  justify?: "start" | "center" | "end" | "between" | "around" // Justify content horizontally
  responsive?: boolean // Stack vertically on mobile (default: false)
  wrap?: boolean // Allow wrapping (default: false)
}

// Generic container
export interface A2UIContainerNode extends A2UIBaseNode {
  type: "container"
  children?: A2UINode[]
}

// Card container with optional click action
export interface A2UICardNode extends A2UIBaseNode {
  type: "card"
  children?: A2UINode[]
  hoverable?: boolean // Enable hover effect
  onClick?: A2UIAction // Click action handler
}

// Text display with variants
export interface A2UITextNode extends A2UIBaseNode {
  type: "text"
  text: string // Text content to display
  variant?: "h1" | "h2" | "h3" | "h4" | "body" | "caption" | "label" // Text style variant
  color?: "foreground" | "muted" | "primary" | "destructive" | "success" // Text color
  weight?: "normal" | "medium" | "semibold" | "bold" // Font weight
}

// Image display
export interface A2UIImageNode extends A2UIBaseNode {
  type: "image"
  src: string // Image source URL
  alt?: string // Alternative text
  width?: string // Image width
  height?: string // Image height
}

// Icon display
export interface A2UIIconNode extends A2UIBaseNode {
  type: "icon"
  name: string // Icon name or emoji
  size?: number // Icon size in pixels
  color?: string // Icon color
}

// Visual separator
export interface A2UIDividerNode extends A2UIBaseNode {
  type: "divider"
  orientation?: "horizontal" | "vertical" // Divider orientation
}

// Clickable button
export interface A2UIButtonNode extends A2UIBaseNode {
  type: "button"
  text: string // Button label
  variant?: "primary" | "secondary" | "destructive" | "ghost" | "text" // Button style variant
  size?: "sm" | "md" | "lg" // Button size
  disabled?: boolean // Disable the button
  onClick?: A2UIAction // Click action handler
}

// Text input field
export interface A2UIInputNode extends A2UIBaseNode {
  type: "input"
  value?: string // Input value
  placeholder?: string // Placeholder text
  inputType?: "text" | "password" | "email" | "number" // Input type
  onChange?: A2UIAction // Change action handler
}

// Multi-line text input
export interface A2UITextareaNode extends A2UIBaseNode {
  type: "textarea"
  value?: string // Textarea value
  placeholder?: string // Placeholder text
  rows?: number // Number of visible rows
  onChange?: A2UIAction // Change action handler
}

// Dropdown selection
export interface A2UISelectNode extends A2UIBaseNode {
  type: "select"
  value?: string // Selected value
  options: Array<{ label: string; value: string }> // Available options
  onChange?: A2UIAction // Change action handler
}

// Checkbox input
export interface A2UICheckboxNode extends A2UIBaseNode {
  type: "checkbox"
  checked?: boolean // Checked state
  taskId?: string // Associated task ID
  onChange?: A2UIAction // Change action handler
}

// Tabbed content container
export interface A2UITabsNode extends A2UIBaseNode {
  type: "tabs"
  tabs: Array<{ label: string; content: A2UINode }> // Tab definitions
  defaultTab?: number // Default active tab index
}

// Status badge
export interface A2UIBadgeNode extends A2UIBaseNode {
  type: "badge"
  text: string // Badge text
  color?: "default" | "primary" | "success" | "warning" | "destructive" | "info" | "pending" | "processing" | "completed" | "failed" | "cancelled" // Badge color
}

// Progress indicator
export interface A2UIProgressNode extends A2UIBaseNode {
  type: "progress"
  status: "pending" | "processing" | "completed" | "failed" | "cancelled" // Progress status
  value?: number // Progress value (0-100)
}

// Modal dialog
export interface A2UIModalNode extends A2UIBaseNode {
  type: "modal"
  children?: A2UINode[]
  title?: string // Modal title
  open?: boolean // Open state
  onClose?: A2UIAction // Close action handler
}

// Page container with optional header
export interface A2UIPageNode extends A2UIBaseNode {
  type: "page"
  children?: A2UINode[]
  title?: string // Page title
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full" // Maximum content width
  centered?: boolean // Center content vertically and horizontally
}

// Navigation bar
export interface A2UINavNode extends A2UIBaseNode {
  type: "nav"
  children?: A2UINode[]
  brand?: string // Brand/logo text
}

// Navigation link
export interface A2UINavLinkNode extends A2UIBaseNode {
  type: "nav-link"
  text: string // Link text
  href?: string // Link URL
  active?: boolean // Active state
  onClick?: A2UIAction // Click action handler
}

// Form container with submit handling
export interface A2UIFormNode extends A2UIBaseNode {
  type: "form"
  children?: A2UINode[]
  onSubmit?: A2UIAction // Submit action handler
}

// Form field with label
export interface A2UIFormFieldNode extends A2UIBaseNode {
  type: "form-field"
  children?: A2UINode[]
  label: string // Field label
  required?: boolean // Required field indicator
  error?: string // Error message
}

// Alert message
export interface A2UIAlertNode extends A2UIBaseNode {
  type: "alert"
  message: string // Alert message
  variant?: "info" | "success" | "warning" | "error" // Alert variant
}

// Clickable link
export interface A2UILinkNode extends A2UIBaseNode {
  type: "link"
  text: string // Link text
  href?: string // Link URL
  variant?: "default" | "muted" | "primary" // Link style
  onClick?: A2UIAction // Click action handler
}

// Flexible spacer
export interface A2UISpacerNode extends A2UIBaseNode {
  type: "spacer"
  size?: string // Fixed size (e.g., '1rem', '20px')
  flex?: boolean // Use flex grow
}

// A2UI Response format (from server)
export interface A2UIResponse {
  nodes: A2UINode | A2UINode[]
  metadata?: Record<string, unknown>
}

// Action handler type
export type A2UIActionHandler = (action: string, args?: unknown[]) => void
