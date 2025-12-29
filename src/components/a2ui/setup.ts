// A2UI Setup - Registers standard components to the registry

import { createRegistry, setDefaultRegistry, type A2UIRegistry } from "@/lib/a2ui/registry"
import { createGeneratedCatalog } from "@/lib/a2ui/generated/catalog"
import {
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
  A2UICollapsible,
  A2UIFallback,
} from "./standard-components"
import {
  A2UIChartPie,
  A2UIChartRadar,
  A2UIChartLine,
  A2UIChartBar,
  A2UIChartRadialBar,
  A2UIChartWordCloud,
} from "./chart-components"

/**
 * Create and setup a registry with all standard components
 */
export function setupStandardRegistry(): A2UIRegistry {
  const registry = createRegistry()
  const catalog = createGeneratedCatalog()

  registry.setCatalog(catalog)
  registry.setFallback(A2UIFallback)

  // Register layout components
  registry.register("column", A2UIColumn, { source: "standard" })
  registry.register("row", A2UIRow, { source: "standard" })
  registry.register("container", A2UIContainer, { source: "standard" })
  registry.register("card", A2UICard, { source: "standard" })

  // Register content components
  registry.register("text", A2UIText, { source: "standard" })
  registry.register("image", A2UIImage, { source: "standard" })
  registry.register("icon", A2UIIcon, { source: "standard" })
  registry.register("divider", A2UIDivider, { source: "standard" })

  // Register interactive components
  registry.register("button", A2UIButton, { source: "standard" })
  registry.register("input", A2UIInput, { source: "standard" })
  registry.register("editable-text", A2UIEditableText, { source: "standard" })
  registry.register("textarea", A2UITextarea, { source: "standard" })
  registry.register("select", A2UISelect, { source: "standard" })
  registry.register("checkbox", A2UICheckbox, { source: "standard" })
  registry.register("tabs", A2UITabs, { source: "standard" })
  registry.register("collapsible", A2UICollapsible, { source: "standard" })

  // Register feedback components
  registry.register("badge", A2UIBadge, { source: "standard" })
  registry.register("progress", A2UIProgress, { source: "standard" })
  registry.register("modal", A2UIModal, { source: "standard" })
  registry.register("alert", A2UIAlert, { source: "standard" })

  // Register page & navigation components
  registry.register("page", A2UIPage, { source: "standard" })
  registry.register("nav", A2UINav, { source: "standard" })
  registry.register("nav-link", A2UINavLink, { source: "standard" })
  registry.register("spacer", A2UISpacer, { source: "standard" })
  registry.register("link", A2UILink, { source: "standard" })

  // Register form components
  registry.register("form", A2UIForm, { source: "standard" })
  registry.register("form-field", A2UIFormField, { source: "standard" })

  // Register chart components
  registry.register("chart-pie", A2UIChartPie, { source: "standard" })
  registry.register("chart-radar", A2UIChartRadar, { source: "standard" })
  registry.register("chart-line", A2UIChartLine, { source: "standard" })
  registry.register("chart-bar", A2UIChartBar, { source: "standard" })
  registry.register("chart-radial-bar", A2UIChartRadialBar, { source: "standard" })
  registry.register("chart-word-cloud", A2UIChartWordCloud, { source: "standard" })

  return registry
}

/**
 * Initialize the default registry with standard components
 * Call this once at app startup
 */
export function initializeA2UI(): A2UIRegistry {
  const registry = setupStandardRegistry()
  setDefaultRegistry(registry)
  return registry
}

/**
 * Get a pre-configured registry (creates new instance each time)
 */
export function getConfiguredRegistry(): A2UIRegistry {
  return setupStandardRegistry()
}
