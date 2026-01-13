"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useI18n } from "@/contexts/i18n-context"
import { api } from "@/trpc/react"
import { A2UIRenderer, a2uiToast } from "@/components/a2ui"
import type { A2UINode, A2UIModalNode } from "@/lib/a2ui"

interface CreateXhsImageModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ImagePromptData {
  id: string
  title: string
  prompt: string
  category: string | null
  previewUrl: string | null
}

export function CreateXhsImageModal({
  isOpen,
  onClose,
}: CreateXhsImageModalProps) {
  const { t } = useI18n()
  const router = useRouter()
  const [inputContent, setInputContent] = useState("")
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const [showAllPrompts, setShowAllPrompts] = useState(false)

  // Fetch image prompts for selection
  const { data: promptsData, isLoading: promptsLoading } = api.imagePrompts.getAll.useQuery(
    { page: 1, pageSize: showAllPrompts ? 50 : 6 },
    { enabled: isOpen }
  )

  const generateMutation = api.xhsImages.generate.useMutation({
    onSuccess: () => {
      a2uiToast.success(t("xhsImages.generateSuccess"))
      handleClose()
      router.push("/xhs-images")
    },
    onError: (error) => {
      a2uiToast.error(error.message || t("xhsImages.generateFailed"))
    },
  })

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setInputContent("")
      setSelectedPromptId(null)
      setShowAllPrompts(false)
    }
  }, [isOpen])

  // Auto-select first prompt if available and none selected
  useEffect(() => {
    if (promptsData?.items?.length && !selectedPromptId) {
      setSelectedPromptId(promptsData.items[0].id)
    }
  }, [promptsData, selectedPromptId])

  const handleClose = useCallback(() => {
    setInputContent("")
    setSelectedPromptId(null)
    setShowAllPrompts(false)
    onClose()
  }, [onClose])

  const handleSubmit = async () => {
    if (!inputContent.trim() || !selectedPromptId) return
    generateMutation.mutate({
      inputContent: inputContent.trim(),
      promptId: selectedPromptId,
    })
  }

  const handleAction = useCallback(
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "close":
          handleClose()
          break
        case "setContent":
          setInputContent(args?.[0] as string)
          break
        case "selectPrompt":
          setSelectedPromptId(args?.[0] as string)
          break
        case "showMorePrompts":
          setShowAllPrompts(true)
          break
        case "submit":
          if (!inputContent.trim() || !selectedPromptId) return
          generateMutation.mutate({
            inputContent: inputContent.trim(),
            promptId: selectedPromptId,
          })
          break
      }
    },
    [handleClose, inputContent, selectedPromptId, generateMutation]
  )

  const prompts = (promptsData?.items ?? []) as ImagePromptData[]

  // Build prompt selection grid
  const buildPromptGrid = (): A2UINode => {
    if (promptsLoading) {
      return {
        type: "text",
        text: t("common.loading"),
        color: "muted",
        className: "text-center py-4",
      }
    }

    if (prompts.length === 0) {
      return {
        type: "text",
        text: t("xhsImages.noPromptsAvailable"),
        color: "muted",
        className: "text-center py-4",
      }
    }

    const promptCards: A2UINode[] = prompts.map((prompt) => {
      const isSelected = selectedPromptId === prompt.id
      return {
        type: "card",
        hoverable: true,
        onClick: { action: "selectPrompt", args: [prompt.id] },
        className: `cursor-pointer p-2 ${isSelected ? "ring-2 ring-primary" : ""}`,
        children: [
          {
            type: "column",
            gap: "0.5rem",
            className: "items-center text-center",
            children: [
              // Preview image or placeholder
              prompt.previewUrl
                ? {
                    type: "image",
                    src: prompt.previewUrl,
                    alt: prompt.title,
                    className: "w-full aspect-square object-cover rounded-md",
                  }
                : {
                    type: "container",
                    className: "w-full aspect-square bg-muted rounded-md flex items-center justify-center",
                    children: [
                      { type: "text", text: "🎨", className: "text-2xl" },
                    ],
                  },
              {
                type: "text",
                text: prompt.title,
                variant: "caption",
                weight: isSelected ? "semibold" : "normal",
                className: "line-clamp-2",
              },
              ...(isSelected
                ? [
                    {
                      type: "badge" as const,
                      text: t("common.selected"),
                      color: "primary" as const,
                      size: "sm" as const,
                    },
                  ]
                : []),
            ],
          },
        ],
      } as A2UINode
    })

    const children: A2UINode[] = [
      {
        type: "container",
        className: "grid grid-cols-3 gap-3",
        children: promptCards,
      },
    ]

    // Show "more prompts" button if we're showing limited prompts
    if (!showAllPrompts && (promptsData?.total ?? 0) > 6) {
      children.push({
        type: "button",
        text: t("xhsImages.moreStyles"),
        variant: "secondary",
        size: "sm",
        className: "w-full mt-2",
        onClick: { action: "showMorePrompts" },
      })
    }

    return {
      type: "column",
      gap: "0.5rem",
      children,
    }
  }

  // Build modal content
  const buildContent = (): A2UINode => {
    return {
      type: "column",
      gap: "1.5rem",
      children: [
        // Content input section
        {
          type: "column",
          gap: "0.5rem",
          children: [
            {
              type: "text",
              text: t("xhsImages.inputContent"),
              weight: "medium",
            },
            {
              type: "textarea",
              id: "inputContent",
              value: inputContent,
              rows: 4,
              placeholder: t("xhsImages.inputContentPlaceholder"),
              onChange: { action: "setContent" },
            },
          ],
        },
        // Style selection section
        {
          type: "column",
          gap: "0.5rem",
          children: [
            {
              type: "text",
              text: t("xhsImages.selectStyle"),
              weight: "medium",
            },
            buildPromptGrid(),
          ],
        },
        // Action buttons
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
              text: generateMutation.isPending
                ? t("xhsImages.generating")
                : t("xhsImages.generate"),
              variant: "primary",
              disabled:
                generateMutation.isPending ||
                !inputContent.trim() ||
                !selectedPromptId,
              onClick: { action: "submit" },
            },
          ],
        },
      ],
    }
  }

  if (!isOpen) return null

  const modalNode: A2UIModalNode = {
    type: "modal",
    open: isOpen,
    title: t("xhsImages.generateTitle"),
    onClose: { action: "close" },
    className: "max-w-[32rem]",
    children: [buildContent()],
  }

  return <A2UIRenderer node={modalNode} onAction={handleAction} />
}
