// AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
// Generated from: src/lib/a2ui/schema/standard-catalog.json
// Generated at: 2026-01-12T09:24:06.204Z

import type { CSSProperties } from "react"

// Base node interface
export interface A2UIBaseNode {
  id?: string
  style?: CSSProperties
  className?: string
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
  | A2UIScrollAreaNode
  | A2UICardNode
  | A2UITextNode
  | A2UIImageNode
  | A2UIIconNode
  | A2UIDividerNode
  | A2UIButtonNode
  | A2UIInputNode
  | A2UIEditableTextNode
  | A2UITextareaNode
  | A2UIMarkdownEditorNode
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
  | A2UICollapsibleNode
  | A2UIChartPieNode
  | A2UIChartRadarNode
  | A2UIChartLineNode
  | A2UIChartBarNode
  | A2UIChartRadialBarNode
  | A2UIChartWordCloudNode
  | A2UIAppShellNode
  | A2UIThemeSwitcherNode
  | A2UIMaterialsTableNode
  | A2UIArticleViewerModalNode
  | A2UICreateTaskModalNode
  | A2UIReverseSubmitModalNode
  | A2UIMarkdownNode
  | A2UIStatCardNode
  | A2UIEmptyStateNode
  | A2UITaskStatusCardNode

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
  wrap?: boolean // Enable flex wrap
  responsive?: boolean // Enable responsive behavior (stack on mobile)
}

// Generic container
export interface A2UIContainerNode extends A2UIBaseNode {
  type: "container"
  children?: A2UINode[]
}

// Scrollable container with custom scrollbar
export interface A2UIScrollAreaNode extends A2UIBaseNode {
  type: "scroll-area"
  children?: A2UINode[]
  orientation?: "vertical" | "horizontal" | "both" // Scroll direction
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
  variant?: "primary" | "secondary" | "destructive" | "ghost" | "text" | "outline" // Button style variant
  size?: "sm" | "md" | "lg" // Button size
  disabled?: boolean // Disable the button
  icon?: "google" | "github" | "plus" // Icon to display before text
  hideLabelOn?: "sm" // Hide label at or below breakpoint
  fullWidth?: boolean // Make button full width
  buttonType?: "button" | "submit" | "reset" // HTML button type attribute
  onClick?: A2UIAction // Click action handler
}

// Text input field
export interface A2UIInputNode extends A2UIBaseNode {
  type: "input"
  value?: string // Input value
  placeholder?: string // Placeholder text
  inputType?: "text" | "password" | "email" | "number" // Input type
  name?: string // Input name attribute for form submission and accessibility
  autocomplete?: string // Autocomplete hint for browsers (e.g., username, current-password, email)
  onChange?: A2UIAction // Change action handler
}

// Click-to-edit text field that toggles between display and edit mode
export interface A2UIEditableTextNode extends A2UIBaseNode {
  type: "editable-text"
  value: string // Text value to display and edit
  placeholder?: string // Placeholder text when value is empty
  variant?: "h1" | "h2" | "h3" | "h4" | "body" | "caption" // Text style variant
  multiline?: boolean // Use textarea for multi-line editing
  editable?: boolean // Whether the text can be edited
  onChange?: A2UIAction // Called when text is saved with new value as first arg
}

// Multi-line text input
export interface A2UITextareaNode extends A2UIBaseNode {
  type: "textarea"
  value?: string // Textarea value
  placeholder?: string // Placeholder text
  rows?: number // Number of visible rows
  onChange?: A2UIAction // Change action handler
}

// Markdown editor with toolbar and live preview
export interface A2UIMarkdownEditorNode extends A2UIBaseNode {
  type: "markdown-editor"
  value?: string // Markdown content
  height?: unknown // Editor height in pixels, or '100%' for full height
  preview?: "edit" | "live" | "preview" // Preview mode: edit (no preview), live (side by side), preview (read only)
  hideToolbar?: boolean // Hide the toolbar
  onChange?: A2UIAction // Content change handler
}

// Dropdown selection
export interface A2UISelectNode extends A2UIBaseNode {
  type: "select"
  value?: string // Selected value
  placeholder?: string // Placeholder text when no value is selected
  options: Array<{ label: string; value: string }> // Available options
  onChange?: A2UIAction // Change action handler
}

// Checkbox input
export interface A2UICheckboxNode extends A2UIBaseNode {
  type: "checkbox"
  checked?: boolean // Checked state
  label?: string // Label text for the checkbox
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
  text?: string // Link text (deprecated, use label)
  label?: string // Link label text
  icon?: string // Icon name or React node key
  href?: string // Link URL
  active?: boolean // Active state
  onClick?: A2UIAction // Click action handler
}

// Form container with submit handling
export interface A2UIFormNode extends A2UIBaseNode {
  type: "form"
  children?: A2UINode[]
  autocomplete?: "on" | "off" // Form autocomplete setting
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
  external?: boolean // Open link in new tab
  onClick?: A2UIAction // Click action handler
}

// Flexible spacer
export interface A2UISpacerNode extends A2UIBaseNode {
  type: "spacer"
  size?: string // Fixed size (e.g., '1rem', '20px')
  flex?: boolean // Use flex grow
}

// Collapsible content section with expand/collapse toggle. Shows summary when collapsed, full children when expanded.
export interface A2UICollapsibleNode extends A2UIBaseNode {
  type: "collapsible"
  children?: A2UINode[]
  title: string // Header title text
  subtitle?: string // Optional subtitle text shown in header
  summary?: string // Summary text shown when collapsed (always visible)
  previewChildren?: A2UINode[] // Children nodes always visible (shown when collapsed and expanded)
  defaultOpen?: boolean // Initial open state
  badges?: Array<{ text: string; color: string }> // Optional badges to display in header
}

// Pie/Donut chart for distribution data visualization
export interface A2UIChartPieNode extends A2UIBaseNode {
  type: "chart-pie"
  data: Array<{ id: string; label: string; value: number; color: string }> // Chart data array with id, label, and value
  innerRadius?: number // Inner radius for donut effect (0-1)
  height?: number // Chart height in pixels
  title?: string // Chart title
  colors?: unknown[] // Custom color scheme
}

// Radar chart for multi-dimensional comparison
export interface A2UIChartRadarNode extends A2UIBaseNode {
  type: "chart-radar"
  data: unknown[] // Radar data array
  keys: unknown[] // Data keys to plot
  indexBy: string // Index field name
  height?: number // Chart height in pixels
  title?: string // Chart title
  maxValue?: number // Maximum scale value
}

// Line/Area chart for time series data
export interface A2UIChartLineNode extends A2UIBaseNode {
  type: "chart-line"
  data: Array<{ id: string; color: string; data: Array<{ x: string; y: number }> }> // Series data with id and data points
  height?: number // Chart height in pixels
  title?: string // Chart title
  enableArea?: boolean // Fill area under line
  curve?: "linear" | "cardinal" | "catmullRom" | "monotoneX" | "natural" | "step" // Line curve type
  enablePoints?: boolean // Show data points
  xLegend?: string // X axis legend
  yLegend?: string // Y axis legend
}

// Bar chart for comparison data
export interface A2UIChartBarNode extends A2UIBaseNode {
  type: "chart-bar"
  data: unknown[] // Bar data array
  keys: unknown[] // Data keys to display
  indexBy: string // Index field name
  layout?: "horizontal" | "vertical" // Bar orientation
  height?: number // Chart height in pixels
  title?: string // Chart title
  groupMode?: "grouped" | "stacked" // How to group multiple keys
}

// Radial bar / gauge chart for metrics display
export interface A2UIChartRadialBarNode extends A2UIBaseNode {
  type: "chart-radial-bar"
  data: Array<{ id: string; data: Array<{ x: string; y: number }> }> // Radial data with id and data points
  maxValue?: number // Maximum value for scale
  height?: number // Chart height in pixels
  title?: string // Chart title
  startAngle?: number // Start angle in degrees
  endAngle?: number // End angle in degrees
}

// Word cloud for keyword visualization
export interface A2UIChartWordCloudNode extends A2UIBaseNode {
  type: "chart-word-cloud"
  words: Array<{ text: string; value: number }> // Words array with text and value
  height?: number // Chart height in pixels
  title?: string // Chart title
  colors?: unknown[] // Custom color scheme
}

// Application shell layout with sidebar navigation and header
export interface A2UIAppShellNode extends A2UIBaseNode {
  type: "app-shell"
  children?: A2UINode[]
  brand?: string // Brand text
  logoSrc?: string // Logo image source
  logoAlt?: string // Logo image alt
  navItems: Array<{ key: string; label: string; path: string }> // Sidebar navigation items
  activePath?: string // Active pathname for highlighting
  onNavigate?: A2UIAction // Navigate action
  onLogout?: A2UIAction // Logout action
  logoutLabel?: string // Logout button text
  headerActions?: A2UINode[] // Optional header action nodes
}

// Theme and locale switcher
export interface A2UIThemeSwitcherNode extends A2UIBaseNode {
  type: "theme-switcher"
}

// Materials table for style analyses
export interface A2UIMaterialsTableNode extends A2UIBaseNode {
  type: "materials-table"
  data: unknown[] // Table row data
  onClone?: A2UIAction // Clone action
  onDelete?: A2UIAction // Delete action
  onViewDetail?: A2UIAction // View detail action
}

// Article viewer modal
export interface A2UIArticleViewerModalNode extends A2UIBaseNode {
  type: "article-viewer-modal"
  open: boolean // Open state
  markdown: string // Markdown content
  title?: string // Modal title
  executionId?: string // Execution ID for updates
  wechatMediaInfo?: Record<string, unknown> // WeChat media info containing r2_url, media_id, etc.
  onClose?: A2UIAction // Close action
  onUpdateResult?: A2UIAction // Update result action
  onUpdateMarkdown?: A2UIAction // Update markdown content action
}

// Create task modal
export interface A2UICreateTaskModalNode extends A2UIBaseNode {
  type: "create-task-modal"
  open: boolean // Open state
  initialData?: Record<string, unknown> // Initial form data
  isRegenerate?: boolean // Regenerate mode
  onClose?: A2UIAction // Close action
  onSuccess?: A2UIAction // Success action
}

// Reverse analysis submit modal
export interface A2UIReverseSubmitModalNode extends A2UIBaseNode {
  type: "reverse-submit-modal"
  open: boolean // Open state
  onClose?: A2UIAction // Close action
  onSuccess?: A2UIAction // Success action
}

// Markdown content renderer
export interface A2UIMarkdownNode extends A2UIBaseNode {
  type: "markdown"
  content: string // Markdown source content
}

// Statistics card displaying a metric with optional change indicator
export interface A2UIStatCardNode extends A2UIBaseNode {
  type: "stat-card"
  label: string // Label text for the metric
  value: string // Display value (number or formatted string)
  change?: { value?: number; direction?: "up" | "down" } // Change indicator with value and direction
  icon?: string // Icon emoji or name
}

// Empty state placeholder with optional action button
export interface A2UIEmptyStateNode extends A2UIBaseNode {
  type: "empty-state"
  title: string // Main title text
  description?: string // Secondary description text
  icon?: string // Icon emoji or name
  actionLabel?: string // Action button label
  onAction?: A2UIAction // Action handler when button is clicked
}

// Task status card with progress and action buttons
export interface A2UITaskStatusCardNode extends A2UIBaseNode {
  type: "task-status-card"
  taskId: string // Unique task identifier
  title: string // Task title
  description?: string // Task description
  status: "pending" | "processing" | "completed" | "failed" | "cancelled" // Current task status
  progress?: number // Progress percentage (0-100)
  createdAt: string // ISO timestamp of task creation
  showActions?: boolean // Show action buttons (retry, cancel, delete)
}

// A2UI Response format (from server)
export interface A2UIResponse {
  nodes: A2UINode | A2UINode[]
  metadata?: Record<string, unknown>
}

// Action handler type
export type A2UIActionHandler = (action: string, args?: unknown[]) => void
