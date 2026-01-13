"use client"

import { useState } from "react"
import type { A2UITabsNode, A2UICollapsibleNode } from "@/lib/a2ui"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"

export function A2UITabs({ node, renderChildren }: A2UIComponentProps<A2UITabsNode>) {
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <div style={node.style}>
      <div className="flex border-b border-border">
        {node.tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              activeIndex === index
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-3">
        {renderChildren?.(node.tabs[activeIndex]!.content)}
      </div>
    </div>
  )
}

export function A2UICollapsible({ node, renderChildren }: A2UIComponentProps<A2UICollapsibleNode>) {
  const [isOpen, setIsOpen] = useState(node.defaultOpen ?? false)

  return (
    <div style={node.style}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-medium text-foreground">{node.title}</span>
        <span className="text-xs text-muted-foreground">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && (
        <div className="mt-2">{node.children && renderChildren?.(node.children)}</div>
      )}
    </div>
  )
}
