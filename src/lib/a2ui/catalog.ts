// A2UI Catalog System
// Defines the component catalog that specifies which components are available

import type { CSSProperties } from "react"

/**
 * Component property definition for catalog
 */
export interface A2UIPropertyDefinition {
  type: "string" | "number" | "boolean" | "array" | "object" | "action"
  required?: boolean
  description?: string
  enum?: string[]
  default?: unknown
}

/**
 * Component definition in catalog
 */
export interface A2UIComponentDefinition {
  type: string
  description: string
  category: "layout" | "content" | "interactive" | "feedback" | "custom"
  properties: Record<string, A2UIPropertyDefinition>
  supportsChildren?: boolean
}

/**
 * Catalog definition
 */
export interface A2UICatalog {
  id: string
  name: string
  version: string
  description: string
  components: Map<string, A2UIComponentDefinition>
}

/**
 * Create a new catalog
 */
export function createCatalog(
  id: string,
  name: string,
  options?: { version?: string; description?: string }
): A2UICatalog {
  return {
    id,
    name,
    version: options?.version ?? "1.0.0",
    description: options?.description ?? "",
    components: new Map(),
  }
}

/**
 * Add component definition to catalog
 */
export function addComponentToCatalog(
  catalog: A2UICatalog,
  definition: A2UIComponentDefinition
): A2UICatalog {
  catalog.components.set(definition.type, definition)
  return catalog
}

/**
 * Check if catalog supports a component type
 */
export function catalogHasComponent(
  catalog: A2UICatalog,
  type: string
): boolean {
  return catalog.components.has(type)
}

/**
 * Get component definition from catalog
 */
export function getComponentDefinition(
  catalog: A2UICatalog,
  type: string
): A2UIComponentDefinition | undefined {
  return catalog.components.get(type)
}

/**
 * Standard catalog component definitions
 */
export const STANDARD_COMPONENT_DEFINITIONS: A2UIComponentDefinition[] = [
  // Layout components
  {
    type: "column",
    description: "Vertical flex container",
    category: "layout",
    supportsChildren: true,
    properties: {
      gap: { type: "string", description: "Gap between children" },
      style: { type: "object", description: "Custom CSS styles" },
    },
  },
  {
    type: "row",
    description: "Horizontal flex container",
    category: "layout",
    supportsChildren: true,
    properties: {
      gap: { type: "string", description: "Gap between children" },
      align: { type: "string", enum: ["start", "center", "end", "stretch"] },
      justify: { type: "string", enum: ["start", "center", "end", "between", "around"] },
      style: { type: "object", description: "Custom CSS styles" },
    },
  },
  {
    type: "container",
    description: "Generic container",
    category: "layout",
    supportsChildren: true,
    properties: {
      style: { type: "object", description: "Custom CSS styles" },
    },
  },
  {
    type: "card",
    description: "Card container with optional click action",
    category: "layout",
    supportsChildren: true,
    properties: {
      hoverable: { type: "boolean", default: true },
      onClick: { type: "action", description: "Click action" },
      style: { type: "object", description: "Custom CSS styles" },
    },
  },
  // Content components
  {
    type: "text",
    description: "Text display with variants",
    category: "content",
    properties: {
      text: { type: "string", required: true },
      variant: { type: "string", enum: ["h1", "h2", "h3", "h4", "body", "caption", "label"] },
      color: { type: "string", enum: ["foreground", "muted", "primary", "destructive", "success"] },
      weight: { type: "string", enum: ["normal", "medium", "semibold", "bold"] },
      style: { type: "object" },
    },
  },
  {
    type: "image",
    description: "Image display",
    category: "content",
    properties: {
      src: { type: "string", required: true },
      alt: { type: "string" },
      width: { type: "string" },
      height: { type: "string" },
      style: { type: "object" },
    },
  },
  {
    type: "icon",
    description: "Icon display",
    category: "content",
    properties: {
      name: { type: "string", required: true },
      size: { type: "number" },
      color: { type: "string" },
      style: { type: "object" },
    },
  },
  {
    type: "divider",
    description: "Visual separator",
    category: "content",
    properties: {
      orientation: { type: "string", enum: ["horizontal", "vertical"], default: "horizontal" },
      style: { type: "object" },
    },
  },
  // Interactive components
  {
    type: "button",
    description: "Clickable button",
    category: "interactive",
    properties: {
      text: { type: "string", required: true },
      variant: { type: "string", enum: ["primary", "secondary", "destructive", "ghost", "text"] },
      size: { type: "string", enum: ["sm", "md", "lg"] },
      disabled: { type: "boolean" },
      onClick: { type: "action" },
      style: { type: "object" },
    },
  },
  {
    type: "input",
    description: "Text input field",
    category: "interactive",
    properties: {
      value: { type: "string" },
      placeholder: { type: "string" },
      inputType: { type: "string", enum: ["text", "password", "email", "number"] },
      onChange: { type: "action" },
      style: { type: "object" },
    },
  },
  {
    type: "textarea",
    description: "Multi-line text input",
    category: "interactive",
    properties: {
      value: { type: "string" },
      placeholder: { type: "string" },
      rows: { type: "number", default: 4 },
      onChange: { type: "action" },
      style: { type: "object" },
    },
  },
  {
    type: "select",
    description: "Dropdown selection",
    category: "interactive",
    properties: {
      value: { type: "string" },
      options: { type: "array", required: true },
      onChange: { type: "action" },
      style: { type: "object" },
    },
  },
  {
    type: "checkbox",
    description: "Checkbox input",
    category: "interactive",
    properties: {
      checked: { type: "boolean" },
      taskId: { type: "string" },
      onChange: { type: "action" },
      style: { type: "object" },
    },
  },
  {
    type: "tabs",
    description: "Tabbed content container",
    category: "interactive",
    supportsChildren: false,
    properties: {
      tabs: { type: "array", required: true },
      defaultTab: { type: "number", default: 0 },
      style: { type: "object" },
    },
  },
  // Feedback components
  {
    type: "badge",
    description: "Status badge",
    category: "feedback",
    properties: {
      text: { type: "string", required: true },
      color: {
        type: "string",
        enum: ["default", "primary", "success", "warning", "destructive", "info", "pending", "processing", "completed", "failed", "cancelled"],
      },
      style: { type: "object" },
    },
  },
  {
    type: "progress",
    description: "Progress indicator",
    category: "feedback",
    properties: {
      status: { type: "string", required: true, enum: ["pending", "processing", "completed", "failed", "cancelled"] },
      value: { type: "number" },
      style: { type: "object" },
    },
  },
  {
    type: "modal",
    description: "Modal dialog",
    category: "feedback",
    supportsChildren: true,
    properties: {
      title: { type: "string" },
      open: { type: "boolean" },
      onClose: { type: "action" },
      style: { type: "object" },
    },
  },
]

/**
 * Create the standard A2UI catalog
 */
export function createStandardCatalog(): A2UICatalog {
  const catalog = createCatalog("standard", "A2UI Standard Catalog", {
    version: "0.8.0",
    description: "Standard A2UI component catalog with layout, content, interactive, and feedback components",
  })

  for (const definition of STANDARD_COMPONENT_DEFINITIONS) {
    addComponentToCatalog(catalog, definition)
  }

  return catalog
}

/**
 * Merge catalogs (custom catalog extends standard)
 */
export function mergeCatalogs(
  base: A2UICatalog,
  extension: A2UICatalog
): A2UICatalog {
  const merged = createCatalog(
    extension.id,
    extension.name,
    { version: extension.version, description: extension.description }
  )

  // Copy base components
  for (const [type, definition] of base.components) {
    merged.components.set(type, definition)
  }

  // Override/add extension components
  for (const [type, definition] of extension.components) {
    merged.components.set(type, definition)
  }

  return merged
}
