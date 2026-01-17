"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useI18n } from "@/contexts/i18n-context"
import { api } from "@/trpc/react"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UINode, A2UIModalNode } from "@/lib/a2ui"
import { buildMaterialCardNode, type MaterialCardMetric, type MaterialCardBadge } from "@/lib/a2ui"
import type {
  StyleIdentityData,
  LexicalLogicData,
  MetricsConstraintsData,
  RhetoricLogicData,
  GoldenSampleData,
  TransferDemoData,
  BlueprintItem,
  CoreRuleItem,
  AntiPatternItem,
} from "@/types/style-analysis"

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
  // Track whether we've already initialized the form for current open session
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    // Only initialize form when modal transitions from closed to open
    // and we haven't initialized yet for this session
    if (isOpen && !prevIsOpenRef.current && !hasInitializedRef.current) {
      hasInitializedRef.current = true
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

    // Reset initialization flag when modal closes
    if (!isOpen && prevIsOpenRef.current) {
      hasInitializedRef.current = false
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
      const styleIdentity = material.styleIdentity as StyleIdentityData | null
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
      className: `w-7 h-7 min-w-7 rounded-full flex items-center justify-center p-0 text-xs font-medium border-none ${
        isActive || isCompleted
          ? "bg-[var(--ds-primary)] text-[var(--ds-primary-foreground)]"
          : "bg-[var(--ds-muted)] text-[var(--ds-muted-foreground)]"
      } ${isCompleted ? "cursor-pointer" : "cursor-default"}`,
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
      className: `flex-1 min-w-4 max-w-12 h-0.5 mx-1 ${isCompleted ? "bg-[var(--ds-primary)]" : "bg-[var(--ds-muted)]"}`,
    }
  }

  const stepIndicator: A2UINode = {
    type: "row",
    justify: "center",
    align: "center",
    className: "mb-4",
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
    styleName: string | null
    primaryType: string | null
    analysisVersion: string | null
    executionPrompt: string | null
    wordCount: number | null
    paraCount: number | null
    metricsBurstiness: number | null
    metricsTtr: number | null
    styleIdentity: StyleIdentityData | null
    lexicalLogic: LexicalLogicData | null
    metricsConstraints: MetricsConstraintsData | null
    rhetoricLogic: RhetoricLogicData | null
    goldenSample: GoldenSampleData | null
    transferDemo: TransferDemoData | null
    coreRules: CoreRuleItem[] | null
    blueprint: BlueprintItem[] | null
    antiPatterns: AntiPatternItem[] | null
    useCount: number
  }): A2UINode => {
    const styleIdentity = material.styleIdentity
    const lexicalLogic = material.lexicalLogic
    const metricsConstraints = material.metricsConstraints
    const rhetoricLogic = material.rhetoricLogic

    // Style identity data
    const styleName = material.styleName || styleIdentity?.style_name || material.sourceTitle || ""
    const archetype = styleIdentity?.archetype
    const impliedReader = styleIdentity?.implied_reader
    const personaDescription = styleIdentity?.persona_description || styleIdentity?.persona_desc
    const voiceTraits = styleIdentity?.voice_traits
    const voiceFormality = voiceTraits?.formality || styleIdentity?.formality_score
    const voiceEnergy = voiceTraits?.energy || styleIdentity?.energy_level
    const voiceWarmth = voiceTraits?.warmth
    const voiceConfidence = voiceTraits?.confidence
    const voiceDistance = styleIdentity?.voice_distance
    const hasVoiceTraits = voiceFormality || voiceEnergy || voiceWarmth || voiceConfidence || voiceDistance

    // Tone keywords
    const toneKeywordsRaw = styleIdentity?.tone_keywords || lexicalLogic?.tone_keywords
    const toneKeywords: string[] = Array.isArray(toneKeywordsRaw)
      ? toneKeywordsRaw
      : typeof toneKeywordsRaw === "string"
        ? toneKeywordsRaw.split(/[,、，]/).map(s => s.trim()).filter(Boolean)
        : []

    // Metrics
    const primaryType = material.primaryType
    const wordCount = material.wordCount
    const paraCount = material.paraCount
    const burstiness = material.metricsBurstiness
    const ttr = material.metricsTtr
    const avgSentLen = metricsConstraints?.avg_sentence_length
    const useCount = material.useCount

    // Extended lexical logic
    const vocabularyTier = lexicalLogic?.vocabulary_tier
    const preferredTerms = lexicalLogic?.preferred_terms ?? lexicalLogic?.must_use ?? []
    const bannedTerms = lexicalLogic?.banned_terms ?? lexicalLogic?.must_avoid ?? []
    const adjStyle = lexicalLogic?.adj_style
    const verbStyle = lexicalLogic?.verb_style

    // Extended rhetoric logic
    const preferredDevices = rhetoricLogic?.preferred_devices ?? (rhetoricLogic?.dominant_device ? [rhetoricLogic.dominant_device] : [])
    const openingPattern = rhetoricLogic?.opening_pattern
    const closingPattern = rhetoricLogic?.closing_pattern
    const argStyle = rhetoricLogic?.arg_style
    const deviceSample = rhetoricLogic?.device_sample

    // Array data
    const blueprintSections = material.blueprint
    const coreRules = material.coreRules
    const antiPatterns = material.antiPatterns

    // Golden samples and transfer demo
    const goldenSampleData = material.goldenSample
    const goldenSamples = goldenSampleData?.samples ?? (
      goldenSampleData?.paragraph
        ? [{ text: goldenSampleData.paragraph, why: goldenSampleData.reason, tech_list: goldenSampleData.tech_list }]
        : []
    )
    const transferDemoData = material.transferDemo
    const transferPairs = transferDemoData?.before_after_pairs ?? (
      transferDemoData?.new_text
        ? [{ before: undefined, after: transferDemoData.new_text, explanation: transferDemoData.preserved_elements, topic: transferDemoData.new_topic }]
        : []
    )

    const executionPrompt = material.executionPrompt
    const analysisVersion = material.analysisVersion

    const isSelected = formData.selectedMaterialId === material.id

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

    // Build tabs content (always visible like material page)
    const tabNodes: Array<{ label: string; content: A2UINode }> = []

      // === STYLE TAB ===
      const hasStyleInfo = styleName || archetype || impliedReader || personaDescription || hasVoiceTraits || toneKeywords.length > 0
      if (hasStyleInfo) {
        tabNodes.push({
          label: t("reverse.tabStyle"),
          content: {
            type: "column",
            gap: "0.75rem",
            children: [
              ...(styleName ? [{
                type: "row" as const,
                gap: "1rem",
                align: "center" as const,
                children: [
                  { type: "text" as const, text: styleName, variant: "h4" as const },
                  ...(archetype ? [{ type: "badge" as const, text: archetype, color: "info" as const }] : []),
                ],
              }] : []),
              ...(personaDescription ? [{
                type: "column" as const,
                gap: "0.25rem",
                children: [
                  { type: "text" as const, text: t("reverse.personaDescription"), variant: "caption" as const, color: "muted" as const },
                  { type: "text" as const, text: personaDescription, className: "text-[0.8rem] leading-normal" },
                ],
              }] : []),
              ...(hasVoiceTraits ? [{
                type: "row" as const,
                gap: "1rem",
                className: "flex-wrap",
                children: [
                  ...(voiceFormality ? [{ type: "column" as const, gap: "0.125rem", className: "min-w-[70px]", children: [
                    { type: "text" as const, text: t("reverse.voiceFormality"), variant: "caption" as const, color: "muted" as const },
                    { type: "badge" as const, text: voiceFormality, color: "primary" as const },
                  ]}] : []),
                  ...(voiceEnergy ? [{ type: "column" as const, gap: "0.125rem", className: "min-w-[70px]", children: [
                    { type: "text" as const, text: t("reverse.voiceEnergy"), variant: "caption" as const, color: "muted" as const },
                    { type: "badge" as const, text: voiceEnergy, color: "success" as const },
                  ]}] : []),
                  ...(voiceWarmth ? [{ type: "column" as const, gap: "0.125rem", className: "min-w-[70px]", children: [
                    { type: "text" as const, text: t("reverse.voiceWarmth"), variant: "caption" as const, color: "muted" as const },
                    { type: "badge" as const, text: voiceWarmth, color: "warning" as const },
                  ]}] : []),
                  ...(voiceConfidence ? [{ type: "column" as const, gap: "0.125rem", className: "min-w-[70px]", children: [
                    { type: "text" as const, text: t("reverse.voiceConfidence"), variant: "caption" as const, color: "muted" as const },
                    { type: "badge" as const, text: voiceConfidence, color: "default" as const },
                  ]}] : []),
                ],
              }] : []),
              ...(impliedReader ? [{
                type: "row" as const,
                gap: "0.5rem",
                align: "center" as const,
                children: [
                  { type: "text" as const, text: t("reverse.targetAudience") + ":", variant: "caption" as const, color: "muted" as const },
                  { type: "text" as const, text: impliedReader, className: "text-[0.8rem]" },
                ],
              }] : []),
              ...(toneKeywords.length > 0 ? [{
                type: "row" as const,
                gap: "0.25rem",
                className: "flex-wrap",
                align: "center" as const,
                children: [
                  { type: "text" as const, text: t("reverse.toneKeywords") + ":", variant: "caption" as const, color: "muted" as const },
                  ...toneKeywords.map((k) => ({ type: "badge" as const, text: k, color: "default" as const })),
                ],
              }] : []),
            ],
          },
        })
      }

      // === RULES TAB ===
      const hasCoreRules = coreRules && coreRules.length > 0
      const hasLexicalContent = vocabularyTier || preferredTerms.length > 0 || bannedTerms.length > 0 || adjStyle || verbStyle
      const hasRhetoricContent = preferredDevices.length > 0 || openingPattern || closingPattern || argStyle || deviceSample
      const hasAntiPatterns = antiPatterns && antiPatterns.length > 0
      const hasRulesContent = hasCoreRules || hasLexicalContent || hasRhetoricContent || hasAntiPatterns

      if (hasRulesContent) {
        tabNodes.push({
          label: t("reverse.tabRules"),
          content: {
            type: "column",
            gap: "0.5rem",
            children: [
              ...(hasCoreRules ? [{
                type: "collapsible" as const,
                title: t("reverse.coreRulesSection"),
                subtitle: `${coreRules!.length} 条规则`,
                defaultOpen: true,
                children: [{
                  type: "column" as const,
                  gap: "0.5rem",
                  children: coreRules!.slice(0, 5).map((rule) => ({
                    type: "column" as const,
                    gap: "0.25rem",
                    className: "p-2 bg-muted rounded border-l-[3px] border-l-[var(--ds-primary)]",
                    children: [
                      { type: "row" as const, justify: "between" as const, children: [
                        { type: "text" as const, text: rule.rule || rule.rule_text || rule.feature || "规则", className: "text-[0.85rem] font-medium" },
                        ...(rule.impact ? [{ type: "badge" as const, text: `影响: ${rule.impact}`, color: "info" as const }] : []),
                      ]},
                      ...(rule.evidence ? [{ type: "text" as const, text: rule.evidence, variant: "caption" as const, className: "text-xs" }] : []),
                      ...(rule.example ? [{ type: "text" as const, text: `示例: ${rule.example}`, variant: "caption" as const, color: "muted" as const, className: "text-xs italic" }] : []),
                    ],
                  })),
                }],
              }] : []),
              ...(hasLexicalContent ? [{
                type: "collapsible" as const,
                title: t("reverse.lexicalSection"),
                defaultOpen: false,
                children: [{
                  type: "column" as const,
                  gap: "0.5rem",
                  children: [
                    ...(vocabularyTier ? [{ type: "row" as const, gap: "0.5rem", align: "center" as const, children: [
                      { type: "text" as const, text: t("reverse.vocabularyTier") + ":", variant: "caption" as const, color: "muted" as const },
                      { type: "badge" as const, text: vocabularyTier, color: "primary" as const },
                    ]}] : []),
                    ...(preferredTerms.length > 0 ? [{ type: "column" as const, gap: "0.25rem", children: [
                      { type: "text" as const, text: t("reverse.preferredTerms"), variant: "caption" as const, color: "muted" as const },
                      { type: "row" as const, gap: "0.25rem", className: "flex-wrap", children: preferredTerms.slice(0, 12).map((term) => ({ type: "badge" as const, text: term, color: "success" as const })) },
                    ]}] : []),
                    ...(bannedTerms.length > 0 ? [{ type: "column" as const, gap: "0.25rem", children: [
                      { type: "text" as const, text: t("reverse.bannedTerms"), variant: "caption" as const, color: "muted" as const },
                      { type: "row" as const, gap: "0.25rem", className: "flex-wrap", children: bannedTerms.slice(0, 12).map((term) => ({ type: "badge" as const, text: term, color: "destructive" as const })) },
                    ]}] : []),
                    ...(adjStyle ? [{ type: "text" as const, text: `形容词: ${adjStyle}`, variant: "caption" as const, className: "text-[0.8rem]" }] : []),
                    ...(verbStyle ? [{ type: "text" as const, text: `动词: ${verbStyle}`, variant: "caption" as const, className: "text-[0.8rem]" }] : []),
                  ],
                }],
              }] : []),
              ...(hasRhetoricContent ? [{
                type: "collapsible" as const,
                title: t("reverse.rhetoricSection"),
                defaultOpen: false,
                children: [{
                  type: "column" as const,
                  gap: "0.5rem",
                  children: [
                    ...(preferredDevices.length > 0 ? [{ type: "row" as const, gap: "0.25rem", className: "flex-wrap", children: [
                      { type: "text" as const, text: t("reverse.preferredDevices") + ":", variant: "caption" as const, color: "muted" as const },
                      ...preferredDevices.slice(0, 8).map((device) => ({ type: "badge" as const, text: device, color: "info" as const })),
                    ]}] : []),
                    ...(openingPattern ? [{ type: "column" as const, gap: "0.125rem", children: [
                      { type: "text" as const, text: "开场模式:", variant: "caption" as const, color: "muted" as const },
                      { type: "text" as const, text: openingPattern, className: "text-[0.8rem] px-2 py-1 bg-muted rounded" },
                    ]}] : []),
                    ...(closingPattern ? [{ type: "column" as const, gap: "0.125rem", children: [
                      { type: "text" as const, text: "收尾模式:", variant: "caption" as const, color: "muted" as const },
                      { type: "text" as const, text: closingPattern, className: "text-[0.8rem] px-2 py-1 bg-muted rounded" },
                    ]}] : []),
                    ...(argStyle ? [{ type: "text" as const, text: `论证风格: ${argStyle}`, variant: "caption" as const, className: "text-[0.8rem]" }] : []),
                    ...(deviceSample ? [{ type: "text" as const, text: `示例: "${deviceSample}"`, className: "text-[0.8rem] italic px-2 py-1 bg-blue-500/10 rounded" }] : []),
                  ],
                }],
              }] : []),
              ...(hasAntiPatterns ? [{
                type: "collapsible" as const,
                title: t("reverse.antiPatternsSection"),
                subtitle: `${antiPatterns!.length} 条`,
                defaultOpen: false,
                children: [{
                  type: "column" as const,
                  gap: "0.375rem",
                  children: antiPatterns!.slice(0, 5).map((ap) => ({
                    type: "column" as const,
                    gap: "0.125rem",
                    className: "px-2 py-1.5 bg-red-500/5 rounded border-l-2 border-l-destructive",
                    children: [
                      { type: "text" as const, text: `⚠️ ${ap.forbidden || ap.pattern || ""}`, className: "text-[0.8rem] text-destructive" },
                      ...(ap.bad_case ? [{ type: "text" as const, text: `反例: "${ap.bad_case}"`, variant: "caption" as const, color: "muted" as const, className: "text-xs italic" }] : []),
                    ],
                  })),
                }],
              }] : []),
            ],
          },
        })
      }

      // === BLUEPRINT TAB ===
      const hasBlueprint = blueprintSections && blueprintSections.length > 0
      if (hasBlueprint) {
        const isNewFormat = blueprintSections[0]?.p_id !== undefined
        tabNodes.push({
          label: t("reverse.tabBlueprint"),
          content: {
            type: "column",
            gap: "0.5rem",
            children: blueprintSections.map((section, idx) => {
              if (isNewFormat) {
                const pId = section.p_id || `${idx + 1}`
                const strategy = section.strategy || ""
                const action = section.action || ""
                const guidelines = section.guidelines || ""
                const patternSample = section.pattern_sample || ""
                const patternTemplate = section.pattern_template || ""

                const previewChildren: A2UINode[] = guidelines ? [{
                  type: "text" as const,
                  text: guidelines,
                  variant: "caption" as const,
                  className: `text-[0.8rem] p-2 rounded ${
                    guidelines.startsWith("✅")
                      ? "bg-green-500/10 border-l-[3px] border-l-success"
                      : guidelines.startsWith("❌")
                        ? "bg-red-500/10 border-l-[3px] border-l-destructive"
                        : "bg-muted"
                  }`,
                }] : []

                const expandableChildren: A2UINode[] = [
                  ...(patternSample ? [{ type: "column" as const, gap: "0.25rem", children: [
                    { type: "text" as const, text: "示例", variant: "caption" as const, color: "muted" as const },
                    { type: "text" as const, text: `"${patternSample}"`, className: "text-[0.8rem] italic p-2 bg-muted rounded border-l-[3px] border-l-[var(--ds-primary)]" },
                  ]}] : []),
                  ...(patternTemplate ? [{ type: "column" as const, gap: "0.25rem", children: [
                    { type: "text" as const, text: "句式模板", variant: "caption" as const, color: "muted" as const },
                    { type: "text" as const, text: patternTemplate, className: "text-xs font-mono p-2 bg-muted rounded" },
                  ]}] : []),
                ]

                return {
                  type: "collapsible" as const,
                  title: `${pId}. ${strategy}`,
                  summary: action || undefined,
                  previewChildren: previewChildren.length > 0 ? previewChildren : undefined,
                  defaultOpen: idx === 0,
                  badges: [],
                  children: expandableChildren.length > 0 ? [{ type: "column" as const, gap: "0.75rem", children: expandableChildren }] : undefined,
                }
              } else {
                const sectionName = section.section || ""
                const position = section.position || section.section_position || ""
                const wordTarget = section.word_count_target
                const wordPct = section.word_percentage || ""
                const func = section.function || ""
                const badges: Array<{ text: string; color: string }> = []
                if (position) badges.push({ text: position, color: "default" })
                if (wordTarget) badges.push({ text: `${wordTarget}字`, color: "info" })
                if (wordPct) badges.push({ text: wordPct, color: "primary" })

                return {
                  type: "collapsible" as const,
                  title: `${idx + 1}. ${sectionName}`,
                  subtitle: func,
                  defaultOpen: idx === 0,
                  badges,
                  children: func ? [{ type: "text" as const, text: func, variant: "caption" as const, color: "muted" as const }] : undefined,
                }
              }
            }),
          },
        })
      }

      // === SAMPLES TAB ===
      const hasGoldenSamples = goldenSamples && goldenSamples.length > 0
      const hasTransferDemo = transferPairs && transferPairs.length > 0
      const hasSamplesContent = hasGoldenSamples || hasTransferDemo

      if (hasSamplesContent) {
        tabNodes.push({
          label: t("reverse.tabSamples"),
          content: {
            type: "column",
            gap: "0.5rem",
            children: [
              ...(hasGoldenSamples ? [{
                type: "collapsible" as const,
                title: t("reverse.goldenSamplesSection"),
                subtitle: `${goldenSamples.length} 个样本`,
                defaultOpen: true,
                children: [{
                  type: "column" as const,
                  gap: "0.5rem",
                  children: goldenSamples.map((sample) => ({
                    type: "column" as const,
                    gap: "0.375rem",
                    className: "p-2 bg-muted rounded-md border-l-[3px] border-l-success",
                    children: [
                      ...(sample.text ? [{ type: "text" as const, text: sample.text, className: "text-[0.85rem] leading-relaxed whitespace-pre-wrap" }] : []),
                      ...(sample.why ? [{ type: "text" as const, text: `入选理由: ${sample.why}`, className: "text-xs italic text-success" }] : []),
                      ...((sample as { tech_list?: string[] }).tech_list && (sample as { tech_list?: string[] }).tech_list!.length > 0 ? [{
                        type: "row" as const,
                        gap: "0.25rem",
                        className: "flex-wrap",
                        children: [
                          { type: "text" as const, text: "技巧:", variant: "caption" as const, color: "muted" as const },
                          ...(sample as { tech_list?: string[] }).tech_list!.map((tech) => ({ type: "badge" as const, text: tech, color: "info" as const })),
                        ],
                      }] : []),
                    ],
                  })),
                }],
              }] : []),
              ...(hasTransferDemo ? [{
                type: "collapsible" as const,
                title: t("reverse.transferDemoSection"),
                subtitle: `${transferPairs.length} 个示例`,
                defaultOpen: !hasGoldenSamples,
                children: [{
                  type: "column" as const,
                  gap: "0.5rem",
                  children: transferPairs.map((pair) => {
                    const pairWithTopic = pair as { before?: string; after?: string; explanation?: string; topic?: string }
                    return {
                      type: "column" as const,
                      gap: "0.375rem",
                      className: "p-2 bg-muted rounded-md",
                      children: [
                        ...(pairWithTopic.topic ? [{ type: "text" as const, text: pairWithTopic.topic, className: "text-[0.85rem] font-medium" }] : []),
                        ...(pair.after ? [{ type: "text" as const, text: pair.after, className: "text-[0.85rem] leading-normal bg-green-500/5 p-2 rounded whitespace-pre-wrap" }] : []),
                        ...(pair.explanation ? [{ type: "text" as const, text: `保留元素: ${pair.explanation}`, className: "text-xs italic text-muted-foreground" }] : []),
                      ],
                    }
                  }),
                }],
              }] : []),
            ],
          },
        })
      }

      // === PROMPT TAB ===
      const hasMetrics = wordCount != null || paraCount != null || burstiness != null || ttr != null || avgSentLen != null
      const hasExecutionPrompt = executionPrompt && executionPrompt.trim().length > 0
      const hasPromptContent = hasMetrics || hasExecutionPrompt

      if (hasPromptContent) {
        tabNodes.push({
          label: t("reverse.tabPrompt"),
          content: {
            type: "column",
            gap: "0.75rem",
            children: [
              ...(hasMetrics ? [{
                type: "row" as const,
                gap: "1rem",
                className: "flex-wrap p-2 bg-muted rounded-md",
                children: [
                  ...(wordCount != null ? [{ type: "column" as const, gap: "0.125rem", className: "text-center min-w-[50px]", children: [
                    { type: "text" as const, text: wordCount.toString(), variant: "h4" as const },
                    { type: "text" as const, text: "字", variant: "caption" as const, color: "muted" as const },
                  ]}] : []),
                  ...(paraCount != null ? [{ type: "column" as const, gap: "0.125rem", className: "text-center min-w-[50px]", children: [
                    { type: "text" as const, text: paraCount.toString(), variant: "h4" as const },
                    { type: "text" as const, text: "段", variant: "caption" as const, color: "muted" as const },
                  ]}] : []),
                      ...(ttr != null ? [{ type: "column" as const, gap: "0.125rem", className: "text-center min-w-[50px]", children: [
                        { type: "text" as const, text: (ttr * 100).toFixed(0) + "%", variant: "h4" as const },
                        { type: "text" as const, text: "TTR", variant: "caption" as const, color: "muted" as const },
                      ]}] : []),
                      ...(material.useCount != null ? [{ type: "column" as const, gap: "0.125rem", className: "text-center min-w-[50px]", children: [
                        { type: "text" as const, text: material.useCount.toString(), variant: "h4" as const },
                        { type: "text" as const, text: t("reverse.useCount"), variant: "caption" as const, color: "muted" as const },
                      ]}] : []),
                      ...(burstiness != null ? [{ type: "column" as const, gap: "0.125rem", className: "text-center min-w-[50px]", children: [

                    { type: "text" as const, text: (burstiness * 100).toFixed(0) + "%", variant: "h4" as const },
                    { type: "text" as const, text: "突变度", variant: "caption" as const, color: "muted" as const },
                  ]}] : []),
                  ...(avgSentLen != null ? [{ type: "column" as const, gap: "0.125rem", className: "text-center min-w-[50px]", children: [
                    { type: "text" as const, text: avgSentLen.toFixed(0), variant: "h4" as const },
                    { type: "text" as const, text: "句长", variant: "caption" as const, color: "muted" as const },
                  ]}] : []),
                ],
              }] : []),
              ...(hasExecutionPrompt ? [
                { type: "divider" as const },
                { type: "text" as const, text: t("reverse.executionPromptLabel"), variant: "label" as const, color: "muted" as const },
                {
                  type: "text" as const,
                  text: executionPrompt,
                  className: "text-[0.85rem] leading-relaxed whitespace-pre-wrap bg-muted p-3 rounded-md font-mono",
                },
              ] : []),
            ],
          },
        })
      }

    // Build extraContent with tabs
    const extraContent: A2UINode[] = []
    if (tabNodes.length > 0) {
      extraContent.push({
        type: "container",
        className: "mt-2",
        children: [{ type: "tabs", tabs: tabNodes }],
      })
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
      extraContent,
      version: analysisVersion ?? undefined,
      onClick: { action: "selectMaterial", args: [material.id] },
      selected: isSelected,
      hoverable: false,
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
        className: "items-center p-4",
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
    useCount: number
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
            className: "flex-1 min-w-0",
            children: [
              { type: "text" as const, text: prompt.title, weight: "medium" as const },
              ...(badges.length > 0
                ? [{ type: "row" as const, gap: "0.25rem", wrap: true, children: badges }]
                : []),
              {
                type: "row",
                gap: "0.5rem",
                align: "center",
                children: [
                  { type: "text" as const, text: t("imagePrompts.usageCount", { count: prompt.useCount }), variant: "caption" as const, color: "muted" as const },
                  { type: "text" as const, text: prompt.prompt, variant: "caption" as const, color: "muted" as const, className: "truncate" },
                ]
              },
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
                  className: "rounded-lg object-cover",
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
      className: isSelected
        ? "border-[var(--ds-primary)] border-2 bg-[var(--ds-accent)]"
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
    className: "max-w-[42rem]",
    children: [
      {
        type: "column",
        gap: "1rem",
        children: [
          {
            type: "container",
            className: "max-h-[60vh] overflow-y-auto",
            children: [stepIndicator, stepContent],
          },
          getNavigationButtons(),
        ],
      },
    ],
  }

  return <A2UIRenderer node={modalNode} onAction={handleAction} />
}
