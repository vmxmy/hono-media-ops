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
} from "./setup"

// Standard components (for custom registries)
export {
  A2UIColumn,
  A2UIRow,
  A2UIContainer,
  A2UICard,
  A2UIText,
  A2UIImage,
  A2UIIcon,
  A2UIDivider,
  A2UIButton,
  A2UIInput,
  A2UIEditableText,
  A2UITextarea,
  A2UISelect,
  A2UICheckbox,
  A2UITabs,
  A2UIBadge,
  A2UIProgress,
  A2UIModal,
  A2UIPage,
  A2UINav,
  A2UINavLink,
  A2UISpacer,
  A2UIForm,
  A2UIFormField,
  A2UIAlert,
  A2UILink,
  A2UIFallback,
} from "./standard-components"

// Chart components
export {
  A2UIChartPie,
  A2UIChartRadar,
  A2UIChartLine,
  A2UIChartBar,
  A2UIChartRadialBar,
  A2UIChartWordCloud,
} from "./chart-components"

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
} from "@/lib/a2ui"

// Toast provider
export { A2UIToaster } from "./toaster"

// Toast API (re-export from lib)
export { a2uiToast, type A2UIToast, type A2UIToastOptions } from "@/lib/a2ui"

// Legacy compatibility
export type { A2UIDeviderNode } from "@/lib/a2ui"
