// AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
// Generated from: src/lib/a2ui/schema/standard-catalog.json
// Generated at: 2025-12-27T06:31:35.773Z

import type { A2UIComponentDefinition, A2UICatalog } from "../catalog"

// Catalog metadata
export const CATALOG_ID = "standard"
export const CATALOG_NAME = "A2UI Standard Catalog"
export const CATALOG_VERSION = "0.9.0"

// Component definitions
export const COMPONENT_DEFINITIONS: A2UIComponentDefinition[] = [
  {
    type: "column",
    description: "Vertical flex container",
    category: "layout",
    supportsChildren: true,
    properties: {
      gap: {
        type: "string",
        description: "Gap between children",
        default: "0.5rem",
      },
    },
  },
  {
    type: "row",
    description: "Horizontal flex container",
    category: "layout",
    supportsChildren: true,
    properties: {
      gap: {
        type: "string",
        description: "Gap between children",
        default: "0.5rem",
      },
      align: {
        type: "string",
        description: "Align items vertically",
        enum: ["start","center","end","stretch"],
      },
      justify: {
        type: "string",
        description: "Justify content horizontally",
        enum: ["start","center","end","between","around"],
      },
      wrap: {
        type: "boolean",
        description: "Enable flex wrap",
      },
      responsive: {
        type: "boolean",
        description: "Enable responsive behavior (stack on mobile)",
      },
    },
  },
  {
    type: "container",
    description: "Generic container",
    category: "layout",
    supportsChildren: true,
    properties: {
    },
  },
  {
    type: "card",
    description: "Card container with optional click action",
    category: "layout",
    supportsChildren: true,
    properties: {
      hoverable: {
        type: "boolean",
        description: "Enable hover effect",
        default: true,
      },
      onClick: {
        type: "action",
        description: "Click action handler",
      },
    },
  },
  {
    type: "text",
    description: "Text display with variants",
    category: "content",
    properties: {
      text: {
        type: "string",
        required: true,
        description: "Text content to display",
      },
      variant: {
        type: "string",
        description: "Text style variant",
        enum: ["h1","h2","h3","h4","body","caption","label"],
        default: "body",
      },
      color: {
        type: "string",
        description: "Text color",
        enum: ["foreground","muted","primary","destructive","success"],
        default: "foreground",
      },
      weight: {
        type: "string",
        description: "Font weight",
        enum: ["normal","medium","semibold","bold"],
      },
    },
  },
  {
    type: "image",
    description: "Image display",
    category: "content",
    properties: {
      src: {
        type: "string",
        required: true,
        description: "Image source URL",
      },
      alt: {
        type: "string",
        description: "Alternative text",
      },
      width: {
        type: "string",
        description: "Image width",
      },
      height: {
        type: "string",
        description: "Image height",
      },
    },
  },
  {
    type: "icon",
    description: "Icon display",
    category: "content",
    properties: {
      name: {
        type: "string",
        required: true,
        description: "Icon name or emoji",
      },
      size: {
        type: "number",
        description: "Icon size in pixels",
        default: 16,
      },
      color: {
        type: "string",
        description: "Icon color",
      },
    },
  },
  {
    type: "divider",
    description: "Visual separator",
    category: "content",
    properties: {
      orientation: {
        type: "string",
        description: "Divider orientation",
        enum: ["horizontal","vertical"],
        default: "horizontal",
      },
    },
  },
  {
    type: "button",
    description: "Clickable button",
    category: "interactive",
    properties: {
      text: {
        type: "string",
        required: true,
        description: "Button label",
      },
      variant: {
        type: "string",
        description: "Button style variant",
        enum: ["primary","secondary","destructive","ghost","text"],
        default: "primary",
      },
      size: {
        type: "string",
        description: "Button size",
        enum: ["sm","md","lg"],
        default: "md",
      },
      disabled: {
        type: "boolean",
        description: "Disable the button",
        default: false,
      },
      onClick: {
        type: "action",
        description: "Click action handler",
      },
    },
  },
  {
    type: "input",
    description: "Text input field",
    category: "interactive",
    properties: {
      value: {
        type: "string",
        description: "Input value",
      },
      placeholder: {
        type: "string",
        description: "Placeholder text",
      },
      inputType: {
        type: "string",
        description: "Input type",
        enum: ["text","password","email","number"],
        default: "text",
      },
      onChange: {
        type: "action",
        description: "Change action handler",
      },
    },
  },
  {
    type: "textarea",
    description: "Multi-line text input",
    category: "interactive",
    properties: {
      value: {
        type: "string",
        description: "Textarea value",
      },
      placeholder: {
        type: "string",
        description: "Placeholder text",
      },
      rows: {
        type: "number",
        description: "Number of visible rows",
        default: 4,
      },
      onChange: {
        type: "action",
        description: "Change action handler",
      },
    },
  },
  {
    type: "select",
    description: "Dropdown selection",
    category: "interactive",
    properties: {
      value: {
        type: "string",
        description: "Selected value",
      },
      options: {
        type: "array",
        required: true,
        description: "Available options",
      },
      onChange: {
        type: "action",
        description: "Change action handler",
      },
    },
  },
  {
    type: "checkbox",
    description: "Checkbox input",
    category: "interactive",
    properties: {
      checked: {
        type: "boolean",
        description: "Checked state",
        default: false,
      },
      taskId: {
        type: "string",
        description: "Associated task ID",
      },
      onChange: {
        type: "action",
        description: "Change action handler",
      },
    },
  },
  {
    type: "tabs",
    description: "Tabbed content container",
    category: "interactive",
    properties: {
      tabs: {
        type: "array",
        required: true,
        description: "Tab definitions",
      },
      defaultTab: {
        type: "number",
        description: "Default active tab index",
        default: 0,
      },
    },
  },
  {
    type: "badge",
    description: "Status badge",
    category: "feedback",
    properties: {
      text: {
        type: "string",
        required: true,
        description: "Badge text",
      },
      color: {
        type: "string",
        description: "Badge color",
        enum: ["default","primary","success","warning","destructive","info","pending","processing","completed","failed","cancelled"],
        default: "default",
      },
    },
  },
  {
    type: "progress",
    description: "Progress indicator",
    category: "feedback",
    properties: {
      status: {
        type: "string",
        required: true,
        description: "Progress status",
        enum: ["pending","processing","completed","failed","cancelled"],
      },
      value: {
        type: "number",
        description: "Progress value (0-100)",
      },
    },
  },
  {
    type: "modal",
    description: "Modal dialog",
    category: "feedback",
    supportsChildren: true,
    properties: {
      title: {
        type: "string",
        description: "Modal title",
      },
      open: {
        type: "boolean",
        description: "Open state",
        default: false,
      },
      onClose: {
        type: "action",
        description: "Close action handler",
      },
    },
  },
  {
    type: "page",
    description: "Page container with optional header",
    category: "layout",
    supportsChildren: true,
    properties: {
      title: {
        type: "string",
        description: "Page title",
      },
      maxWidth: {
        type: "string",
        description: "Maximum content width",
        enum: ["sm","md","lg","xl","2xl","full"],
        default: "xl",
      },
      centered: {
        type: "boolean",
        description: "Center content vertically and horizontally",
        default: false,
      },
    },
  },
  {
    type: "nav",
    description: "Navigation bar",
    category: "layout",
    supportsChildren: true,
    properties: {
      brand: {
        type: "string",
        description: "Brand/logo text",
      },
    },
  },
  {
    type: "nav-link",
    description: "Navigation link",
    category: "layout",
    properties: {
      text: {
        type: "string",
        required: true,
        description: "Link text",
      },
      href: {
        type: "string",
        description: "Link URL",
      },
      active: {
        type: "boolean",
        description: "Active state",
        default: false,
      },
      onClick: {
        type: "action",
        description: "Click action handler",
      },
    },
  },
  {
    type: "form",
    description: "Form container with submit handling",
    category: "interactive",
    supportsChildren: true,
    properties: {
      onSubmit: {
        type: "action",
        description: "Submit action handler",
      },
    },
  },
  {
    type: "form-field",
    description: "Form field with label",
    category: "interactive",
    supportsChildren: true,
    properties: {
      label: {
        type: "string",
        required: true,
        description: "Field label",
      },
      required: {
        type: "boolean",
        description: "Required field indicator",
        default: false,
      },
      error: {
        type: "string",
        description: "Error message",
      },
    },
  },
  {
    type: "alert",
    description: "Alert message",
    category: "feedback",
    properties: {
      message: {
        type: "string",
        required: true,
        description: "Alert message",
      },
      variant: {
        type: "string",
        description: "Alert variant",
        enum: ["info","success","warning","error"],
        default: "info",
      },
    },
  },
  {
    type: "link",
    description: "Clickable link",
    category: "content",
    properties: {
      text: {
        type: "string",
        required: true,
        description: "Link text",
      },
      href: {
        type: "string",
        description: "Link URL",
      },
      variant: {
        type: "string",
        description: "Link style",
        enum: ["default","muted","primary"],
        default: "primary",
      },
      onClick: {
        type: "action",
        description: "Click action handler",
      },
    },
  },
  {
    type: "spacer",
    description: "Flexible spacer",
    category: "layout",
    properties: {
      size: {
        type: "string",
        description: "Fixed size (e.g., '1rem', '20px')",
      },
      flex: {
        type: "boolean",
        description: "Use flex grow",
        default: true,
      },
    },
  },
  {
    type: "collapsible",
    description: "Collapsible content section with expand/collapse toggle. Shows summary when collapsed, full children when expanded.",
    category: "interactive",
    supportsChildren: true,
    properties: {
      title: {
        type: "string",
        required: true,
        description: "Header title text",
      },
      subtitle: {
        type: "string",
        description: "Optional subtitle text shown in header",
      },
      summary: {
        type: "string",
        description: "Summary text shown when collapsed (always visible)",
      },
      previewChildren: {
        type: "array",
        description: "Children nodes always visible (shown when collapsed and expanded)",
      },
      defaultOpen: {
        type: "boolean",
        description: "Initial open state",
        default: false,
      },
      badges: {
        type: "array",
        description: "Optional badges to display in header",
      },
    },
  },
]

// Create the standard catalog
export function createGeneratedCatalog(): A2UICatalog {
  const catalog: A2UICatalog = {
    id: CATALOG_ID,
    name: CATALOG_NAME,
    version: CATALOG_VERSION,
    description: "Standard A2UI component catalog with layout, content, interactive, and feedback components",
    components: new Map(),
  }

  for (const definition of COMPONENT_DEFINITIONS) {
    catalog.components.set(definition.type, definition)
  }

  return catalog
}

// All component types
export const COMPONENT_TYPES = ["column","row","container","card","text","image","icon","divider","button","input","textarea","select","checkbox","tabs","badge","progress","modal","page","nav","nav-link","form","form-field","alert","link","spacer","collapsible"] as const
export type ComponentType = typeof COMPONENT_TYPES[number]
