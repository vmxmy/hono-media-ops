"use client"

import { useState, useEffect, useCallback } from "react"
import { useI18n } from "@/contexts/i18n-context"
import { api } from "@/trpc/react"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UINode, A2UIModalNode } from "@/lib/a2ui"

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialData?: {
    topic?: string
    keywords?: string
    style?: string
    structureGuide?: string
    outputSchema?: string
    coverPrompt?: string
    coverRatio?: string
    coverResolution?: string
    coverModel?: string
    coverMode?: string
    coverNegativePrompt?: string
  }
  isRegenerate?: boolean
}

const defaultFormData = {
  topic: "",
  keywords: "",
  style: "",
  structureGuide: "",
  outputSchema: "",
  coverPrompt: "",
  coverRatio: "16:9",
  coverResolution: "1k",
  coverModel: "jimeng-4.5",
  coverMode: "text2img",
  coverNegativePrompt: "模糊, 变形, 低质量, 水印, 文字",
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  isRegenerate = false,
}: CreateTaskModalProps) {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState(0)
  const [formData, setFormData] = useState(defaultFormData)

  const createMutation = api.tasks.create.useMutation({
    onSuccess: () => {
      onSuccess()
      handleClose()
    },
  })

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        topic: initialData.topic ?? "",
        keywords: initialData.keywords ?? "",
        style: initialData.style ?? "",
        structureGuide: initialData.structureGuide ?? "",
        outputSchema: initialData.outputSchema ?? "",
        coverPrompt: initialData.coverPrompt ?? "",
        coverRatio: initialData.coverRatio ?? "16:9",
        coverResolution: initialData.coverResolution ?? "1k",
        coverModel: initialData.coverModel ?? "jimeng-4.5",
        coverMode: initialData.coverMode ?? "text2img",
        coverNegativePrompt: initialData.coverNegativePrompt ?? "模糊, 变形, 低质量, 水印, 文字",
      })
    } else if (isOpen) {
      setFormData(defaultFormData)
    }
    setActiveTab(0)
  }, [isOpen, initialData])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = ""
    }
  }, [isOpen])

  const handleClose = () => {
    setFormData(defaultFormData)
    setActiveTab(0)
    onClose()
  }

  const handleSubmit = () => {
    if (!formData.topic.trim()) return

    createMutation.mutate({
      topic: formData.topic,
      keywords: formData.keywords || undefined,
      style: formData.style || undefined,
      structureGuide: formData.structureGuide || undefined,
      outputSchema: formData.outputSchema || undefined,
      coverPrompt: formData.coverPrompt || undefined,
      coverRatio: formData.coverRatio,
      coverResolution: formData.coverResolution,
      coverModel: formData.coverModel,
      coverMode: formData.coverMode,
      coverNegativePrompt: formData.coverNegativePrompt,
    })
  }

  const handleAction = useCallback(
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "close":
          handleClose()
          break
        case "submit":
          handleSubmit()
          break
        case "setTab":
          setActiveTab(args?.[0] as number)
          break
        case "setTopic":
          setFormData((prev) => ({ ...prev, topic: args?.[0] as string }))
          break
        case "setKeywords":
          setFormData((prev) => ({ ...prev, keywords: args?.[0] as string }))
          break
        case "setStyle":
          setFormData((prev) => ({ ...prev, style: args?.[0] as string }))
          break
        case "setStructureGuide":
          setFormData((prev) => ({ ...prev, structureGuide: args?.[0] as string }))
          break
        case "setOutputSchema":
          setFormData((prev) => ({ ...prev, outputSchema: args?.[0] as string }))
          break
        case "setCoverPrompt":
          setFormData((prev) => ({ ...prev, coverPrompt: args?.[0] as string }))
          break
        case "setCoverRatio":
          setFormData((prev) => ({ ...prev, coverRatio: args?.[0] as string }))
          break
        case "setCoverResolution":
          setFormData((prev) => ({ ...prev, coverResolution: args?.[0] as string }))
          break
        case "setCoverModel":
          setFormData((prev) => ({ ...prev, coverModel: args?.[0] as string }))
          break
        case "setCoverMode":
          setFormData((prev) => ({ ...prev, coverMode: args?.[0] as string }))
          break
        case "setCoverNegativePrompt":
          setFormData((prev) => ({ ...prev, coverNegativePrompt: args?.[0] as string }))
          break
      }
    },
    [handleClose, handleSubmit]
  )

  // Article tab content
  const articleContent: A2UINode[] = [
    {
      type: "form-field",
      label: t("taskForm.topic"),
      required: true,
      children: [
        {
          type: "input",
          id: "topic",
          value: formData.topic,
          placeholder: t("taskForm.topicPlaceholder"),
          onChange: { action: "setTopic" },
        },
      ],
    },
    {
      type: "form-field",
      label: t("taskForm.keywords"),
      children: [
        {
          type: "input",
          id: "keywords",
          value: formData.keywords,
          placeholder: t("taskForm.keywordsPlaceholder"),
          onChange: { action: "setKeywords" },
        },
      ],
    },
    {
      type: "form-field",
      label: t("taskForm.style"),
      children: [
        {
          type: "textarea",
          id: "style",
          value: formData.style,
          placeholder: t("taskForm.stylePlaceholder"),
          rows: 4,
          onChange: { action: "setStyle" },
        },
      ],
    },
    {
      type: "form-field",
      label: t("taskForm.structureGuide"),
      children: [
        {
          type: "textarea",
          id: "structureGuide",
          value: formData.structureGuide,
          placeholder: t("taskForm.structureGuidePlaceholder"),
          rows: 3,
          onChange: { action: "setStructureGuide" },
        },
      ],
    },
    {
      type: "form-field",
      label: t("taskForm.outputSchema"),
      children: [
        {
          type: "textarea",
          id: "outputSchema",
          value: formData.outputSchema,
          placeholder: t("taskForm.outputSchemaPlaceholder"),
          rows: 3,
          onChange: { action: "setOutputSchema" },
        },
      ],
    },
  ]

  // Cover tab content
  const coverContent: A2UINode[] = [
    {
      type: "form-field",
      label: t("taskForm.coverPrompt"),
      children: [
        {
          type: "textarea",
          id: "coverPrompt",
          value: formData.coverPrompt,
          placeholder: t("taskForm.coverPromptPlaceholder"),
          rows: 4,
          onChange: { action: "setCoverPrompt" },
        },
      ],
    },
    {
      type: "row",
      gap: "1rem",
      children: [
        {
          type: "form-field",
          label: t("taskForm.coverRatio"),
          style: { flex: 1 },
          children: [
            {
              type: "select",
              id: "coverRatio",
              value: formData.coverRatio,
              options: [
                { label: t("taskForm.ratio16_9"), value: "16:9" },
                { label: t("taskForm.ratio1_1"), value: "1:1" },
                { label: t("taskForm.ratio4_3"), value: "4:3" },
                { label: t("taskForm.ratio3_4"), value: "3:4" },
                { label: t("taskForm.ratio9_16"), value: "9:16" },
                { label: t("taskForm.ratio21_9"), value: "21:9" },
              ],
              onChange: { action: "setCoverRatio" },
            },
          ],
        },
        {
          type: "form-field",
          label: t("taskForm.coverResolution"),
          style: { flex: 1 },
          children: [
            {
              type: "select",
              id: "coverResolution",
              value: formData.coverResolution,
              options: [
                { label: t("taskForm.resolution1k"), value: "1k" },
                { label: t("taskForm.resolution2k"), value: "2k" },
                { label: t("taskForm.resolution4k"), value: "4k" },
              ],
              onChange: { action: "setCoverResolution" },
            },
          ],
        },
      ],
    },
    {
      type: "row",
      gap: "1rem",
      children: [
        {
          type: "form-field",
          label: t("taskForm.coverModel"),
          style: { flex: 1 },
          children: [
            {
              type: "select",
              id: "coverModel",
              value: formData.coverModel,
              options: [
                { label: "jimeng-4.5 (推荐)", value: "jimeng-4.5" },
                { label: "jimeng-4.0", value: "jimeng-4.0" },
                { label: "jimeng-4.1", value: "jimeng-4.1" },
                { label: "jimeng-3.1", value: "jimeng-3.1" },
                { label: "jimeng-3.0", value: "jimeng-3.0" },
              ],
              onChange: { action: "setCoverModel" },
            },
          ],
        },
        {
          type: "form-field",
          label: t("taskForm.coverMode"),
          style: { flex: 1 },
          children: [
            {
              type: "select",
              id: "coverMode",
              value: formData.coverMode,
              options: [
                { label: t("taskForm.modeText2img"), value: "text2img" },
                { label: t("taskForm.modeSingleImg2img"), value: "single_img2img" },
                { label: t("taskForm.modeMultiImg2img"), value: "multi_img2img" },
              ],
              onChange: { action: "setCoverMode" },
            },
          ],
        },
      ],
    },
    {
      type: "form-field",
      label: t("taskForm.coverNegativePrompt"),
      children: [
        {
          type: "input",
          id: "coverNegativePrompt",
          value: formData.coverNegativePrompt,
          placeholder: t("taskForm.coverNegativePromptPlaceholder"),
          onChange: { action: "setCoverNegativePrompt" },
        },
      ],
    },
  ]

  const modalNode: A2UIModalNode = {
    type: "modal",
    open: isOpen,
    title: isRegenerate ? t("taskForm.regenerateTitle") : t("taskForm.title"),
    onClose: { action: "close" },
    style: { maxWidth: "42rem" },
    children: [
      {
        type: "column",
        gap: "1rem",
        children: [
          {
            type: "tabs",
            defaultTab: activeTab,
            tabs: [
              {
                label: t("taskForm.articleTab"),
                content: {
                  type: "column",
                  gap: "1rem",
                  children: articleContent,
                },
              },
              {
                label: t("taskForm.coverTab"),
                content: {
                  type: "column",
                  gap: "1rem",
                  children: coverContent,
                },
              },
            ],
          },
          {
            type: "row",
            justify: "end",
            gap: "0.75rem",
            children: [
              {
                type: "button",
                text: t("common.cancel"),
                variant: "secondary",
                onClick: { action: "close" },
              },
              {
                type: "button",
                text: createMutation.isPending ? t("taskForm.submitting") : t("taskForm.submit"),
                variant: "primary",
                disabled: createMutation.isPending || !formData.topic.trim(),
                onClick: { action: "submit" },
              },
            ],
          },
        ],
      },
    ],
  }

  return <A2UIRenderer node={modalNode} onAction={handleAction} />
}
