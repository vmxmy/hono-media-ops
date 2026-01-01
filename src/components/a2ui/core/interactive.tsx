"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import type { ChangeEvent, FormEvent, KeyboardEvent, MouseEvent } from "react"
import dynamic from "next/dynamic"
import { getCommands as getCommandsEn, getExtraCommands as getExtraCommandsEn } from "@uiw/react-md-editor/commands"
import { getCommands as getCommandsZh, getExtraCommands as getExtraCommandsZh } from "@uiw/react-md-editor/commands-cn"
import type {
  A2UIButtonNode,
  A2UIInputNode,
  A2UIEditableTextNode,
  A2UITextareaNode,
  A2UIMarkdownEditorNode,
  A2UISelectNode,
  A2UICheckboxNode,
  A2UITabsNode,
  A2UIFormNode,
  A2UIFormFieldNode,
  A2UICollapsibleNode,
} from "@/lib/a2ui"
import { useI18n } from "@/contexts/i18n-context"

// Dynamic import for SSR compatibility
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false })
import type { A2UIComponentProps } from "@/lib/a2ui/registry"

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function A2UIButton({ node, onAction }: A2UIComponentProps<A2UIButtonNode>) {
  const handleClick = (e: MouseEvent) => {
    if (node.onClick?.stopPropagation) {
      e.stopPropagation()
    }
    if (node.onClick) {
      onAction(node.onClick.action, node.onClick.args)
    }
  }

  const variantClasses = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    text: "text-primary hover:underline",
    outline: "border border-border bg-background hover:bg-accent",
  }

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  }

  const variant = node.variant ?? "primary"
  const size = node.size ?? "md"

  const renderIcon = () => {
    if (!node.icon) return null
    switch (node.icon) {
      case "google":
        return <GoogleIcon />
      case "github":
        return <GitHubIcon />
      default:
        return null
    }
  }

  return (
    <button
      type={node.buttonType ?? "button"}
      onClick={handleClick}
      disabled={node.disabled}
      className={`flex items-center justify-center gap-3 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${node.fullWidth ? "w-full" : ""}`}
      style={node.style}
    >
      {renderIcon()}
      {node.text}
    </button>
  )
}

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

export function A2UIMarkdownEditor({ node, onAction }: A2UIComponentProps<A2UIMarkdownEditorNode>) {
  const { locale } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number>(400)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const toolbarCommands = useMemo(() => {
    if (locale === "zh-CN") {
      return {
        commands: getCommandsZh(),
        extraCommands: getExtraCommandsZh(),
      }
    }
    return {
      commands: getCommandsEn(),
      extraCommands: getExtraCommandsEn(),
    }
  }, [locale])

  const handleChange = useCallback(
    (value?: string) => {
      if (node.onChange) {
        onAction(node.onChange.action, [value ?? "", ...(node.onChange.args ?? [])])
      }
    },
    [node.onChange, onAction]
  )

  // Get textarea element from MDEditor container
  const getTextarea = useCallback((): HTMLTextAreaElement | null => {
    return containerRef.current?.querySelector("textarea") ?? null
  }, [])

  // Image upload handler with cursor position support
  const uploadImage = useCallback(
    async (file: File, cursorPosition?: number) => {
      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
      if (!allowedTypes.includes(file.type)) {
        console.warn("Unsupported file type:", file.type)
        return
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        console.warn("File too large:", file.size)
        return
      }

      setIsUploading(true)
      setUploadProgress(10)

      try {
        // Get presigned URL from server
        const response = await fetch("/api/trpc/uploads.getPresignedUrl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            json: {
              filename: file.name,
              contentType: file.type,
              folder: "uploads/markdown-images",
            },
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to get upload URL")
        }

        const data = await response.json() as { result: { data: { json: { uploadUrl: string; publicUrl: string } } } }
        const { uploadUrl, publicUrl } = data.result.data.json

        setUploadProgress(30)

        // Check if local upload (URL starts with /)
        if (uploadUrl.startsWith("/")) {
          const formData = new FormData()
          formData.append("file", file)

          const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            body: formData,
          })

          if (!uploadResponse.ok) {
            throw new Error("Local upload failed")
          }
        } else {
          // Direct upload to cloud storage
          const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          })

          if (!uploadResponse.ok) {
            throw new Error("Cloud upload failed")
          }
        }

        setUploadProgress(90)

        // Insert markdown image at cursor position
        const markdownImage = `![${file.name}](${publicUrl})`
        const currentValue = node.value ?? ""

        let newValue: string
        if (cursorPosition !== undefined && cursorPosition >= 0) {
          // Insert at cursor position
          const before = currentValue.slice(0, cursorPosition)
          const after = currentValue.slice(cursorPosition)
          newValue = `${before}${markdownImage}${after}`
        } else {
          // Fallback: append at end
          newValue = currentValue ? `${currentValue}\n\n${markdownImage}` : markdownImage
        }
        handleChange(newValue)

        setUploadProgress(100)
      } catch (error) {
        console.error("Upload failed:", error)
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
      }
    },
    [node.value, handleChange]
  )

  // Handle paste event for images
  const handlePaste = useCallback(
    async (event: React.ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          event.preventDefault()
          const file = item.getAsFile()
          if (file) {
            // Get cursor position from textarea
            const textarea = getTextarea()
            const cursorPosition = textarea?.selectionStart
            await uploadImage(file, cursorPosition)
          }
          break
        }
      }
    },
    [uploadImage, getTextarea]
  )

  // Handle drop event for images
  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      const files = event.dataTransfer?.files
      if (!files || files.length === 0) return

      for (const file of files) {
        if (file.type.startsWith("image/")) {
          event.preventDefault()
          // Get cursor position from textarea
          const textarea = getTextarea()
          const cursorPosition = textarea?.selectionStart
          await uploadImage(file, cursorPosition)
          break
        }
      }
    },
    [uploadImage, getTextarea]
  )

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
  }, [])

  // 支持 height: "100%" 自适应或固定数值
  const useFullHeight = node.height === "100%" || node.style?.flex === 1

  useEffect(() => {
    if (!useFullHeight || !containerRef.current) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setHeight(entry.contentRect.height)
      }
    })

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [useFullHeight])

  // Upload overlay component
  const UploadOverlay = () =>
    isUploading ? (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <span className="text-sm text-muted-foreground">Uploading... {uploadProgress}%</span>
        </div>
      </div>
    ) : null

  if (useFullHeight) {
    return (
      <div
        ref={containerRef}
        data-color-mode="auto"
        className="relative"
        style={{
          ...node.style,
          display: "flex",
          flexDirection: "column",
        }}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <UploadOverlay />
        <MDEditor
          value={node.value ?? ""}
          onChange={handleChange}
          height={height}
          preview={node.preview ?? "edit"}
          hideToolbar={node.hideToolbar}
          commands={toolbarCommands.commands}
          extraCommands={toolbarCommands.extraCommands}
          visibleDragbar={false}
        />
      </div>
    )
  }

  return (
    <div
      data-color-mode="auto"
      className="relative"
      style={node.style}
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <UploadOverlay />
      <MDEditor
        value={node.value ?? ""}
        onChange={handleChange}
        height={(node.height as number) ?? 400}
        preview={node.preview ?? "edit"}
        hideToolbar={node.hideToolbar}
        commands={toolbarCommands.commands}
        extraCommands={toolbarCommands.extraCommands}
        visibleDragbar={false}
      />
    </div>
  )
}

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
