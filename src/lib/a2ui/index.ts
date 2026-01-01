// A2UI Library
// Declarative JSON-based UI protocol for agent-generated interfaces
//
// ARCHITECTURE: Schema-First
// - Source of Truth: src/lib/a2ui/schema/standard-catalog.json
// - Generated Code:  src/lib/a2ui/generated/
// - Run: npm run a2ui:generate

// ============================================================================
// Generated Types (from schema)
// ============================================================================
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
  A2UIScrollAreaNode,
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
  A2UIMarkdownEditorNode,
  A2UISelectNode,
  A2UICheckboxNode,
  A2UITabsNode,
  A2UIFormNode,
  A2UIFormFieldNode,
  A2UICollapsibleNode,
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
  // Ext
  A2UIStatCardNode,
  A2UIEmptyStateNode,
  A2UITaskStatusCardNode,
} from "./generated/types"

export {
  CATALOG_ID,
  CATALOG_NAME,
  CATALOG_VERSION,
  COMPONENT_DEFINITIONS,
  COMPONENT_TYPES,
  createGeneratedCatalog,
  type ComponentType,
} from "./generated/catalog"

export type {
  A2UICatalog,
  A2UIComponentDefinition,
  A2UIPropertyDefinition,
} from "./catalog-types"

// Create standard catalog using generated definitions
export { createGeneratedCatalog as createStandardCatalog } from "./generated/catalog"

// ============================================================================
// Registry System
// ============================================================================
export {
  type A2UIComponent,
  type A2UIComponentProps,
  A2UIRegistry,
  createRegistry,
  getDefaultRegistry,
  setDefaultRegistry,
  registerComponent,
  overrideComponent,
  dispatchA2UIAction,
} from "./registry"

// ============================================================================
// Transformers (only complex list transformations)
// ============================================================================
export * from "./task-transformer"

// ============================================================================
// Toast System (Imperative API)
// ============================================================================
export { a2uiToast, type A2UIToast, type A2UIToastOptions } from "./toast"

// ============================================================================
// Legacy Compatibility
// Keep the old type name for backward compatibility
// ============================================================================
