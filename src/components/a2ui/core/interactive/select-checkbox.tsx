"use client"

import type { ChangeEvent } from "react"
import type { A2UISelectNode, A2UICheckboxNode } from "@/lib/a2ui"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"

export function A2UISelect({ node, onAction }: A2UIComponentProps<A2UISelectNode>) {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (node.onChange) {
      onAction(node.onChange.action, [e.target.value, ...(node.onChange.args ?? [])])
    }
  }

  return (
    <select
      value={node.value ?? ""}
      onChange={handleChange}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      style={node.style}
    >
      {node.placeholder && (
        <option value="" disabled>
          {node.placeholder}
        </option>
      )}
      {node.options?.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export function A2UICheckbox({ node, onAction }: A2UIComponentProps<A2UICheckboxNode>) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (node.onChange) {
      onAction(node.onChange.action, [e.target.checked, ...(node.onChange.args ?? [])])
    }
  }

  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={node.checked ?? false}
        onChange={handleChange}
        className="h-4 w-4 rounded border border-border text-primary focus:ring-2 focus:ring-ring"
        style={node.style}
      />
      {node.label && <span className="text-sm text-foreground">{node.label}</span>}
    </label>
  )
}
