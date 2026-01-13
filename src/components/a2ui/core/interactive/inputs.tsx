"use client"

import { useState, useRef, useEffect } from "react"
import type { ChangeEvent, KeyboardEvent } from "react"
import type {
  A2UIInputNode,
  A2UIEditableTextNode,
  A2UITextareaNode,
} from "@/lib/a2ui"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"

export function A2UIInput({ node, onAction }: A2UIComponentProps<A2UIInputNode>) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (node.onChange) {
      onAction(node.onChange.action, [e.target.value, ...(node.onChange.args ?? [])])
    }
  }

  return (
    <input
      id={node.id}
      name={node.name}
      type={node.inputType ?? "text"}
      value={node.value ?? ""}
      onChange={handleChange}
      placeholder={node.placeholder}
      autoComplete={node.autocomplete}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      style={node.style}
    />
  )
}

export function A2UIEditableText({ node, onAction }: A2UIComponentProps<A2UIEditableTextNode>) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(node.value)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const editable = node.editable !== false

  useEffect(() => {
    if (!isEditing) {
      setEditValue(node.value)
    }
  }, [node.value, isEditing])

  useEffect(() => {
    if (isEditing) {
      if (node.multiline && textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.select()
      } else if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.select()
      }
    }
  }, [isEditing, node.multiline])

  const handleSave = () => {
    if (editValue !== node.value && node.onChange) {
      onAction(node.onChange.action, [editValue, ...(node.onChange.args ?? [])])
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(node.value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel()
    } else if (e.key === "Enter" && !node.multiline) {
      handleSave()
    }
  }

  const variantClasses: Record<string, string> = {
    h1: "text-3xl font-bold",
    h2: "text-2xl font-semibold",
    h3: "text-xl font-semibold",
    h4: "text-lg font-semibold",
    body: "text-base",
    caption: "text-sm text-muted-foreground",
  }
  const variantClass = variantClasses[node.variant ?? "body"] ?? variantClasses.body

  if (isEditing) {
    if (node.multiline) {
      return (
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={node.placeholder}
          rows={3}
          className={`w-full rounded border border-primary bg-background px-2 py-1 outline-none ring-2 ring-primary/20 ${variantClass}`}
          style={node.style}
        />
      )
    }

    return (
      <input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={node.placeholder}
        className={`w-full rounded border border-primary bg-background px-2 py-1 outline-none ring-2 ring-primary/20 ${variantClass}`}
        style={node.style}
      />
    )
  }

  return (
    <div
      onClick={() => editable && setIsEditing(true)}
      className={`cursor-text ${variantClass} ${editable ? "hover:bg-muted/30" : ""}`}
      style={node.style}
    >
      {node.value || node.placeholder}
    </div>
  )
}

export function A2UITextarea({ node, onAction }: A2UIComponentProps<A2UITextareaNode>) {
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (node.onChange) {
      onAction(node.onChange.action, [e.target.value, ...(node.onChange.args ?? [])])
    }
  }

  return (
    <textarea
      value={node.value ?? ""}
      onChange={handleChange}
      placeholder={node.placeholder}
      rows={node.rows ?? 4}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      style={node.style}
    />
  )
}
