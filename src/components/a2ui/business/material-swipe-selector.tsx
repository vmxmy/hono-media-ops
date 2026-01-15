"use client"

import type { A2UIAction, A2UIBaseNode, A2UINode } from "@/lib/a2ui"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"
import { SwipeSelector } from "@/components/swipe-selector"

interface MaterialSwipeSelectorItem {
  id: string
  name: string
  subtitle?: string
  meta?: string
  previewUrl?: string
}

interface MaterialSwipeSelectorNode extends A2UIBaseNode {
  type: "material-swipe-selector"
  items: MaterialSwipeSelectorItem[]
  selectedId: string
  title: string
  action: A2UIAction
  emptyState?: A2UINode
  labels?: {
    swipeHint?: string
    noPreview?: string
  }
}

export function A2UIMaterialSwipeSelector({
  node,
  onAction,
  renderChildren,
}: A2UIComponentProps<MaterialSwipeSelectorNode>) {
  if (!node.items.length) {
    return node.emptyState ? <>{renderChildren?.(node.emptyState)}</> : null
  }

  return (
    <SwipeSelector
      items={node.items}
      selectedId={node.selectedId}
      onSelect={(id) => onAction?.(node.action.action, [id, ...(node.action.args ?? [])])}
      title={node.title}
      labels={node.labels}
      variant="record"
    />
  )
}
