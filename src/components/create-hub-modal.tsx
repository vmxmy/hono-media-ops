"use client"

import { useState, useCallback, useEffect } from "react"
import { useI18n } from "@/contexts/i18n-context"
import { api } from "@/trpc/react"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UINode, A2UIModalNode } from "@/lib/a2ui"

type HubStep = "choose" | "import" | "import-success"
type InputType = "url" | "text"

interface CreateHubModalProps {
  isOpen: boolean
  onClose: () => void
  onStartWriting: (materialId?: string) => void
  onGenerateXhsImages?: () => void
}

interface StyleIdentityData {
  style_name?: string
  archetype?: string
}

export function CreateHubModal({
  isOpen,
  onClose,
  onStartWriting,
  onGenerateXhsImages,
}: CreateHubModalProps) {
  const { t } = useI18n()
  const [step, setStep] = useState<HubStep>("choose")
  const [inputType, setInputType] = useState<InputType>("url")
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importedMaterialId, setImportedMaterialId] = useState<string | null>(null)

  // Fetch recent materials
  const { data: materialsData } = api.reverseLogs.getAll.useQuery(
    { page: 1, pageSize: 5 },
    { enabled: isOpen && step === "choose" }
  )

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("choose")
      setInputType("url")
      setContent("")
      setError(null)
      setImportedMaterialId(null)
    }
  }, [isOpen])

  const handleClose = useCallback(() => {
    setStep("choose")
    setContent("")
    setError(null)
    setImportedMaterialId(null)
    onClose()
  }, [onClose])

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

  const handleSubmitImport = async () => {
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: inputType,
          content: content.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error("Request failed")
      }

      const result = await response.json()
      setImportedMaterialId(result.id ?? null)
      setStep("import-success")
      setContent("")
    } catch {
      setError(t("reverse.submitError"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAction = useCallback(
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "close":
          handleClose()
          break
        case "goToImport":
          setStep("import")
          setError(null)
          break
        case "goToChoose":
          setStep("choose")
          setError(null)
          break
        case "startWriting":
          handleClose()
          onStartWriting()
          break
        case "startWritingWithMaterial":
          handleClose()
          onStartWriting(args?.[0] as string)
          break
        case "generateXhsImages":
          handleClose()
          onGenerateXhsImages?.()
          break
        case "useImportedMaterial":
          handleClose()
          onStartWriting(importedMaterialId ?? undefined)
          break
        case "continueImport":
          setStep("import")
          setContent("")
          setError(null)
          break
        case "setInputType":
          setInputType(args?.[0] as InputType)
          setContent("")
          setError(null)
          break
        case "setContent":
          setContent(args?.[0] as string)
          break
        case "submitImport":
          handleSubmitImport()
          break
      }
    },
    [handleClose, onStartWriting, onGenerateXhsImages, importedMaterialId, inputType, content]
  )

  // Build choose step content
  const buildChooseContent = (): A2UINode => {
    const recentMaterials = materialsData?.logs ?? []

    const actionCards: A2UINode[] = [
      // Import Material card
      {
        type: "card",
        hoverable: true,
        onClick: { action: "goToImport" },
        className: "flex-1 min-w-[140px] cursor-pointer",
        children: [
          {
            type: "column",
            gap: "0.5rem",
            className: "py-4 px-2 text-center items-center",
            children: [
              {
                type: "text",
                text: "📥",
                className: "text-[2rem]",
              },
              {
                type: "text",
                text: t("createHub.importMaterial"),
                weight: "semibold",
              },
              {
                type: "text",
                text: t("createHub.importMaterialDesc"),
                variant: "caption",
                color: "muted",
              },
            ],
          },
        ],
      },
      // Start Writing card
      {
        type: "card",
        hoverable: true,
        onClick: { action: "startWriting" },
        className: "flex-1 min-w-[140px] cursor-pointer",
        children: [
          {
            type: "column",
            gap: "0.5rem",
            className: "py-4 px-2 text-center items-center",
            children: [
              {
                type: "text",
                text: "✏️",
                className: "text-[2rem]",
              },
              {
                type: "text",
                text: t("createHub.startWriting"),
                weight: "semibold",
              },
              {
                type: "text",
                text: t("createHub.startWritingDesc"),
                variant: "caption",
                color: "muted",
              },
            ],
          },
        ],
      },
      // Generate XHS Images card
      ...(onGenerateXhsImages
        ? [
            {
              type: "card" as const,
              hoverable: true,
              onClick: { action: "generateXhsImages" },
              className: "flex-1 min-w-[140px] cursor-pointer",
              children: [
                {
                  type: "column" as const,
                  gap: "0.5rem",
                  className: "py-4 px-2 text-center items-center",
                  children: [
                    {
                      type: "text" as const,
                      text: "📷",
                      className: "text-[2rem]",
                    },
                    {
                      type: "text" as const,
                      text: t("createHub.generateXhsImages"),
                      weight: "semibold" as const,
                    },
                    {
                      type: "text" as const,
                      text: t("createHub.generateXhsImagesDesc"),
                      variant: "caption" as const,
                      color: "muted" as const,
                    },
                  ],
                },
              ],
            },
          ]
        : []),
    ]

    const children: A2UINode[] = [
      {
        type: "text",
        text: t("createHub.whatToDo"),
        variant: "h3",
        weight: "semibold",
        className: "mb-2",
      },
      {
        type: "row",
        gap: "1rem",
        wrap: true,
        children: actionCards,
      },
    ]

    // Add recent materials section
    if (recentMaterials.length > 0) {
      children.push({
        type: "divider",
        className: "my-4",
      })
      children.push({
        type: "text",
        text: t("createHub.recentMaterials"),
        variant: "body",
        weight: "medium",
        color: "muted",
        className: "mb-2",
      })
      children.push({
        type: "column",
        gap: "0.5rem",
        children: recentMaterials.slice(0, 3).map((material) => {
          const styleIdentity = material.styleIdentity as StyleIdentityData | null
          const title = material.sourceTitle || styleIdentity?.style_name || t("reverse.untitled")
          const archetype = styleIdentity?.archetype

          return {
            type: "card",
            hoverable: true,
            onClick: { action: "startWritingWithMaterial", args: [material.id] },
            className: "cursor-pointer p-3",
            children: [
              {
                type: "row",
                gap: "0.75rem",
                align: "center",
                children: [
                  {
                    type: "column",
                    gap: "0.25rem",
                    className: "flex-1 min-w-0",
                    children: [
                      {
                        type: "text",
                        text: title,
                        weight: "medium",
                        className: "overflow-hidden text-ellipsis whitespace-nowrap",
                      },
                      ...(archetype
                        ? [
                            {
                              type: "badge" as const,
                              text: archetype,
                              color: "primary" as const,
                              size: "sm" as const,
                            },
                          ]
                        : []),
                    ],
                  },
                  {
                    type: "text",
                    text: "→",
                    color: "muted",
                  },
                ],
              },
            ],
          } as A2UINode
        }),
      })
    }

    return {
      type: "column",
      gap: "0.75rem",
      children,
    }
  }

  // Build import step content
  const buildImportContent = (): A2UINode => {
    const formChildren: A2UINode[] = [
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
      {
        type: "textarea",
        id: "content",
        value: content,
        rows: 6,
        placeholder: t("reverse.contentPlaceholder"),
        onChange: { action: "setContent" },
      },
    ]

    if (error) {
      formChildren.push({
        type: "alert",
        message: error,
        variant: "error",
      })
    }

    return {
      type: "column",
      gap: "1rem",
      children: [
        {
          type: "row",
          align: "center",
          gap: "0.5rem",
          children: [
            {
              type: "button",
              text: "←",
              variant: "secondary",
              size: "sm",
              onClick: { action: "goToChoose" },
            },
            {
              type: "text",
              text: t("createHub.importMaterial"),
              variant: "h3",
              weight: "semibold",
            },
          ],
        },
        {
          type: "text",
          text: t("reverse.description"),
          color: "muted",
        },
        {
          type: "form",
          onSubmit: { action: "submitImport" },
          children: formChildren,
        },
        {
          type: "row",
          gap: "0.5rem",
          justify: "end",
          children: [
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
              onClick: { action: "submitImport" },
            },
          ],
        },
      ],
    }
  }

  // Build import success step content
  const buildImportSuccessContent = (): A2UINode => {
    return {
      type: "column",
      gap: "1.5rem",
      className: "py-4 items-center",
      children: [
        {
          type: "text",
          text: "✅",
          className: "text-[3rem]",
        },
        {
          type: "text",
          text: t("createHub.importSuccess"),
          variant: "h3",
          weight: "semibold",
        },
        {
          type: "row",
          gap: "0.75rem",
          wrap: true,
          justify: "center",
          children: [
            {
              type: "button",
              text: t("createHub.continueImport"),
              variant: "secondary",
              onClick: { action: "continueImport" },
            },
            {
              type: "button",
              text: t("createHub.useThisMaterial"),
              variant: "primary",
              onClick: { action: "useImportedMaterial" },
            },
          ],
        },
      ],
    }
  }

  if (!isOpen) return null

  let contentNode: A2UINode
  switch (step) {
    case "import":
      contentNode = buildImportContent()
      break
    case "import-success":
      contentNode = buildImportSuccessContent()
      break
    default:
      contentNode = buildChooseContent()
  }

  const modalNode: A2UIModalNode = {
    type: "modal",
    open: isOpen,
    title: t("createHub.title"),
    onClose: { action: "close" },
    className: "max-w-[28rem]",
    children: [contentNode],
  }

  return <A2UIRenderer node={modalNode} onAction={handleAction} />
}
