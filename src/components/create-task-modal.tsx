"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useI18n, type I18nKey } from "@/contexts/i18n-context"
import { api } from "@/trpc/react"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UINode, A2UIModalNode } from "@/lib/a2ui"

// Swipeable detail tabs component for mobile
interface DetailTab {
  label: string
  content: React.ReactNode
}

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

// Material card with swipeable detail tabs
interface MaterialCardProps {
  material: {
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
  }
  isSelected: boolean
  isExpanded: boolean
  onSelect: () => void
  onToggleExpand: () => void
  t: (key: I18nKey) => string
}

function MaterialCard({ material, isSelected, isExpanded, onSelect, onToggleExpand, t }: MaterialCardProps) {
  // Extract style info from JSONB fields (v7.3)
  const styleIdentity = material.styleIdentityData
  const lexicalLogic = material.lexicalLogicData
  const metricsConstraints = material.metricsConstraintsData

  const styleName = styleIdentity?.style_name || material.sourceTitle || ""
  const archetype = styleIdentity?.archetype
  const targetAudience = styleIdentity?.implied_reader
  const toneKeywords = lexicalLogic?.tone_keywords ?? []
  const primaryType = material.primaryType

  // Get metrics
  const avgSentLen = metricsConstraints?.avg_sentence_length
  const avgParaLen = metricsConstraints?.avg_paragraph_length
  const wordCount = material.wordCount
  const ttr = material.metricsTtr
  const burstiness = material.metricsBurstiness

  // Build tabs for expanded content
  const detailTabs: DetailTab[] = []

  // Style tab - archetype, target audience, tone keywords
  if (archetype || targetAudience || toneKeywords.length > 0) {
    detailTabs.push({
      label: t("reverse.tabStyle"),
      content: (
        <div className="flex flex-col gap-2 text-sm">
          {archetype && (
            <div>
              <span className="text-xs text-muted-foreground">{t("reverse.archetype")}</span>
              <div className="text-foreground">{archetype}</div>
            </div>
          )}
          {targetAudience && (
            <div>
              <span className="text-xs text-muted-foreground">{t("reverse.targetAudience")}</span>
              <div className="text-foreground">{targetAudience}</div>
            </div>
          )}
          {toneKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {toneKeywords.map((k, i) => (
                <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
      ),
    })
  }

  // Metrics tab (v7.3 compatible)
  if (wordCount != null || avgSentLen != null || avgParaLen != null || ttr != null || burstiness != null) {
    detailTabs.push({
      label: t("insights.metrics"),
      content: (
        <div className="flex flex-wrap gap-3 text-sm">
          {wordCount != null && (
            <div>
              <span className="font-medium">{t("reverse.totalWords")}:</span>{" "}
              <span className="text-muted-foreground">{wordCount}</span>
            </div>
          )}
          {avgSentLen != null && (
            <div>
              <span className="font-medium">{t("insights.avgSentLen")}:</span>{" "}
              <span className="text-muted-foreground">{avgSentLen.toFixed(1)}</span>
            </div>
          )}
          {avgParaLen != null && (
            <div>
              <span className="font-medium">{t("insights.avgParaLen")}:</span>{" "}
              <span className="text-muted-foreground">{avgParaLen.toFixed(1)}</span>
            </div>
          )}
          {ttr != null && (
            <div>
              <span className="font-medium">TTR:</span>{" "}
              <span className="text-muted-foreground">{(ttr * 100).toFixed(1)}%</span>
            </div>
          )}
          {burstiness != null && (
            <div>
              <span className="font-medium">Burstiness:</span>{" "}
              <span className="text-muted-foreground">{(burstiness * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>
      ),
    })
  }

  return (
    <div
      className={`rounded-lg p-3 transition-colors ${
        isSelected
          ? "border-2 border-primary bg-accent"
          : "border border-border bg-card"
      }`}
    >
      {/* Collapsed header */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="h-4 w-4 cursor-pointer rounded border-border"
        />
        <button
          onClick={onToggleExpand}
          className="flex flex-1 items-center justify-between gap-2 text-left"
          style={{ minWidth: 0 }}
        >
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">
              {styleName || material.sourceTitle || t("reverse.untitled")}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {primaryType && (
                <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {primaryType}
                </span>
              )}
              {archetype && (
                <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {archetype}
                </span>
              )}
            </div>
            {/* Show title with book title marks if styleName exists and differs */}
            {styleName && material.sourceTitle && styleName !== material.sourceTitle && (
              <div className="mt-1 truncate text-xs text-muted-foreground">
                《{material.sourceTitle}》
              </div>
            )}
          </div>
          <span className="flex-shrink-0 text-xs text-muted-foreground">
            {isExpanded ? "▲" : "▼"}
          </span>
        </button>
      </div>

      {/* Expanded swipeable tabs */}
      {isExpanded && detailTabs.length > 0 && (
        <SwipeableDetailTabs tabs={detailTabs} materialId={material.id} />
      )}
    </div>
  )
}

function SwipeableDetailTabs({ tabs, materialId }: { tabs: DetailTab[]; materialId: string }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current
    const threshold = 50 // minimum swipe distance

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && activeIndex < tabs.length - 1) {
        // Swipe left - go to next
        setActiveIndex(activeIndex + 1)
      } else if (diff < 0 && activeIndex > 0) {
        // Swipe right - go to previous
        setActiveIndex(activeIndex - 1)
      }
    }
  }

  // Reset to first tab when material changes
  useEffect(() => {
    setActiveIndex(0)
  }, [materialId])

  if (tabs.length === 0) return null

  return (
    <div className="mt-3">
      {/* Tab labels row */}
      <div className="mb-2 flex gap-1 overflow-x-auto pb-1">
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              index === activeIndex
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Swipeable content area */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative min-h-[60px] overflow-hidden rounded-md bg-muted/30 p-3"
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {tabs.map((tab, index) => (
            <div key={index} className="w-full flex-shrink-0">
              {tab.content}
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="mt-2 flex justify-center gap-1.5">
        {tabs.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`h-1.5 rounded-full transition-all ${
              index === activeIndex
                ? "w-4 bg-primary"
                : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
            aria-label={`Go to tab ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

// Cover prompt card component for step 3
interface CoverPromptCardProps {
  prompt: {
    id: string
    title: string
    prompt: string
    negativePrompt: string | null
    model: string | null
    ratio: string | null
    resolution: string | null
    category: string | null
    previewUrl: string | null
  }
  isSelected: boolean
  onSelect: () => void
  t: (key: I18nKey) => string
}

function CoverPromptCard({ prompt, isSelected, onSelect, t }: CoverPromptCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg p-3 transition-colors ${
        isSelected
          ? "border-2 border-primary bg-accent"
          : "border border-border bg-card hover:bg-accent/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="radio"
          checked={isSelected}
          onChange={onSelect}
          className="mt-1 h-4 w-4 cursor-pointer"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{prompt.title}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {prompt.category && (
              <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {prompt.category}
              </span>
            )}
            {prompt.model && (
              <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {prompt.model}
              </span>
            )}
            {prompt.ratio && (
              <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {prompt.ratio}
              </span>
            )}
          </div>
          <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {prompt.prompt}
          </div>
          {prompt.previewUrl && (
            <div className="mt-2">
              <img
                src={prompt.previewUrl}
                alt={prompt.title}
                className="h-16 w-16 rounded object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
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
      console.log("[CreateTaskModal] Task created successfully, triggering webhook")
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
    // Only initialize when modal opens (isOpen changes from false to true)
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

  const handleClose = () => {
    setFormData(defaultFormData)
    setCurrentStep(1)
    onClose()
  }

  const handleSubmit = () => {
    if (!formData.topic.trim()) return

    createMutation.mutate({
      topic: formData.topic,
      keywords: formData.keywords || undefined,
      totalWordCount: formData.totalWordCount,
      // Cover prompt (n8n queries image_prompts by this ID)
      coverPromptId: formData.selectedCoverPromptId || undefined,
      // Reference material (n8n queries reverse_engineering_logs by this ID)
      refMaterialId: formData.selectedMaterialId || undefined,
      // Whether to use search engine
      useSearch: formData.useSearch,
    })
  }

  const handleSelectMaterial = (materialId: string) => {
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
  }

  const handleSelectCoverPrompt = (promptId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedCoverPromptId: promptId,
    }))
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
          setFormData((prev) => ({ ...prev, topic: args?.[0] as string }))
          break
        case "setKeywords":
          setFormData((prev) => ({ ...prev, keywords: args?.[0] as string }))
          break
        case "setTotalWordCount":
          setFormData((prev) => ({ ...prev, totalWordCount: parseInt(args?.[0] as string) || 4000 }))
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
    [handleClose, handleSubmit, currentStep, materialsData]
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
    style: { marginBottom: "1.5rem" },
    children: [
      createStepBadge(1),
      createStepLine(1),
      createStepBadge(2),
      createStepLine(2),
      createStepBadge(3),
    ],
  }


  // Step content render functions - inline JSX to avoid recreation on each render
  const renderStep1Content = () => (
    <div className="flex flex-col gap-4">
      <h3 className="mb-2 text-lg font-semibold">{t("taskForm.step1Title")}</h3>

      {/* Topic */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          {t("taskForm.topic")} <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={formData.topic}
          onChange={(e) => setFormData((prev) => ({ ...prev, topic: e.target.value }))}
          placeholder={t("taskForm.topicPlaceholder")}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Keywords */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          {t("taskForm.keywords")}
        </label>
        <textarea
          value={formData.keywords}
          onChange={(e) => setFormData((prev) => ({ ...prev, keywords: e.target.value }))}
          placeholder={t("taskForm.keywordsPlaceholder")}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Total Word Count */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          {t("taskForm.totalWordCount")}
        </label>
        <input
          type="number"
          value={formData.totalWordCount}
          onChange={(e) => setFormData((prev) => ({ ...prev, totalWordCount: parseInt(e.target.value) || 4000 }))}
          placeholder="4000"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
    </div>
  )

  const renderStep2Content = () => (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-lg font-semibold">{t("taskForm.step2Title")}</h3>
        <p className="mb-2 text-xs text-muted-foreground">{t("taskForm.step2Desc")}</p>
      </div>
      <div className="flex flex-col gap-2">
        {materialsLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : !materialsData?.logs.length ? (
          <p className="text-sm text-muted-foreground">{t("taskForm.noMaterials")}</p>
        ) : (
          materialsData.logs.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              isSelected={formData.selectedMaterialId === material.id}
              isExpanded={expandedMaterialId === material.id}
              onSelect={() => handleSelectMaterial(material.id)}
              onToggleExpand={() =>
                setExpandedMaterialId((prev) =>
                  prev === material.id ? null : material.id
                )
              }
              t={t}
            />
          ))
        )}
      </div>
    </div>
  )

  const renderStep3Content = () => (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-lg font-semibold">{t("taskForm.step3Title")}</h3>
        <p className="mb-2 text-xs text-muted-foreground">{t("taskForm.selectCoverPrompt")}</p>
      </div>
      <div className="flex flex-col gap-2">
        {imagePromptsLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : !imagePromptsData?.items.length ? (
          <p className="text-sm text-muted-foreground">{t("taskForm.noMaterials")}</p>
        ) : (
          imagePromptsData.items.map((prompt) => (
            <CoverPromptCard
              key={prompt.id}
              prompt={prompt}
              isSelected={formData.selectedCoverPromptId === prompt.id}
              onSelect={() => handleSelectCoverPrompt(prompt.id)}
              t={t}
            />
          ))
        )}
      </div>
    </div>
  )

  // Navigation buttons
  const getNavigationButtons = (): A2UINode => {
    const buttons: A2UINode[] = []

    // Cancel button (always shown)
    buttons.push({
      type: "button",
      text: t("common.cancel"),
      variant: "secondary",
      onClick: { action: "close" },
    })

    // Previous button (step 2 and 3)
    if (currentStep > 1) {
      buttons.push({
        type: "button",
        text: t("taskForm.prev"),
        variant: "secondary",
        onClick: { action: "prevStep" },
      })
    }

    // Next/Submit button
    if (currentStep < 3) {
      // Step 1: require topic; Step 2: require material selection
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
      // Step 3: require cover prompt selection
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

  // For steps 2 and 3, we render React components directly
  // For step 1, we use A2UI nodes
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 md:px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div className="flex h-full w-full flex-col overflow-hidden border-border bg-card shadow-xl md:h-auto md:max-h-[90vh] md:max-w-lg md:rounded-lg md:border">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3 md:px-6 md:py-4">
          <h2 className="text-base font-semibold md:text-lg">
            {isRegenerate ? t("taskForm.regenerateTitle") : t("taskForm.title")}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-2xl text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
          {/* Step indicator */}
          <A2UIRenderer node={stepIndicator} onAction={handleAction} />

          {/* Step content */}
          {currentStep === 1 && renderStep1Content()}
          {currentStep === 2 && renderStep2Content()}
          {currentStep === 3 && renderStep3Content()}
        </div>

        {/* Navigation buttons */}
        <div className="flex-shrink-0 border-t border-border bg-card px-4 py-3 md:px-6 md:py-4">
          <A2UIRenderer node={getNavigationButtons()} onAction={handleAction} />
        </div>
      </div>
    </div>
  )
}
