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
  return registry
}

/**
 * Get a pre-configured registry (creates new instance each time)
 */
export function getConfiguredRegistry(): A2UIRegistry {
  return setupStandardRegistry()
}
