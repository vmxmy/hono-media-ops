// A2UI React Components
// Declarative JSON-based UI rendering for agent-generated interfaces

// Main renderer and hooks
export {
  A2UIRenderer,
  A2UIProvider,
  A2UIRender,
  useA2UIAction,
  useA2UIContext,
  useA2UIRegistry,
} from "./renderer"

// Setup utilities
export {
  setupStandardRegistry,
  initializeA2UI,
  getConfiguredRegistry,
  registerBusinessComponents,
} from "./setup"

// Component implementations
export * from "./core"
export * from "./charts"
export * from "./ext"
export * from "./business"

// Re-export all types from lib/a2ui (single source of truth)
export type {
  // Base types
  A2UINode,
  A2UIBaseNode,
  A2UIAction,
  A2UIActionHandler,
  A2UIResponse,
  // All node types (generated from schema)
  A2UIColumnNode,
  A2UIRowNode,
  A2UIContainerNode,
  A2UIScrollAreaNode,
  A2UICardNode,
  A2UIPageNode,
  A2UINavNode,
  A2UINavLinkNode,
  A2UISpacerNode,
  A2UITextNode,
  A2UIImageNode,
  A2UIIconNode,
  A2UIDividerNode,
  A2UILinkNode,
  A2UIButtonNode,
  A2UIInputNode,
  A2UIEditableTextNode,
  A2UITextareaNode,
  A2UIMarkdownEditorNode,
  A2UISelectNode,
  A2UICheckboxNode,
  A2UITabsNode,
  A2UIFormNode,
  A2UIFormFieldNode,
  A2UICollapsibleNode,
  A2UIBadgeNode,
  A2UIProgressNode,
  A2UIModalNode,
  A2UIAlertNode,
  A2UIChartPieNode,
  A2UIChartRadarNode,
  A2UIChartLineNode,
  A2UIChartBarNode,
  A2UIChartRadialBarNode,
  A2UIChartWordCloudNode,
  A2UIAppShellNode,
  A2UIThemeSwitcherNode,
  A2UIMaterialsTableNode,
  A2UIArticleViewerModalNode,
  A2UICreateTaskModalNode,
  A2UIReverseSubmitModalNode,
  A2UIMarkdownNode,
  // New ext types (generated from schema)
  A2UIStatCardNode,
  A2UIEmptyStateNode,
  A2UITaskStatusCardNode,
} from "@/lib/a2ui"

// Toast provider
export { A2UIToaster } from "./toaster"

// Toast API (re-export from lib)
export { a2uiToast, type A2UIToast, type A2UIToastOptions } from "@/lib/a2ui"
