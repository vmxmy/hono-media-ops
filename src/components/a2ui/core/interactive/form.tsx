"use client"

import type { FormEvent } from "react"
import type { A2UIFormNode, A2UIFormFieldNode } from "@/lib/a2ui"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"

export function A2UIForm({ node, onAction, renderChildren }: A2UIComponentProps<A2UIFormNode>) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (node.onSubmit) {
      onAction(node.onSubmit.action, node.onSubmit.args)
    }
  }

  return (
    <form
      id={node.id}
      onSubmit={handleSubmit}
      autoComplete={node.autocomplete ?? "on"}
      className="space-y-4"
      style={node.style}
    >
      {node.children && renderChildren?.(node.children)}
    </form>
  )
}

export function A2UIFormField({ node, renderChildren }: A2UIComponentProps<A2UIFormFieldNode>) {
  return (
    <div className="space-y-2" style={node.style}>
      {node.label && (
        <label className="text-sm font-medium text-foreground">{node.label}</label>
      )}
      {node.children && renderChildren?.(node.children)}
      {node.error && (
        <p className="text-xs text-destructive">{node.error}</p>
      )}
    </div>
  )
}
