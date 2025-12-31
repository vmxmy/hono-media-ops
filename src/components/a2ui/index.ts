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

export * from "./core"
export * from "./charts"
export * from "./ext"
export * from "./business"

// Re-export types from generated
export type {
  A2UINode,
  A2UIBaseNode,
  A2UIAction,
  A2UIActionHandler,
  A2UIResponse,
  // Layout
  A2UIColumnNode,
  A2UIRowNode,
  A2UIContainerNode,
  A2UICardNode,
  A2UIPageNode,
  A2UINavNode,
  A2UINavLinkNode,
  A2UISpacerNode,
  // Content
  A2UITextNode,
  A2UIImageNode,
  A2UIIconNode,
  A2UIDividerNode,
  A2UILinkNode,
  // Interactive
  A2UIButtonNode,
  A2UIInputNode,
  A2UIEditableTextNode,
  A2UITextareaNode,
  A2UISelectNode,
  A2UICheckboxNode,
  A2UITabsNode,
  A2UIFormNode,
  A2UIFormFieldNode,
  // Feedback
  A2UIBadgeNode,
  A2UIProgressNode,
  A2UIModalNode,
  A2UIAlertNode,
  // Chart
  A2UIChartPieNode,
  A2UIChartRadarNode,
  A2UIChartLineNode,
  A2UIChartBarNode,
  A2UIChartRadialBarNode,
  A2UIChartWordCloudNode,
  // Custom
  A2UIAppShellNode,
  A2UIThemeSwitcherNode,
  A2UIMaterialsTableNode,
  A2UIArticleViewerModalNode,
  A2UICreateTaskModalNode,
  A2UIReverseSubmitModalNode,
  A2UIMarkdownNode,
} from "@/lib/a2ui"

// Toast provider
export { A2UIToaster } from "./toaster"

// Toast API (re-export from lib)
export { a2uiToast, type A2UIToast, type A2UIToastOptions } from "@/lib/a2ui"

// Legacy compatibility
