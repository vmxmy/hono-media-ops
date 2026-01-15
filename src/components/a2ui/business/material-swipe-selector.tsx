"use client"

import type { A2UIComponentProps } from "@/lib/a2ui/registry"
import { SwipeSelector } from "@/components/swipe-selector"
import type { ReactNode } from "react"

interface MaterialSwipeSelectorItem {
  id: string
  name: string
  subtitle?: string
  meta?: string
  previewUrl?: string
}

interface MaterialSwipeSelectorNode {
  type: "material-swipe-selector"
  items: MaterialSwipeSelectorItem[]
  selectedId: string
  title: string
  action: string
  emptyState?: ReactNode
  labels?: {
    swipeHint?: string
    noPreview?: string
  }
}

export function A2UIMaterialSwipeSelector({
  node,
  onAction,
}: A2UIComponentProps<MaterialSwipeSelectorNode>) {
  if (!node.items.length) {
    return node.emptyState ? <>{node.emptyState}</> : null
  }

  return (
    <SwipeSelector
      items={node.items}
      selectedId={node.selectedId}
      onSelect={(id) => onAction?.(node.action, [id])}
      title={node.title}
      labels={node.labels}
      variant="record"
    />
  )
}
