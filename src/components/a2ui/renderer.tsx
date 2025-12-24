"use client"

import { createContext, useContext, useCallback, useMemo } from "react"
import type { A2UINode, A2UIActionHandler } from "@/lib/a2ui"
import { type A2UIRegistry, getDefaultRegistry } from "@/lib/a2ui/registry"
import { initializeA2UI } from "./setup"

// Initialize registry on first import
let initialized = false
function ensureInitialized(): A2UIRegistry {
  if (!initialized) {
    initializeA2UI()
    initialized = true
  }
  return getDefaultRegistry()
}

// ============================================================================
// Context
// ============================================================================

interface A2UIContextValue {
  onAction: A2UIActionHandler
  registry: A2UIRegistry
}

const A2UIContext = createContext<A2UIContextValue | null>(null)

export function useA2UIContext() {
  const context = useContext(A2UIContext)
  if (!context) {
    throw new Error("useA2UIContext must be used within A2UIRenderer")
  }
  return context
}

export function useA2UIAction() {
  return useA2UIContext().onAction
}

export function useA2UIRegistry() {
  return useA2UIContext().registry
}

// ============================================================================
// Main Renderer
// ============================================================================

interface A2UIRendererProps {
  node: A2UINode | A2UINode[]
  onAction?: A2UIActionHandler
  registry?: A2UIRegistry
  className?: string
}

export function A2UIRenderer({
  node,
  onAction,
  registry: customRegistry,
  className,
}: A2UIRendererProps) {
  // Ensure default registry is initialized
  const defaultRegistry = useMemo(() => ensureInitialized(), [])
  const registry = customRegistry ?? defaultRegistry

  const handleAction = useCallback<A2UIActionHandler>(
    (action, args) => {
      onAction?.(action, args)
    },
    [onAction]
  )

  const contextValue = useMemo<A2UIContextValue>(
    () => ({
      onAction: handleAction,
      registry,
    }),
    [handleAction, registry]
  )

  return (
    <A2UIContext.Provider value={contextValue}>
      <div className={className}>
        <A2UINodeRenderer node={node} />
      </div>
    </A2UIContext.Provider>
  )
}

// ============================================================================
// Node Renderer
// ============================================================================

interface A2UINodeRendererProps {
  node: A2UINode | A2UINode[]
}

function A2UINodeRenderer({ node }: A2UINodeRendererProps) {
  const { registry, onAction } = useA2UIContext()

  // Render array of nodes
  if (Array.isArray(node)) {
    return (
      <>
        {node.map((n, i) => (
          <A2UINodeRenderer key={n.id ?? i} node={n} />
        ))}
      </>
    )
  }

  // Get component from registry
  const Component = registry.get(node.type)

  if (!Component) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`A2UI: No component registered for type "${node.type}"`)
    }
    return null
  }

  // Render children helper
  const renderChildren = (children: A2UINode | A2UINode[]) => (
    <A2UINodeRenderer node={children} />
  )

  return (
    <Component
      node={node}
      onAction={onAction}
      renderChildren={renderChildren}
    />
  )
}

// ============================================================================
// Provider for Custom Registry
// ============================================================================

interface A2UIProviderProps {
  registry: A2UIRegistry
  onAction?: A2UIActionHandler
  children: React.ReactNode
}

export function A2UIProvider({ registry, onAction, children }: A2UIProviderProps) {
  const handleAction = useCallback<A2UIActionHandler>(
    (action, args) => {
      onAction?.(action, args)
    },
    [onAction]
  )

  const contextValue = useMemo<A2UIContextValue>(
    () => ({
      onAction: handleAction,
      registry,
    }),
    [handleAction, registry]
  )

  return (
    <A2UIContext.Provider value={contextValue}>
      {children}
    </A2UIContext.Provider>
  )
}

// ============================================================================
// Standalone Node Renderer (uses context)
// ============================================================================

export function A2UIRender({ node }: { node: A2UINode | A2UINode[] }) {
  return <A2UINodeRenderer node={node} />
}
