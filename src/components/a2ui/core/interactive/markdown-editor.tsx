"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import { getCommands as getCommandsEn, getExtraCommands as getExtraCommandsEn } from "@uiw/react-md-editor/commands"
import { getCommands as getCommandsZh, getExtraCommands as getExtraCommandsZh } from "@uiw/react-md-editor/commands-cn"
import type { A2UIMarkdownEditorNode } from "@/lib/a2ui"
import { remarkPlugins, rehypePluginsNoRaw } from "@/lib/markdown"
import { useI18n } from "@/contexts/i18n-context"
import { compressImage, getCompressionSummary } from "@/lib/image/compress"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"

// Dynamic import for SSR compatibility
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false })

export function A2UIMarkdownEditor({ node, onAction }: A2UIComponentProps<A2UIMarkdownEditorNode>) {
  const { locale } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number>(400)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const scrollSyncLock = useRef<"textarea" | "preview" | null>(null)
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
      setUploadProgress(5)

      try {
        // Step 0: Compress image before upload (2MB max for WeChat compatibility)
        const compressionResult = await compressImage(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1920,
        })
        const fileToUpload = compressionResult.file

        if (compressionResult.wasCompressed) {
          console.log("Image compression:", getCompressionSummary(compressionResult))
        }

        setUploadProgress(15)

        // Get presigned URL from server
        const response = await fetch("/api/trpc/uploads.getPresignedUrl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            json: {
              filename: fileToUpload.name,
              contentType: fileToUpload.type,
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
          formData.append("file", fileToUpload)

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
            headers: { "Content-Type": fileToUpload.type },
            body: fileToUpload,
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

  // Scroll sync between textarea and preview
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let textarea: HTMLTextAreaElement | null = null
    let previewOuter: HTMLElement | null = null
    let cleanupFn: (() => void) | null = null

    const syncScroll = (source: HTMLElement, target: HTMLElement, sourceType: "textarea" | "preview") => {
      if (scrollSyncLock.current && scrollSyncLock.current !== sourceType) return

      scrollSyncLock.current = sourceType

      const sourceScrollHeight = source.scrollHeight - source.clientHeight
      const targetScrollHeight = target.scrollHeight - target.clientHeight

      if (sourceScrollHeight > 0 && targetScrollHeight > 0) {
        const ratio = source.scrollTop / sourceScrollHeight
        target.scrollTop = ratio * targetScrollHeight
      }

      requestAnimationFrame(() => {
        scrollSyncLock.current = null
      })
    }

    const setupListeners = () => {
      textarea = container.querySelector<HTMLTextAreaElement>(".w-md-editor-text-input")
      previewOuter = container.querySelector<HTMLElement>(".w-md-editor-preview")
      const editorArea = container.querySelector<HTMLElement>(".w-md-editor-area")
        ?? container.querySelector<HTMLElement>(".w-md-editor-input")

      if (!textarea || !previewOuter) return false

      const getEditorScrollElement = (): HTMLElement => {
        if (textarea && textarea.scrollHeight > textarea.clientHeight) return textarea
        if (editorArea && editorArea.scrollHeight > editorArea.clientHeight) return editorArea
        return textarea!
      }

      const handleTextareaScroll = () => {
        if (!previewOuter) return
        const source = getEditorScrollElement()
        const target = previewOuter.scrollHeight > previewOuter.clientHeight
          ? previewOuter
          : previewOuter.querySelector<HTMLElement>(".wmde-markdown") ?? previewOuter
        syncScroll(source, target, "textarea")
      }

      const handleContainerScroll = (e: Event) => {
        if (!previewOuter) return
        const target = e.target as HTMLElement
        const editorScrollEl = getEditorScrollElement()

        const isFromEditor = target === textarea || target === editorArea ||
          (editorArea && editorArea.contains(target)) ||
          (textarea && target.contains(textarea))

        if (isFromEditor) return

        if (previewOuter.contains(target) || target === previewOuter) {
          const source = target.scrollHeight > target.clientHeight ? target : previewOuter
          syncScroll(source, editorScrollEl, "preview")
        }
      }

      textarea.addEventListener("scroll", handleTextareaScroll, { passive: true })
      editorArea?.addEventListener("scroll", handleTextareaScroll, { passive: true })
      container.addEventListener("scroll", handleContainerScroll, { passive: true, capture: true })

      cleanupFn = () => {
        textarea?.removeEventListener("scroll", handleTextareaScroll)
        editorArea?.removeEventListener("scroll", handleTextareaScroll)
        container.removeEventListener("scroll", handleContainerScroll, { capture: true })
      }

      return true
    }

    // MDEditor is dynamically imported, wait for elements to be available
    const checkInterval = setInterval(() => {
      if (setupListeners()) {
        clearInterval(checkInterval)
      }
    }, 100)

    // Stop checking after 5 seconds
    const timeout = setTimeout(() => clearInterval(checkInterval), 5000)

    return () => {
      clearInterval(checkInterval)
      clearTimeout(timeout)
      cleanupFn?.()
    }
  }, [])

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
        className={`relative ${node.className ?? ""}`.trim()}
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
          previewOptions={{
            remarkPlugins,
            rehypePlugins: rehypePluginsNoRaw,
          }}
        />
      </div>
    )
  }

  return (
    <div
      data-color-mode="auto"
      className={`relative ${node.className ?? ""}`.trim()}
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
        previewOptions={{
          remarkPlugins,
          rehypePlugins: rehypePluginsNoRaw,
        }}
      />
    </div>
  )
}
