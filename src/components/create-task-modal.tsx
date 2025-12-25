"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useI18n, type I18nKey } from "@/contexts/i18n-context"
import { api } from "@/trpc/react"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UINode, A2UIModalNode } from "@/lib/a2ui"

// Swipeable detail tabs component for mobile
interface DetailTab {
  label: string
  content: React.ReactNode
}

// Material card with swipeable detail tabs
interface MaterialCardProps {
  material: {
    id: string
    articleTitle: string | null
    genreCategory: string | null
    reverseResult: unknown
    metrics: unknown
    finalSystemPrompt: string | null
  }
  isSelected: boolean
  isExpanded: boolean
  onSelect: () => void
  onToggleExpand: () => void
  t: (key: I18nKey) => string
}

function MaterialCard({ material, isSelected, isExpanded, onSelect, onToggleExpand, t }: MaterialCardProps) {
  const reverseResult = material.reverseResult as Record<string, unknown> | null
  const metrics = material.metrics as Record<string, number> | null

  // Build tabs for expanded content
  const detailTabs: DetailTab[] = []

  if (reverseResult?.tone) {
    detailTabs.push({
      label: t("reverse.tone"),
      content: (
        <div className="text-sm text-muted-foreground" style={{ wordBreak: "break-word" }}>
          {String(reverseResult.tone)}
        </div>
      ),
    })
  }

  if (reverseResult?.structure) {
    detailTabs.push({
      label: t("reverse.structure"),
      content: (
        <div className="text-sm text-muted-foreground" style={{ wordBreak: "break-word" }}>
          {String(reverseResult.structure)}
        </div>
      ),
    })
  }

  if (metrics && (metrics.burstiness != null || metrics.ttr != null || metrics.avgSentLen != null)) {
    detailTabs.push({
      label: t("insights.metrics"),
      content: (
        <div className="flex flex-wrap gap-3 text-sm">
          {metrics.burstiness != null && (
            <div>
              <span className="font-medium">{t("insights.burstiness")}:</span>{" "}
              <span className="text-muted-foreground">{Number(metrics.burstiness).toFixed(1)}</span>
            </div>
          )}
          {metrics.ttr != null && (
            <div>
              <span className="font-medium">TTR:</span>{" "}
              <span className="text-muted-foreground">{(Number(metrics.ttr) * 100).toFixed(0)}%</span>
            </div>
          )}
          {metrics.avgSentLen != null && (
            <div>
              <span className="font-medium">{t("insights.avgSentLen")}:</span>{" "}
              <span className="text-muted-foreground">{Number(metrics.avgSentLen).toFixed(1)}</span>
            </div>
          )}
        </div>
      ),
    })
  }

  if (material.finalSystemPrompt) {
    detailTabs.push({
      label: t("reverse.tabPrompt"),
      content: (
        <div
          className="text-sm text-muted-foreground"
          style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.4 }}
        >
          {material.finalSystemPrompt.length > 200
            ? material.finalSystemPrompt.substring(0, 200) + "..."
            : material.finalSystemPrompt}
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
              {material.articleTitle ?? t("reverse.untitled")}
            </div>
            {material.genreCategory && (
              <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {material.genreCategory}
              </span>
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

const DEFAULT_COVER_PROMPT =
  "大师级排版,孟菲斯风格矢量插画，色彩艳丽对比强烈，采用非对称图形的样式，以及点线面的随机组合，故意扭曲变形，极具视觉冲击力。丝网印刷、半调图案，噪点"

const defaultFormData = {
  topic: "",
  keywords: "",
  style: "",
  structureGuide: "",
  outputSchema: "",
  coverPrompt: DEFAULT_COVER_PROMPT,
  coverRatio: "16:9",
  coverResolution: "1k",
  coverModel: "jimeng-4.5",
  coverMode: "text2img",
  coverNegativePrompt: "模糊, 变形, 低质量, 水印, 文字",
  selectedMaterialId: null as string | null,
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
      { page: 1, pageSize: 50, status: "SUCCESS" },
      { enabled: isOpen && currentStep === 2 }
    )

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
        coverPrompt: initialData.coverPrompt ?? DEFAULT_COVER_PROMPT,
        coverRatio: initialData.coverRatio ?? "16:9",
        coverResolution: initialData.coverResolution ?? "1k",
        coverModel: initialData.coverModel ?? "jimeng-4.5",
        coverMode: initialData.coverMode ?? "text2img",
        coverNegativePrompt:
          initialData.coverNegativePrompt ?? "模糊, 变形, 低质量, 水印, 文字",
        selectedMaterialId: null,
      })
    } else if (isOpen) {
      setFormData(defaultFormData)
    }
    setCurrentStep(1)
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

    // Get selected material data if any
    const selectedMaterial = formData.selectedMaterialId
      ? materialsData?.logs.find((m) => m.id === formData.selectedMaterialId)
      : null

    createMutation.mutate({
      topic: formData.topic,
      keywords: formData.keywords || undefined,
      coverPrompt: formData.coverPrompt || undefined,
      coverRatio: formData.coverRatio,
      coverResolution: formData.coverResolution,
      coverModel: formData.coverModel,
      coverMode: formData.coverMode,
      coverNegativePrompt: formData.coverNegativePrompt,
      // Reference material fields
      refMaterialId: selectedMaterial?.id,
      refGenreCategory: selectedMaterial?.genreCategory ?? undefined,
      refReverseResult: selectedMaterial?.reverseResult as Record<string, unknown> ?? undefined,
    })
  }

  const handleSelectMaterial = (materialId: string) => {
    const material = materialsData?.logs.find((m) => m.id === materialId)
    if (material) {
      // Extract style info from reverseResult
      const reverseResult = material.reverseResult as Record<string, unknown> | null

      setFormData((prev) => ({
        ...prev,
        selectedMaterialId: materialId,
        style: reverseResult?.tone as string ?? prev.style,
        structureGuide: reverseResult?.structure as string ?? prev.structureGuide,
      }))
    }
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
        case "selectMaterial":
          handleSelectMaterial(args?.[0] as string)
          break
        case "toggleExpand":
          setExpandedMaterialId((prev) =>
            prev === (args?.[0] as string) ? null : (args?.[0] as string)
          )
          break
        case "setCoverPrompt":
          setFormData((prev) => ({ ...prev, coverPrompt: args?.[0] as string }))
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

  // Step 1: Topic and keywords
  const step1Content: A2UINode = {
    type: "column",
    gap: "1rem",
    children: [
      {
        type: "text",
        text: t("taskForm.step1Title"),
        variant: "h3",
        weight: "semibold",
        style: { marginBottom: "0.5rem" },
      },
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
            type: "textarea",
            id: "keywords",
            value: formData.keywords,
            placeholder: t("taskForm.keywordsPlaceholder"),
            rows: 3,
            onChange: { action: "setKeywords" },
          },
        ],
      },
    ],
  }

  // Step 2: React-based materials list with swipeable detail tabs
  const Step2Content = () => (
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

  // Placeholder A2UI node for step 2 (won't be used, replaced by React component)
  const step2Content: A2UINode = {
    type: "column",
    gap: "1rem",
    children: [{ type: "text", text: "" }],
  }

  // Step 3: Cover style prompt
  const step3Content: A2UINode = {
    type: "column",
    gap: "1rem",
    children: [
      {
        type: "text",
        text: t("taskForm.step3Title"),
        variant: "h3",
        weight: "semibold",
        style: { marginBottom: "0.5rem" },
      },
      {
        type: "form-field",
        label: t("taskForm.coverStylePrompt"),
        children: [
          {
            type: "textarea",
            id: "coverPrompt",
            value: formData.coverPrompt,
            placeholder: t("taskForm.coverStylePromptPlaceholder"),
            rows: 6,
            onChange: { action: "setCoverPrompt" },
          },
        ],
      },
    ],
  }

  // Get current step content
  const getCurrentStepContent = (): A2UINode => {
    switch (currentStep) {
      case 1:
        return step1Content
      case 2:
        return step2Content
      case 3:
        return step3Content
      default:
        return step1Content
    }
  }

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
      buttons.push({
        type: "button",
        text: t("taskForm.next"),
        variant: "primary",
        disabled: currentStep === 1 && !formData.topic.trim(),
        onClick: { action: "nextStep" },
      })
    } else {
      buttons.push({
        type: "button",
        text: createMutation.isPending ? t("taskForm.submitting") : t("taskForm.submit"),
        variant: "primary",
        disabled: createMutation.isPending || !formData.topic.trim(),
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

  // For step 2, we render React components directly for swipeable tabs support
  // For steps 1 and 3, we use A2UI nodes
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
          {currentStep === 2 ? (
            <Step2Content />
          ) : (
            <A2UIRenderer node={getCurrentStepContent()} onAction={handleAction} />
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex-shrink-0 border-t border-border bg-card px-4 py-3 md:px-6 md:py-4">
          <A2UIRenderer node={getNavigationButtons()} onAction={handleAction} />
        </div>
      </div>
    </div>
  )
}
