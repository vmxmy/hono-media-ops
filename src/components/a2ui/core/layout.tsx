"use client"

import type { CSSProperties } from "react"
import type {
  A2UIColumnNode,
  A2UIRowNode,
  A2UIContainerNode,
  A2UIScrollAreaNode,
  A2UICardNode,
  A2UIPageNode,
  A2UINavNode,
  A2UINavLinkNode,
  A2UISpacerNode,
} from "@/lib/a2ui"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"

export function A2UIColumn({ node, renderChildren }: A2UIComponentProps<A2UIColumnNode>) {
  const style: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: node.gap ?? "0.5rem",
    ...node.style,
  }

  return (
    <div style={style} className={node.className}>
      {node.children && renderChildren?.(node.children)}
    </div>
  )
}

export function A2UIRow({ node, renderChildren }: A2UIComponentProps<A2UIRowNode>) {
  const alignMap = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
    stretch: "stretch",
  }

  const justifyMap = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
    between: "space-between",
    around: "space-around",
  }

  const style: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    gap: node.gap ?? "0.5rem",
    alignItems: node.align ? alignMap[node.align] : undefined,
    justifyContent: node.justify ? justifyMap[node.justify] : undefined,
    flexWrap: node.wrap ? "wrap" : undefined,
    ...node.style,
  }

  const className = `${node.responsive ? "a2ui-row-responsive" : ""} ${node.className || ""}`.trim()

  return (
    <div style={style} className={className}>
      {node.children && renderChildren?.(node.children)}
    </div>
  )
}

export function A2UIContainer({ node, renderChildren }: A2UIComponentProps<A2UIContainerNode>) {
  return (
    <div style={node.style} className={node.className}>
      {node.children && renderChildren?.(node.children)}
    </div>
  )
}

export function A2UIScrollArea({ node, renderChildren }: A2UIComponentProps<A2UIScrollAreaNode>) {
  const orientation = node.orientation ?? "vertical"
  const overflowStyle: CSSProperties = {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    overflowY: orientation === "horizontal" ? "hidden" : "auto",
    overflowX: orientation === "vertical" ? "hidden" : "auto",
    ...node.style,
  }

  return (
    <div className="a2ui-scroll-area" style={overflowStyle}>
      {node.children && renderChildren?.(node.children)}
    </div>
  )
}

export function A2UICard({ node, onAction, renderChildren }: A2UIComponentProps<A2UICardNode>) {
  const handleClick = node.onClick
    ? () => onAction(node.onClick!.action, node.onClick!.args)
    : undefined

  const className = `rounded-lg border border-border bg-card p-3 shadow-sm transition-colors md:p-4 ${
    node.hoverable !== false ? "hover:bg-card/80" : ""
  } ${handleClick ? "cursor-pointer" : ""} ${node.className || ""}`.trim()

  return (
    <div
      className={className}
      style={node.style}
      onClick={handleClick}
    >
      {node.children && renderChildren?.(node.children)}
    </div>
  )
}

export function A2UIPage({ node, renderChildren }: A2UIComponentProps<A2UIPageNode>) {
  return (
    <div className="min-h-screen bg-background text-foreground" style={node.style}>
      {node.children && renderChildren?.(node.children)}
    </div>
  )
}

export function A2UINav({ node, renderChildren }: A2UIComponentProps<A2UINavNode>) {
  return (
    <nav className="space-y-1" style={node.style}>
      {node.children && renderChildren?.(node.children)}
    </nav>
  )
}

export function A2UINavLink({ node, onAction }: A2UIComponentProps<A2UINavLinkNode>) {
  const handleClick = () => {
    if (node.onClick) {
      onAction(node.onClick.action, node.onClick.args)
    }
  }

  const activeClasses = node.active
    ? "bg-accent text-accent-foreground"
    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"

  return (
    <button
      onClick={handleClick}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${activeClasses}`}
      style={node.style}
    >
      {node.icon && <span className="text-base">{node.icon}</span>}
      <span>{node.label}</span>
    </button>
  )
}

export function A2UISpacer({ node }: A2UIComponentProps<A2UISpacerNode>) {
  return <div style={{ flex: node.flex ? 1 : undefined, width: node.size, height: node.size }} />
}
