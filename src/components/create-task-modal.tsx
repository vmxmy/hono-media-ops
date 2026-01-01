"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useI18n } from "@/contexts/i18n-context"
import { api } from "@/trpc/react"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UINode, A2UIModalNode } from "@/lib/a2ui"
import { buildMaterialCardNode, type MaterialCardMetric, type MaterialCardBadge } from "@/lib/a2ui"

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
  const [materialSearchQuery, setMaterialSearchQuery] = useState("")

  // Fetch materials for step 2
  const { data: materialsData, isLoading: materialsLoading } =
    api.reverseLogs.getAll.useQuery(
      { page: 1, pageSize: 50, search: materialSearchQuery || undefined },
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
      setMaterialSearchQuery("")
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
    setMaterialSearchQuery("")
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
        case "setMaterialSearch":
          setMaterialSearchQuery(args?.[0] as string ?? "")
          break
        case "clearMaterialSearch":
          setMaterialSearchQuery("")
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
            id: "topic",
            name: "topic",
            value: formData.topic,
            placeholder: t("taskForm.topicPlaceholder"),
            inputType: "text",
            autocomplete: "off",
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
            id: "totalWordCount",
            name: "totalWordCount",
            value: String(formData.totalWordCount),
            inputType: "number",
            autocomplete: "off",
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
    sourceUrl: string | null
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
    const wordCount = material.wordCount
    const ttr = material.metricsTtr

    const isSelected = formData.selectedMaterialId === material.id
    const isExpanded = expandedMaterialId === material.id

    // Build badges
    const badges: MaterialCardBadge[] = []
    if (primaryType) {
      badges.push({ text: primaryType.replace(/_/g, " ").toUpperCase(), color: "default" })
    }
    if (archetype) {
      badges.push({ text: archetype, color: "primary" })
    }
    if (isSelected) {
      badges.push({ text: t("common.selected"), color: "success" })
    }

    // Build metrics for display in card (not in tabs)
    const metrics: MaterialCardMetric[] = []
    if (wordCount != null) {
      metrics.push({ value: wordCount, label: t("reverse.totalWords") })
    }
    if (avgSentLen != null) {
      metrics.push({ value: avgSentLen, label: t("insights.avgSentLen") })
    }
    if (ttr != null) {
      metrics.push({ value: ttr, label: "TTR", format: "percent" })
    }

    // Build expanded content (tabs)
    const extraContent: A2UINode[] = []
    if (isExpanded) {
      const tabNodes: Array<{ label: string; content: A2UINode }> = []

      // Style tab
      if (archetype || targetAudience || toneKeywords.length > 0) {
        tabNodes.push({
          label: t("reverse.tabStyle"),
          content: {
            type: "column",
            gap: "0.75rem",
            children: [
              ...(archetype
                ? [{
                    type: "column" as const,
                    gap: "0.25rem",
                    children: [
                      { type: "text" as const, text: t("reverse.archetype"), variant: "caption" as const, color: "muted" as const },
                      { type: "text" as const, text: archetype },
                    ],
                  }]
                : []),
              ...(targetAudience
                ? [{
                    type: "column" as const,
                    gap: "0.25rem",
                    children: [
                      { type: "text" as const, text: t("reverse.targetAudience"), variant: "caption" as const, color: "muted" as const },
                      { type: "text" as const, text: targetAudience },
                    ],
                  }]
                : []),
              ...(toneKeywords.length > 0
                ? [{
                    type: "row" as const,
                    gap: "0.375rem",
                    wrap: true,
                    children: toneKeywords.map((keyword, idx) => ({
                      type: "badge" as const,
                      text: keyword,
                      color: "default" as const,
                      id: `${material.id}-tone-${idx}`,
                    })),
                  }]
                : []),
            ],
          },
        })
      }

      if (tabNodes.length > 0) {
        extraContent.push({
          type: "container",
          style: { marginTop: "0.75rem" },
          children: [{ type: "tabs", tabs: tabNodes }],
        })
      }
    }

    // Build card title
    const title = material.sourceTitle || styleName || t("reverse.untitled")
    const subtitle = styleName && material.sourceTitle && styleName !== material.sourceTitle
      ? `${t("reverse.styleName")}: ${styleName}`
      : undefined

    return buildMaterialCardNode({
      id: `material-${material.id}`,
      title,
      titleHref: material.sourceUrl ?? undefined,
      subtitle,
      badges,
      metrics: isExpanded ? undefined : metrics, // Show metrics inline when collapsed
      extraContent,
      headerAction: {
        text: isExpanded ? t("common.collapse") : t("common.expand"),
        variant: "secondary",
        action: { action: "toggleExpand", args: [material.id] },
      },
      onClick: { action: "selectMaterial", args: [material.id] },
      selected: isSelected,
      compact: true,
    })
  }

  const buildStep2Content = (): A2UINode => {
    const body: A2UINode[] = []
    const hasSearch = materialSearchQuery.trim().length > 0

    if (materialsLoading) {
      body.push({ type: "text", text: t("common.loading"), color: "muted" })
    } else if (!materialsData?.logs.length) {
      body.push({
        type: "column",
        gap: "0.5rem",
        style: { alignItems: "center", padding: "1rem" },
        children: [
          { type: "text", text: hasSearch ? t("reverse.noSearchResults") : t("taskForm.noMaterials"), color: "muted" },
          ...(hasSearch ? [
            { type: "text", text: t("reverse.tryDifferentKeywords"), variant: "caption", color: "muted" } as A2UINode,
            { type: "button", text: t("reverse.clearSearch"), variant: "secondary", size: "sm", onClick: { action: "clearMaterialSearch" } } as A2UINode,
          ] : []),
        ],
      })
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
        // 搜索框
        {
          type: "input",
          id: "material-search",
          name: "material-search",
          value: materialSearchQuery,
          placeholder: t("reverse.searchPlaceholder"),
          inputType: "text",
          autocomplete: "off",
          onChange: { action: "setMaterialSearch" },
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
              { type: "text" as const, text: prompt.title, weight: "medium" as const },
              ...(badges.length > 0
                ? [{ type: "row" as const, gap: "0.25rem", wrap: true, children: badges }]
                : []),
              { type: "text" as const, text: prompt.prompt, variant: "caption" as const, color: "muted" as const },
            ],
          },
          ...(prompt.previewUrl
            ? [
                {
                  type: "image" as const,
                  src: prompt.previewUrl,
                  alt: prompt.title,
                  width: "64px",
                  height: "64px",
                  style: { borderRadius: "0.5rem", objectFit: "cover" as const },
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
