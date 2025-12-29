"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useI18n } from "@/contexts/i18n-context"
import { api } from "@/trpc/react"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UINode, A2UIModalNode } from "@/lib/a2ui"

// v7.3 JSONB types for material card
interface StyleIdentityData {
  persona_description?: string
  voice_traits?: {
    formality?: string
    energy?: string
    warmth?: string
    confidence?: string
  }
  style_name?: string
  archetype?: string
  implied_reader?: string
}

interface LexicalLogicData {
  tone_keywords?: string[]
}

interface MetricsConstraintsData {
  avg_sentence_length?: number
  avg_paragraph_length?: number
}

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialData?: {
    topic?: string
    keywords?: string
    coverPromptId?: string
    refMaterialId?: string
  }
  isRegenerate?: boolean
}

const defaultFormData = {
  topic: "",
  keywords: "",
  totalWordCount: 4000,
  style: "",
  structureGuide: "",
  outputSchema: "",
  selectedMaterialId: null as string | null,
  selectedCoverPromptId: null as string | null,
  useSearch: true,
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  isRegenerate = false,
}: CreateTaskModalProps) {
  const { t } = useI18n()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState(defaultFormData)
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(null)

  // Fetch materials for step 2
  const { data: materialsData, isLoading: materialsLoading } =
    api.reverseLogs.getAll.useQuery(
      { page: 1, pageSize: 50 },
      { enabled: isOpen && currentStep === 2 }
    )

  // Fetch image prompts for step 3
  const { data: imagePromptsData, isLoading: imagePromptsLoading } =
    api.imagePrompts.getAll.useQuery(
      { page: 1, pageSize: 50 },
      { enabled: isOpen && currentStep === 3 }
    )

  const createMutation = api.tasks.create.useMutation({
    onSuccess: () => {
      onSuccess()
      handleClose()
    },
    onError: (error) => {
      console.error("[CreateTaskModal] Failed to create task:", error)
    },
  })

  // Track previous isOpen to detect modal open event
  const prevIsOpenRef = useRef(false)

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      if (initialData) {
        setFormData({
          topic: initialData.topic ?? "",
          keywords: initialData.keywords ?? "",
          totalWordCount: 4000,
          style: "",
          structureGuide: "",
          outputSchema: "",
          selectedMaterialId: initialData.refMaterialId ?? null,
          selectedCoverPromptId: initialData.coverPromptId ?? null,
          useSearch: true,
        })
      } else {
        setFormData(defaultFormData)
      }
      setCurrentStep(1)
    }
    prevIsOpenRef.current = isOpen
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

  const handleClose = useCallback(() => {
    setFormData(defaultFormData)
    setCurrentStep(1)
    onClose()
  }, [onClose])

  const handleSubmit = useCallback(() => {
    if (!formData.topic.trim()) return

    createMutation.mutate({
      topic: formData.topic,
      keywords: formData.keywords || undefined,
      totalWordCount: formData.totalWordCount,
      coverPromptId: formData.selectedCoverPromptId || undefined,
      refMaterialId: formData.selectedMaterialId || undefined,
      useSearch: formData.useSearch,
    })
  }, [createMutation, formData])

  const handleSelectMaterial = useCallback((materialId: string) => {
    const material = materialsData?.logs.find((m) => m.id === materialId)
    if (material) {
      const styleIdentity = material.styleIdentityData as StyleIdentityData | null
      setFormData((prev) => ({
        ...prev,
        selectedMaterialId: materialId,
        style: styleIdentity?.archetype ?? prev.style,
        structureGuide: prev.structureGuide,
      }))
    }
  }, [materialsData])

  const handleSelectCoverPrompt = useCallback((promptId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedCoverPromptId: promptId,
    }))
  }, [])

  const handleAction = useCallback(
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "close":
          handleClose()
          break
        case "submit":
          handleSubmit()
          break
        case "nextStep":
          if (currentStep < 3) setCurrentStep(currentStep + 1)
          break
        case "prevStep":
          if (currentStep > 1) setCurrentStep(currentStep - 1)
          break
        case "goToStep":
          setCurrentStep(args?.[0] as number)
          break
        case "setTopic":
          setFormData((prev) => ({ ...prev, topic: (args?.[0] as string) ?? "" }))
          break
        case "setKeywords":
          setFormData((prev) => ({ ...prev, keywords: (args?.[0] as string) ?? "" }))
          break
        case "setTotalWordCount":
          setFormData((prev) => ({
            ...prev,
            totalWordCount: parseInt(args?.[0] as string, 10) || 4000,
          }))
          break
        case "selectMaterial":
          handleSelectMaterial(args?.[0] as string)
          break
        case "toggleExpand":
          setExpandedMaterialId((prev) =>
            prev === (args?.[0] as string) ? null : (args?.[0] as string)
          )
          break
        case "selectCoverPrompt":
          handleSelectCoverPrompt(args?.[0] as string)
          break
      }
    },
    [currentStep, handleClose, handleSubmit, handleSelectMaterial, handleSelectCoverPrompt]
  )

  // Step indicator - using cards styled as step circles
  const createStepBadge = (step: number): A2UINode => {
    const isActive = step === currentStep
    const isCompleted = step < currentStep

    return {
      type: "card",
      hoverable: isCompleted,
      onClick: isCompleted ? { action: "goToStep", args: [step] } : undefined,
      style: {
        width: "1.75rem",
        height: "1.75rem",
        minWidth: "1.75rem",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        fontSize: "0.75rem",
        fontWeight: "500",
        cursor: isCompleted ? "pointer" : "default",
        backgroundColor:
          isActive || isCompleted ? "var(--ds-primary)" : "var(--ds-muted)",
        color:
          isActive || isCompleted
            ? "var(--ds-primary-foreground)"
            : "var(--ds-muted-foreground)",
        border: "none",
      },
      children: [
        {
          type: "text",
          text: isCompleted ? "✓" : String(step),
        },
      ],
    }
  }

  const createStepLine = (step: number): A2UINode => {
    const isCompleted = step < currentStep
    return {
      type: "divider",
      style: {
        flex: 1,
        minWidth: "1rem",
        maxWidth: "3rem",
        height: "2px",
        backgroundColor: isCompleted ? "var(--ds-primary)" : "var(--ds-muted)",
        margin: "0 0.25rem",
      },
    }
  }

  const stepIndicator: A2UINode = {
    type: "row",
    justify: "center",
    align: "center",
    style: { marginBottom: "1rem" },
    children: [
      createStepBadge(1),
      createStepLine(1),
      createStepBadge(2),
      createStepLine(2),
      createStepBadge(3),
    ],
  }

  const buildStep1Content = (): A2UINode => ({
    type: "column",
    gap: "1rem",
    children: [
      { type: "text", text: t("taskForm.step1Title"), variant: "h3", weight: "semibold" },
      {
        type: "form-field",
        label: t("taskForm.topic"),
        required: true,
        children: [
          {
            type: "input",
            value: formData.topic,
            placeholder: t("taskForm.topicPlaceholder"),
            inputType: "text",
            onChange: { action: "setTopic" },
          },
        ],
      },
      {
        type: "form-field",
        label: t("taskForm.keywords"),
        children: [
          {
            type: "textarea",
            value: formData.keywords,
            rows: 3,
            placeholder: t("taskForm.keywordsPlaceholder"),
            onChange: { action: "setKeywords" },
          },
        ],
      },
      {
        type: "form-field",
        label: t("taskForm.totalWordCount"),
        children: [
          {
            type: "input",
            value: String(formData.totalWordCount),
            inputType: "number",
            placeholder: "4000",
            onChange: { action: "setTotalWordCount" },
          },
        ],
      },
    ],
  })

  const buildMaterialCard = (material: {
    id: string
    sourceTitle: string | null
    primaryType: string | null
    wordCount: number | null
    paraCount: number | null
    metricsBurstiness: number | null
    metricsTtr: number | null
    styleIdentityData: StyleIdentityData | null
    lexicalLogicData: LexicalLogicData | null
    metricsConstraintsData: MetricsConstraintsData | null
  }): A2UINode => {
    const styleIdentity = material.styleIdentityData
    const lexicalLogic = material.lexicalLogicData
    const metricsConstraints = material.metricsConstraintsData

    const styleName = styleIdentity?.style_name || material.sourceTitle || ""
    const archetype = styleIdentity?.archetype
    const targetAudience = styleIdentity?.implied_reader
    const toneKeywords = lexicalLogic?.tone_keywords ?? []
    const primaryType = material.primaryType

    const avgSentLen = metricsConstraints?.avg_sentence_length
    const avgParaLen = metricsConstraints?.avg_paragraph_length
    const wordCount = material.wordCount
    const ttr = material.metricsTtr
    const burstiness = material.metricsBurstiness

    const isSelected = formData.selectedMaterialId === material.id
    const isExpanded = expandedMaterialId === material.id

    const tabNodes: Array<{ label: string; content: A2UINode }> = []

    if (archetype || targetAudience || toneKeywords.length > 0) {
      tabNodes.push({
        label: t("reverse.tabStyle"),
        content: {
          type: "column",
          gap: "0.5rem",
          children: [
            ...(archetype
              ? [
                  {
                    type: "column",
                    gap: "0.25rem",
                    children: [
                      { type: "text", text: t("reverse.archetype"), variant: "caption", color: "muted" },
                      { type: "text", text: archetype },
                    ],
                  },
                ]
              : []),
            ...(targetAudience
              ? [
                  {
                    type: "column",
                    gap: "0.25rem",
                    children: [
                      { type: "text", text: t("reverse.targetAudience"), variant: "caption", color: "muted" },
                      { type: "text", text: targetAudience },
                    ],
                  },
                ]
              : []),
            ...(toneKeywords.length > 0
              ? [
                  {
                    type: "row",
                    gap: "0.25rem",
                    wrap: true,
                    children: toneKeywords.map((keyword, idx) => ({
                      type: "badge",
                      text: keyword,
                      color: "default",
                      style: { fontWeight: 500 },
                      id: `${material.id}-tone-${idx}`,
                    })),
                  },
                ]
              : []),
          ],
        },
      })
    }

    if (wordCount != null || avgSentLen != null || avgParaLen != null || ttr != null || burstiness != null) {
      const metricItems: A2UINode[] = []
      if (wordCount != null) {
        metricItems.push({ type: "text", text: `${t("reverse.totalWords")}: ${wordCount}` })
      }
      if (avgSentLen != null) {
        metricItems.push({ type: "text", text: `${t("insights.avgSentLen")}: ${avgSentLen.toFixed(1)}` })
      }
      if (avgParaLen != null) {
        metricItems.push({ type: "text", text: `${t("insights.avgParaLen")}: ${avgParaLen.toFixed(1)}` })
      }
      if (ttr != null) {
        metricItems.push({ type: "text", text: `TTR: ${(ttr * 100).toFixed(1)}%` })
      }
      if (burstiness != null) {
        metricItems.push({ type: "text", text: `Burstiness: ${(burstiness * 100).toFixed(1)}%` })
      }
      tabNodes.push({
        label: t("insights.metrics"),
        content: {
          type: "row",
          gap: "0.75rem",
          wrap: true,
          children: metricItems,
        },
      })
    }

    const badges: A2UINode[] = []
    if (primaryType) {
      badges.push({ type: "badge", text: primaryType, color: "default" })
    }
    if (archetype) {
      badges.push({ type: "badge", text: archetype, color: "primary" })
    }
    if (isSelected) {
      badges.push({ type: "badge", text: t("common.selected"), color: "success" })
    }

    const children: A2UINode[] = [
      {
        type: "row",
        justify: "between",
        align: "start",
        gap: "0.75rem",
        children: [
          {
            type: "column",
            gap: "0.25rem",
            style: { flex: 1, minWidth: 0 },
            children: [
              { type: "text", text: styleName || material.sourceTitle || t("reverse.untitled"), weight: "medium" },
              ...(badges.length > 0
                ? [
                    {
                      type: "row",
                      gap: "0.25rem",
                      wrap: true,
                      children: badges,
                    },
                  ]
                : []),
              ...(styleName && material.sourceTitle && styleName !== material.sourceTitle
                ? [
                    {
                      type: "text",
                      text: `《${material.sourceTitle}》`,
                      variant: "caption",
                      color: "muted",
                    },
                  ]
                : []),
            ],
          },
          {
            type: "button",
            text: isExpanded ? t("common.collapse") : t("common.expand"),
            variant: "secondary",
            size: "sm",
            onClick: { action: "toggleExpand", args: [material.id], stopPropagation: true },
          },
        ],
      },
    ]

    if (isExpanded && tabNodes.length > 0) {
      children.push({ type: "tabs", tabs: tabNodes })
    }

    return {
      type: "card",
      hoverable: true,
      onClick: { action: "selectMaterial", args: [material.id] },
      style: isSelected
        ? { borderColor: "var(--ds-primary)", borderWidth: "2px", backgroundColor: "var(--ds-accent)" }
        : undefined,
      children,
    }
  }

  const buildStep2Content = (): A2UINode => {
    const body: A2UINode[] = []

    if (materialsLoading) {
      body.push({ type: "text", text: t("common.loading"), color: "muted" })
    } else if (!materialsData?.logs.length) {
      body.push({ type: "text", text: t("taskForm.noMaterials"), color: "muted" })
    } else {
      body.push(
        ...materialsData.logs.map((material) => buildMaterialCard(material))
      )
    }

    return {
      type: "column",
      gap: "1rem",
      children: [
        {
          type: "column",
          gap: "0.25rem",
          children: [
            { type: "text", text: t("taskForm.step2Title"), variant: "h3", weight: "semibold" },
            { type: "text", text: t("taskForm.step2Desc"), variant: "caption", color: "muted" },
          ],
        },
        { type: "column", gap: "0.75rem", children: body },
      ],
    }
  }

  const buildCoverPromptCard = (prompt: {
    id: string
    title: string
    prompt: string
    negativePrompt: string | null
    model: string | null
    ratio: string | null
    resolution: string | null
    category: string | null
    previewUrl: string | null
  }): A2UINode => {
    const isSelected = formData.selectedCoverPromptId === prompt.id
    const badges: A2UINode[] = []
    if (prompt.category) badges.push({ type: "badge", text: prompt.category, color: "default" })
    if (prompt.model) badges.push({ type: "badge", text: prompt.model, color: "primary" })
    if (prompt.ratio) badges.push({ type: "badge", text: prompt.ratio, color: "default" })

    const children: A2UINode[] = [
      {
        type: "row",
        gap: "0.75rem",
        align: "start",
        children: [
          {
            type: "column",
            gap: "0.5rem",
            style: { flex: 1, minWidth: 0 },
            children: [
              { type: "text", text: prompt.title, weight: "medium" },
              ...(badges.length > 0
                ? [{ type: "row", gap: "0.25rem", wrap: true, children: badges }]
                : []),
              { type: "text", text: prompt.prompt, variant: "caption", color: "muted" },
            ],
          },
          ...(prompt.previewUrl
            ? [
                {
                  type: "image",
                  src: prompt.previewUrl,
                  alt: prompt.title,
                  width: "64px",
                  height: "64px",
                  style: { borderRadius: "0.5rem", objectFit: "cover" },
                },
              ]
            : []),
        ],
      },
    ]

    if (isSelected) {
      children.unshift({ type: "badge", text: t("common.selected"), color: "success" })
    }

    return {
      type: "card",
      hoverable: true,
      onClick: { action: "selectCoverPrompt", args: [prompt.id] },
      style: isSelected
        ? { borderColor: "var(--ds-primary)", borderWidth: "2px", backgroundColor: "var(--ds-accent)" }
        : undefined,
      children,
    }
  }

  const buildStep3Content = (): A2UINode => {
    const body: A2UINode[] = []

    if (imagePromptsLoading) {
      body.push({ type: "text", text: t("common.loading"), color: "muted" })
    } else if (!imagePromptsData?.items.length) {
      body.push({ type: "text", text: t("taskForm.noMaterials"), color: "muted" })
    } else {
      body.push(
        ...imagePromptsData.items.map((prompt) => buildCoverPromptCard(prompt))
      )
    }

    return {
      type: "column",
      gap: "1rem",
      children: [
        {
          type: "column",
          gap: "0.25rem",
          children: [
            { type: "text", text: t("taskForm.step3Title"), variant: "h3", weight: "semibold" },
            { type: "text", text: t("taskForm.selectCoverPrompt"), variant: "caption", color: "muted" },
          ],
        },
        { type: "column", gap: "0.75rem", children: body },
      ],
    }
  }

  const getNavigationButtons = (): A2UINode => {
    const buttons: A2UINode[] = []

    buttons.push({
      type: "button",
      text: t("common.cancel"),
      variant: "secondary",
      onClick: { action: "close" },
    })

    if (currentStep > 1) {
      buttons.push({
        type: "button",
        text: t("taskForm.prev"),
        variant: "secondary",
        onClick: { action: "prevStep" },
      })
    }

    if (currentStep < 3) {
      const isNextDisabled =
        (currentStep === 1 && !formData.topic.trim()) ||
        (currentStep === 2 && !formData.selectedMaterialId)
      buttons.push({
        type: "button",
        text: t("taskForm.next"),
        variant: "primary",
        disabled: isNextDisabled,
        onClick: { action: "nextStep" },
      })
    } else {
      const isSubmitDisabled =
        createMutation.isPending ||
        !formData.topic.trim() ||
        !formData.selectedCoverPromptId
      buttons.push({
        type: "button",
        text: createMutation.isPending ? t("taskForm.submitting") : t("taskForm.submit"),
        variant: "primary",
        disabled: isSubmitDisabled,
        onClick: { action: "submit" },
      })
    }

    return {
      type: "row",
      justify: "end",
      gap: "0.5rem",
      wrap: true,
      children: buttons,
    }
  }

  if (!isOpen) return null

  const stepContent =
    currentStep === 1
      ? buildStep1Content()
      : currentStep === 2
        ? buildStep2Content()
        : buildStep3Content()

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
            type: "container",
            style: { maxHeight: "60vh", overflowY: "auto" },
            children: [stepIndicator, stepContent],
          },
          getNavigationButtons(),
        ],
      },
    ],
  }

  return <A2UIRenderer node={modalNode} onAction={handleAction} />
}
