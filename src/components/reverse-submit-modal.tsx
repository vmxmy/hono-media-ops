"use client"

import { useState, useCallback } from "react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UINode, A2UIModalNode } from "@/lib/a2ui"

interface ReverseSubmitModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type InputType = "url" | "text"

export function ReverseSubmitModal({ isOpen, onClose, onSuccess }: ReverseSubmitModalProps) {
  const { t } = useI18n()
  const [inputType, setInputType] = useState<InputType>("url")
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = () => {
    setContent("")
    setError(null)
    setInputType("url")
    onClose()
  }

  const validateInput = (): string | null => {
    if (!content.trim()) {
      return inputType === "url" ? t("reverse.urlRequired") : t("reverse.textRequired")
    }
    if (inputType === "url") {
      try {
        new URL(content.trim())
      } catch {
        return t("reverse.invalidUrl")
      }
    }
    return null
  }

  const handleSubmit = async () => {
    const validationError = validateInput()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/reverse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: inputType,
          content: content.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error("Request failed")
      }

      onSuccess()
      handleClose()
    } catch {
      setError(t("reverse.submitError"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAction = useCallback(
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "setInputType":
          setInputType(args?.[0] as InputType)
          setContent("")
          setError(null)
          break
        case "setContent":
          setContent(args?.[0] as string)
          break
        case "submit":
          handleSubmit()
          break
        case "close":
          handleClose()
          break
      }
    },
    [content, inputType, handleSubmit, handleClose]
  )

  // Build form content
  const formChildren: A2UINode[] = [
    // Input type toggle buttons
    {
      type: "row",
      gap: "0.5rem",
      children: [
        {
          type: "button",
          text: t("reverse.typeUrl"),
          variant: inputType === "url" ? "primary" : "secondary",
          size: "sm",
          onClick: { action: "setInputType", args: ["url"] },
        },
        {
          type: "button",
          text: t("reverse.typeText"),
          variant: inputType === "text" ? "primary" : "secondary",
          size: "sm",
          onClick: { action: "setInputType", args: ["text"] },
        },
      ],
    },
    // Textarea for content
    {
      type: "textarea",
      id: "content",
      value: content,
      rows: 6,
      placeholder: t("reverse.contentPlaceholder"),
      onChange: { action: "setContent" },
    },
  ]

  // Add error if exists
  if (error) {
    formChildren.push({
      type: "alert",
      message: error,
      variant: "error",
    })
  }

  // Modal footer buttons
  const footerChildren: A2UINode[] = [
    {
      type: "button",
      text: t("common.cancel"),
      variant: "secondary",
      onClick: { action: "close" },
    },
    {
      type: "button",
      text: isSubmitting ? t("reverse.submitting") : t("reverse.submit"),
      variant: "primary",
      disabled: isSubmitting || !content.trim(),
      onClick: { action: "submit" },
    },
  ]

  const modalNode: A2UIModalNode = {
    type: "modal",
    open: isOpen,
    title: t("reverse.newAnalysis"),
    onClose: { action: "close" },
    children: [
      {
        type: "column",
        gap: "1rem",
        children: [
          { type: "text", text: t("reverse.description"), color: "muted" },
          { type: "form", onSubmit: { action: "submit" }, children: formChildren },
          {
            type: "row",
            gap: "0.5rem",
            justify: "end",
            children: footerChildren,
          },
        ],
      },
    ],
  }

  if (!isOpen) return null

  return <A2UIRenderer node={modalNode} onAction={handleAction} />
}
