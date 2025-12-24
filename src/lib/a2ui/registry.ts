// A2UI Component Registry
// Maps component types to React implementations

import type { ComponentType } from "react"
import type { A2UINode, A2UIActionHandler, A2UIBaseNode } from "./generated/types"
import type { A2UICatalog } from "./catalog"

/**
 * Props passed to every A2UI component
 * Uses A2UIBaseNode as constraint to allow custom node types
 */
export interface A2UIComponentProps<T extends A2UIBaseNode = A2UIBaseNode> {
  node: T
  onAction: A2UIActionHandler
  renderChildren?: (children: A2UINode | A2UINode[]) => React.ReactNode
}

/**
 * A2UI component type
 * Uses A2UIBaseNode as constraint to allow custom node types
 */
export type A2UIComponent<T extends A2UIBaseNode = A2UIBaseNode> = ComponentType<A2UIComponentProps<T>>

/**
 * Registry entry with metadata
 */
interface RegistryEntry {
  component: A2UIComponent
  priority: number // Higher priority overrides lower
  source: "standard" | "custom" | "override"
}

/**
 * Component Registry class
 */
export class A2UIRegistry {
  private components: Map<string, RegistryEntry> = new Map()
  private catalog: A2UICatalog | null = null
  private fallbackComponent: A2UIComponent | null = null

  /**
   * Set the catalog for validation
   */
  setCatalog(catalog: A2UICatalog): this {
    this.catalog = catalog
    return this
  }

  /**
   * Get the current catalog
   */
  getCatalog(): A2UICatalog | null {
    return this.catalog
  }

  /**
   * Set fallback component for unknown types
   */
  setFallback(component: A2UIComponent): this {
    this.fallbackComponent = component
    return this
  }

  /**
   * Register a component implementation
   */
  register<T extends A2UIBaseNode>(
    type: string,
    component: A2UIComponent<T>,
    options?: { priority?: number; source?: "standard" | "custom" }
  ): this {
    const priority = options?.priority ?? 0
    const source = options?.source ?? "standard"
    const existing = this.components.get(type)

    // Only override if new component has higher or equal priority
    if (!existing || priority >= existing.priority) {
      this.components.set(type, {
        component: component as A2UIComponent,
        priority,
        source,
      })
    }

    return this
  }

  /**
   * Override an existing component (highest priority)
   */
  override<T extends A2UIBaseNode>(type: string, component: A2UIComponent<T>): this {
    this.components.set(type, {
      component: component as A2UIComponent,
      priority: 100,
      source: "override",
    })
    return this
  }

  /**
   * Unregister a component
   */
  unregister(type: string): this {
    this.components.delete(type)
    return this
  }

  /**
   * Get a component by type
   */
  get(type: string): A2UIComponent | null {
    const entry = this.components.get(type)
    if (entry) return entry.component
    return this.fallbackComponent
  }

  /**
   * Check if a component type is registered
   */
  has(type: string): boolean {
    return this.components.has(type)
  }

  /**
   * Get all registered component types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.components.keys())
  }

  /**
   * Get registry info for debugging
   */
  getInfo(): Array<{ type: string; source: string; priority: number }> {
    return Array.from(this.components.entries()).map(([type, entry]) => ({
      type,
      source: entry.source,
      priority: entry.priority,
    }))
  }

  /**
   * Validate that all catalog components are registered
   */
  validateCatalogCoverage(): { missing: string[]; extra: string[] } {
    if (!this.catalog) {
      return { missing: [], extra: [] }
    }

    const catalogTypes = Array.from(this.catalog.components.keys())
    const registeredTypes = this.getRegisteredTypes()

    const missing = catalogTypes.filter((type) => !this.has(type))
    const extra = registeredTypes.filter(
      (type) => !this.catalog!.components.has(type)
    )

    return { missing, extra }
  }

  /**
   * Clone the registry
   */
  clone(): A2UIRegistry {
    const cloned = new A2UIRegistry()
    if (this.catalog) cloned.setCatalog(this.catalog)
    if (this.fallbackComponent) cloned.setFallback(this.fallbackComponent)

    for (const [type, entry] of this.components) {
      cloned.components.set(type, { ...entry })
    }

    return cloned
  }
}

/**
 * Create a new registry
 */
export function createRegistry(): A2UIRegistry {
  return new A2UIRegistry()
}

/**
 * Global default registry instance
 */
let defaultRegistry: A2UIRegistry | null = null

/**
 * Get the default registry (creates one if not exists)
 */
export function getDefaultRegistry(): A2UIRegistry {
  if (!defaultRegistry) {
    defaultRegistry = createRegistry()
  }
  return defaultRegistry
}

/**
 * Set the default registry
 */
export function setDefaultRegistry(registry: A2UIRegistry): void {
  defaultRegistry = registry
}

/**
 * Register a component to the default registry
 */
export function registerComponent<T extends A2UIBaseNode>(
  type: string,
  component: A2UIComponent<T>,
  options?: { priority?: number; source?: "standard" | "custom" }
): void {
  getDefaultRegistry().register(type, component, options)
}

/**
 * Override a component in the default registry
 */
export function overrideComponent<T extends A2UIBaseNode>(
  type: string,
  component: A2UIComponent<T>
): void {
  getDefaultRegistry().override(type, component)
}
