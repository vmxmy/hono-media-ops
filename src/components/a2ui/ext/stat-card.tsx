"use client"

import type { A2UIBaseNode } from "@/lib/a2ui"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"

export interface A2UIStatCardNode extends A2UIBaseNode {
  type: "stat-card"
  label: string
  value: string | number
  change?: {
    value: number
    direction: "up" | "down"
  }
  icon?: string
}

export function A2UIStatCard({ node }: A2UIComponentProps<A2UIStatCardNode>) {
  return (
    <div
      className="rounded-lg border border-border bg-card p-4"
      style={node.style}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {node.label}
        </span>
        {node.icon && (
          <span className="text-lg text-muted-foreground">{node.icon}</span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-foreground">{node.value}</span>
        {node.change && (
          <span
            className={`text-sm font-medium ${
              node.change.direction === "up" ? "text-success" : "text-destructive"
            }`}
          >
            {node.change.direction === "up" ? "↑" : "↓"} {Math.abs(node.change.value)}%
          </span>
        )}
      </div>
    </div>
  )
}
