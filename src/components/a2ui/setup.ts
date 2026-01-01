// A2UI Setup - Registers standard components to the registry
import { createRegistry, setDefaultRegistry, type A2UIRegistry } from "@/lib/a2ui/registry"
import type { A2UIComponent } from "@/lib/a2ui/registry"
import { createGeneratedCatalog } from "@/lib/a2ui/generated/catalog"
import { CoreComponents, A2UIFallback } from "./core"
import { ChartComponents } from "./charts"
import { ExtComponents } from "./ext"
import { BusinessComponents } from "./business"

function registerComponentMap(
  registry: A2UIRegistry,
  components: Record<string, A2UIComponent<any>>,
  options: { priority?: number; source?: "standard" | "custom" } = { source: "standard" }
) {
  Object.entries(components).forEach(([type, component]) => {
    registry.register(type, component as A2UIComponent, options)
  })
}

/**
 * Validate registry coverage in development mode
 * Logs warnings if components are missing from registry or not in catalog
 */
function validateRegistryInDev(registry: A2UIRegistry): void {
  if (process.env.NODE_ENV !== "development") return

  const { missing, extra } = registry.validateCatalogCoverage()

  if (missing.length > 0) {
    console.warn(
      `[A2UI] Missing component implementations for catalog types:\n` +
      missing.map((t) => `  - ${t}`).join("\n")
    )
  }

  if (extra.length > 0) {
    console.warn(
      `[A2UI] Components registered but not in catalog (consider adding to schema):\n` +
      extra.map((t) => `  - ${t}`).join("\n")
    )
  }

  if (missing.length === 0 && extra.length === 0) {
    console.log(`[A2UI] Registry validation passed: ${registry.getRegisteredTypes().length} components`)
  }
}

/**
 * Create and setup a registry with all standard components
 */
export function setupStandardRegistry(): A2UIRegistry {
  const registry = createRegistry()
  const catalog = createGeneratedCatalog()

  registry.setCatalog(catalog)
  registry.setFallback(A2UIFallback)

  registerComponentMap(registry, CoreComponents, { source: "standard" })
  registerComponentMap(registry, ChartComponents, { source: "standard" })
  registerComponentMap(registry, ExtComponents, { source: "custom", priority: 10 })

  return registry
}

export function registerBusinessComponents(registry: A2UIRegistry): void {
  registerComponentMap(registry, BusinessComponents, { source: "custom", priority: 10 })
}

/**
 * Initialize the default registry with standard components
 * Call this once at app startup
 */
export function initializeA2UI(): A2UIRegistry {
  const registry = setupStandardRegistry()
  registerBusinessComponents(registry)
  setDefaultRegistry(registry)

  // Validate in development
  validateRegistryInDev(registry)

  return registry
}

/**
 * Get a pre-configured registry (creates new instance each time)
 */
export function getConfiguredRegistry(): A2UIRegistry {
  return setupStandardRegistry()
}
