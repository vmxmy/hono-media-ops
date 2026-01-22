"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useSession } from "next-auth/react"
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { DashboardShell } from "@/components/dashboard-shell"
import { A2UIRenderer, a2uiToast, showConfirmToast } from "@/components/a2ui"
import type { A2UIColumnNode, A2UINode, A2UIRowNode } from "@/lib/a2ui"
import { buildMaterialCardNode, type MaterialCardBadge, type MaterialCardAction, type MaterialCardMetric } from "@/lib/a2ui"
import type {
  StyleIdentityData,
  MetricsConstraintsData,
  LexicalLogicData,
  RhetoricLogicData,
  GoldenSampleData,
  TransferDemoData,
  BlueprintItem,
  CoreRuleItem,
  AntiPatternItem,
} from "@/types/style-analysis"

// Mobile breakpoint (matches Tailwind md:)
const MOBILE_BREAKPOINT = 768

interface StyleAnalysis {
  id: string
  userId: string
  sourceUrl: string | null
  sourceTitle: string | null
  styleName: string | null
  primaryType: string | null
  analysisVersion: string | null
  executionPrompt: string | null
  wordCount: number | null
  paraCount: number | null
  metricsBurstiness: number | null
  metricsTtr: number | null
  useCount: number | null
  styleIdentity: StyleIdentityData | null
  metricsConstraints: MetricsConstraintsData | null
  lexicalLogic: LexicalLogicData | null
  rhetoricLogic: RhetoricLogicData | null
  goldenSample: GoldenSampleData | null
  transferDemo: TransferDemoData | null
  coreRules: CoreRuleItem[] | null
  blueprint: BlueprintItem[] | null
  antiPatterns: AntiPatternItem[] | null
  rawJsonFull: unknown
  status: "PENDING" | "SUCCESS" | "FAILED"
  createdAt: Date | null
  updatedAt: Date | null
  deletedAt: Date | null
}

export default function ReversePage() {
  const { t } = useI18n()
  const { status } = useSession()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<StyleAnalysis | null>(null)
  // 复刻任务 modal 状态
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false)
  const [cloneMaterialId, setCloneMaterialId] = useState<string | null>(null)
  // 视图模式: 卡片 or 列表
  const [viewMode, setViewMode] = useState<"card" | "list">("card")
  const [isMobile, setIsMobile] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const utils = api.useUtils()
  // 使用混合搜索 (关键词 + 向量) 当有搜索词时
  const { data, isLoading } = api.reverseLogs.hybridSearch.useQuery(
    { page: 1, pageSize: 50, search: searchQuery || undefined, useVectorSearch: true },
    { enabled: status !== "loading" }
  )

  const deleteMutation = api.reverseLogs.delete.useMutation({
    onSuccess: () => {
      utils.reverseLogs.hybridSearch.invalidate()
    },
  })

  const logs = data?.logs ?? []

  const formatDate = (date: Date | null) => {
    if (!date) return "-"
    return new Date(date).toLocaleString()
  }

  const handleSuccess = useCallback(() => {
    utils.reverseLogs.hybridSearch.invalidate()
  }, [utils])

  // Build list content
  const buildListNode = (): A2UINode => {
    if (isLoading) {
      return { type: "text", text: t("common.loading"), color: "muted" }
    }

    if (logs.length === 0) {
      const hasSearch = searchQuery.trim().length > 0
      return {
        type: "card",
        hoverable: false,
        className: "p-8 text-center",
        children: [
          {
            type: "column",
            gap: "0.75rem",
            className: "items-center",
            children: [
              { type: "text", text: hasSearch ? t("reverse.noSearchResults") : t("reverse.noRecords"), color: "muted" },
              ...(hasSearch ? [
                { type: "text", text: t("reverse.tryDifferentKeywords"), variant: "caption", color: "muted" } as A2UINode,
                { type: "button", text: t("reverse.clearSearch"), variant: "secondary", size: "sm", onClick: { action: "clearSearch" } } as A2UINode,
              ] : []),
            ],
          },
        ],
      }
    }

    const logCards: A2UINode[] = logs.map((log) => {
      const analysis = log as StyleAnalysis

      // Extract from JSONB fields
      const styleIdentity = analysis.styleIdentity
      const metricsConstraints = analysis.metricsConstraints
      const lexicalLogic = analysis.lexicalLogic
      const rhetoricLogic = analysis.rhetoricLogic

      // Style identity data - 兼容 v7.0 和 v7.3 字段名
      const styleName = analysis.styleName || styleIdentity?.style_name || analysis.sourceTitle || ""
      const archetype = styleIdentity?.archetype
      const impliedReader = styleIdentity?.implied_reader
      const personaDescription = styleIdentity?.persona_description || styleIdentity?.persona_desc
      const voiceTraits = styleIdentity?.voice_traits

      // Voice traits - 兼容 v7.0 (顶层字段) 和 v7.3 (嵌套字段)
      const voiceFormality = voiceTraits?.formality || styleIdentity?.formality_score
      const voiceEnergy = voiceTraits?.energy || styleIdentity?.energy_level
      const voiceWarmth = voiceTraits?.warmth
      const voiceConfidence = voiceTraits?.confidence
      const voiceDistance = styleIdentity?.voice_distance
      const hasVoiceTraits = voiceFormality || voiceEnergy || voiceWarmth || voiceConfidence || voiceDistance

      // Tone keywords - 可能是 style_identity_data 中的字符串，或 lexical_logic_data 中的数组
      const toneKeywordsRaw = styleIdentity?.tone_keywords || lexicalLogic?.tone_keywords
      const toneKeywords: string[] = Array.isArray(toneKeywordsRaw)
        ? toneKeywordsRaw
        : typeof toneKeywordsRaw === "string"
          ? toneKeywordsRaw.split(/[,、，]/).map(s => s.trim()).filter(Boolean)
          : []

      // Metrics
      const wordCount = analysis.wordCount
      const paraCount = analysis.paraCount
      const burstiness = analysis.metricsBurstiness
      const ttr = analysis.metricsTtr
      const avgSentLen = metricsConstraints?.avg_sentence_length
      const avgParaLen = metricsConstraints?.avg_paragraph_length

      // Rhetoric logic data
      const sentenceTemplates = rhetoricLogic?.sentence_templates

      // Array data
      const blueprintSections = analysis.blueprint
      const coreRules = analysis.coreRules
      const antiPatterns = analysis.antiPatterns

      // Golden samples and transfer demo - 兼容 v7.0 和 v7.3 格式
      const goldenSampleData = analysis.goldenSample
      const goldenSamples = goldenSampleData?.samples ?? (
        goldenSampleData?.paragraph
          ? [{ text: goldenSampleData.paragraph, why: goldenSampleData.reason, tech_list: goldenSampleData.tech_list }]
          : []
      )
      const transferDemoData = analysis.transferDemo
      const transferPairs = transferDemoData?.before_after_pairs ?? (
        transferDemoData?.new_text
          ? [{ before: undefined, after: transferDemoData.new_text, explanation: transferDemoData.preserved_elements, topic: transferDemoData.new_topic }]
          : []
      )

      // Extended lexical logic - 兼容 v7.0 字段名
      const vocabularyTier = lexicalLogic?.vocabulary_tier
      const preferredTerms = lexicalLogic?.preferred_terms ?? lexicalLogic?.must_use ?? []
      const bannedTerms = lexicalLogic?.banned_terms ?? lexicalLogic?.must_avoid ?? []
      const adjStyle = lexicalLogic?.adj_style
      const verbStyle = lexicalLogic?.verb_style

      // Extended rhetoric logic - 兼容 v7.0 字段名
      const preferredDevices = rhetoricLogic?.preferred_devices ?? (rhetoricLogic?.dominant_device ? [rhetoricLogic.dominant_device] : [])
      const deviceFrequency = rhetoricLogic?.device_frequency
      const openingPattern = rhetoricLogic?.opening_pattern
      const closingPattern = rhetoricLogic?.closing_pattern
      const argStyle = rhetoricLogic?.arg_style
      const deviceSample = rhetoricLogic?.device_sample

      // Execution prompt and version
      const executionPrompt = analysis.executionPrompt
      const analysisVersion = analysis.analysisVersion

      // Primary type
      const primaryType = analysis.primaryType

      // === STYLE TAB (整合 Voice) ===
      const hasStyleInfo = styleName || archetype || impliedReader || personaDescription || hasVoiceTraits || toneKeywords.length > 0
      const styleTabContent: A2UINode = {
        type: "column",
        gap: "0.75rem",
        children: hasStyleInfo
          ? [
              // Style name with archetype
              ...(styleName
                ? [
                    {
                      type: "row" as const,
                      gap: "1rem",
                      align: "center" as const,
                      children: [
                        { type: "text" as const, text: styleName, variant: "h4" as const },
                        ...(archetype ? [{ type: "badge" as const, text: archetype, color: "info" as const }] : []),
                      ],
                    },
                  ]
                : []),
              // Persona description
              ...(personaDescription
                ? [
                    {
                      type: "column" as const,
                      gap: "0.25rem",
                      children: [
                        { type: "text" as const, text: t("reverse.personaDescription"), variant: "caption" as const, color: "muted" as const },
                        { type: "text" as const, text: personaDescription, className: "text-[0.8rem] leading-normal" },
                      ],
                    },
                  ]
                : []),
              // Voice traits (integrated from Voice Tab) - 横向排列
              ...(hasVoiceTraits
                ? [
                    {
                      type: "row" as const,
                      gap: "1rem",
                      className: "flex-wrap",
                      children: [
                        ...(voiceFormality
                          ? [
                              {
                                type: "column" as const,
                                gap: "0.125rem",
                                className: "min-w-[70px]",
                                children: [
                                  { type: "text" as const, text: t("reverse.voiceFormality"), variant: "caption" as const, color: "muted" as const },
                                  { type: "badge" as const, text: voiceFormality, color: "primary" as const },
                                ],
                              },
                            ]
                          : []),
                        ...(voiceEnergy
                          ? [
                              {
                                type: "column" as const,
                                gap: "0.125rem",
                                className: "min-w-[70px]",
                                children: [
                                  { type: "text" as const, text: t("reverse.voiceEnergy"), variant: "caption" as const, color: "muted" as const },
                                  { type: "badge" as const, text: voiceEnergy, color: "success" as const },
                                ],
                              },
                            ]
                          : []),
                        ...(voiceWarmth
                          ? [
                              {
                                type: "column" as const,
                                gap: "0.125rem",
                                className: "min-w-[70px]",
                                children: [
                                  { type: "text" as const, text: t("reverse.voiceWarmth"), variant: "caption" as const, color: "muted" as const },
                                  { type: "badge" as const, text: voiceWarmth, color: "warning" as const },
                                ],
                              },
                            ]
                          : []),
                        ...(voiceConfidence
                          ? [
                              {
                                type: "column" as const,
                                gap: "0.125rem",
                                className: "min-w-[70px]",
                                children: [
                                  { type: "text" as const, text: t("reverse.voiceConfidence"), variant: "caption" as const, color: "muted" as const },
                                  { type: "badge" as const, text: voiceConfidence, color: "default" as const },
                                ],
                              },
                            ]
                          : []),
                        ...(voiceDistance
                          ? [
                              {
                                type: "column" as const,
                                gap: "0.125rem",
                                className: "min-w-[70px]",
                                children: [
                                  { type: "text" as const, text: "距离", variant: "caption" as const, color: "muted" as const },
                                  { type: "badge" as const, text: voiceDistance, color: "default" as const },
                                ],
                              },
                            ]
                          : []),
                      ],
                    },
                  ]
                : []),
              // Target audience
              ...(impliedReader
                ? [
                    {
                      type: "row" as const,
                      gap: "0.5rem",
                      align: "center" as const,
                      children: [
                        { type: "text" as const, text: t("reverse.targetAudience") + ":", variant: "caption" as const, color: "muted" as const },
                        { type: "text" as const, text: impliedReader, className: "text-[0.8rem]" },
                      ],
                    },
                  ]
                : []),
              // Tone keywords
              ...(toneKeywords.length > 0
                ? [
                    {
                      type: "row" as const,
                      gap: "0.25rem",
                      className: "flex-wrap",
                      align: "center" as const,
                      children: [
                        { type: "text" as const, text: t("reverse.toneKeywords") + ":", variant: "caption" as const, color: "muted" as const },
                        ...toneKeywords.map((k) => ({ type: "badge" as const, text: k, color: "default" as const })),
                      ],
                    },
                  ]
                : []),
            ]
          : [{ type: "text" as const, text: t("reverse.noContent"), color: "muted" as const }],
      }

      // === hasMetrics flag (用于 Prompt Tab) ===
      const hasMetrics = wordCount != null || paraCount != null || burstiness != null || ttr != null || avgSentLen != null || avgParaLen != null

      // === BLUEPRINT TAB ===
      const hasBlueprint = blueprintSections && blueprintSections.length > 0
      // 检测数据格式：新版有 p_id/strategy/action，旧版有 section/function
      const isNewFormat = hasBlueprint && blueprintSections[0]?.p_id !== undefined

      const blueprintTabContent: A2UINode = {
        type: "column",
        gap: "0.5rem",
        children: hasBlueprint
          ? blueprintSections.map((section, idx) => {
              if (isNewFormat) {
                // 新版格式 (v7.3): p_id, strategy, action, guidelines, pattern_sample, pattern_template
                const pId = section.p_id || `${idx + 1}`
                const strategy = section.strategy || ""
                const action = section.action || ""
                const guidelines = section.guidelines || ""
                const patternSample = section.pattern_sample || ""
                const patternTemplate = section.pattern_template || ""

                // 预览内容 (始终可见): guidelines
                const previewChildren: A2UINode[] = []

                // Guidelines (指南) - 始终显示
                if (guidelines) {
                  previewChildren.push({
                    type: "text" as const,
                    text: guidelines,
                    variant: "caption" as const,
                    className: `text-[0.8rem] p-2 rounded ${
                      guidelines.startsWith("✅")
                        ? "bg-[rgba(34,197,94,0.1)] border-l-[3px] border-success"
                        : guidelines.startsWith("❌")
                        ? "bg-[rgba(239,68,68,0.1)] border-l-[3px] border-destructive"
                        : "bg-muted"
                    }`,
                  })
                }

                // 展开后显示的详细内容: pattern_sample + pattern_template
                const expandableChildren: A2UINode[] = []

                // Pattern sample (示例)
                if (patternSample) {
                  expandableChildren.push({
                    type: "column" as const,
                    gap: "0.25rem",
                    children: [
                      { type: "text" as const, text: "示例", variant: "caption" as const, color: "muted" as const },
                      {
                        type: "text" as const,
                        text: `"${patternSample}"`,
                        className: "text-[0.8rem] italic p-2 bg-muted rounded border-l-[3px] border-primary",
                      },
                    ],
                  })
                }

                // Pattern template (模板)
                if (patternTemplate) {
                  expandableChildren.push({
                    type: "column" as const,
                    gap: "0.25rem",
                    children: [
                      { type: "text" as const, text: "句式模板", variant: "caption" as const, color: "muted" as const },
                      {
                        type: "text" as const,
                        text: patternTemplate,
                        className: "text-[0.75rem] font-mono p-2 bg-muted rounded",
                      },
                    ],
                  })
                }

                return {
                  type: "collapsible" as const,
                  title: `${pId}. ${strategy}`,
                  summary: action || undefined, // action 作为摘要始终显示（空字符串转为undefined）
                  previewChildren: previewChildren.length > 0 ? previewChildren : undefined,
                  defaultOpen: idx === 0,
                  badges: [],
                  children: expandableChildren.length > 0
                    ? [{ type: "column" as const, gap: "0.75rem", children: expandableChildren }]
                    : undefined,
                }
              } else {
                // 旧版格式: section, function, techniques, do_list, dont_list
                const sectionName = section.section || ""
                const position = section.position || section.section_position || ""
                const wordTarget = section.word_count_target
                const wordPct = section.word_percentage || ""
                const func = section.function || ""
                const techniques = section.techniques
                const doList = section.do_list
                const dontList = section.dont_list
                const internalLogic = section.internal_logic
                const sentencePatterns = section.sentence_patterns

                // Build badges array for collapsible header
                const badges: Array<{ text: string; color: string }> = []
                if (position) badges.push({ text: position, color: "default" })
                if (wordTarget) badges.push({ text: `${wordTarget}字`, color: "info" })
                if (wordPct) badges.push({ text: wordPct, color: "primary" })

                // Build collapsible children content
                const collapsibleChildren: A2UINode[] = []

                // Techniques section
                if (techniques && techniques.length > 0) {
                  collapsibleChildren.push({
                    type: "column" as const,
                    gap: "0.375rem",
                    children: [
                      { type: "text" as const, text: "写作技巧", variant: "label" as const, color: "muted" as const },
                      {
                        type: "row" as const,
                        gap: "0.375rem",
                        className: "flex-wrap",
                        children: techniques.map((tech) => ({
                          type: "badge" as const,
                          text: typeof tech === "string" ? tech : ((tech as { name?: string; technique?: string }).name || (tech as { name?: string; technique?: string }).technique || JSON.stringify(tech).slice(0, 30)),
                          color: "success" as const,
                        })),
                      },
                    ],
                  })
                }

                // Do list
                if (doList && doList.length > 0) {
                  collapsibleChildren.push({
                    type: "column" as const,
                    gap: "0.25rem",
                    children: [
                      { type: "text" as const, text: "✓ 推荐做法", variant: "label" as const, className: "text-success" },
                      ...doList.map((item) => ({
                        type: "text" as const,
                        text: `• ${item}`,
                        variant: "caption" as const,
                        className: "text-[0.8rem] pl-2",
                      })),
                    ],
                  })
                }

                // Don't list
                if (dontList && dontList.length > 0) {
                  collapsibleChildren.push({
                    type: "column" as const,
                    gap: "0.25rem",
                    children: [
                      { type: "text" as const, text: "✗ 避免做法", variant: "label" as const, className: "text-destructive" },
                      ...dontList.map((item) => ({
                        type: "text" as const,
                        text: `• ${item}`,
                        variant: "caption" as const,
                        className: "text-[0.8rem] pl-2",
                      })),
                    ],
                  })
                }

                // Internal logic
                if (internalLogic && Object.keys(internalLogic).length > 0) {
                  const logicText = typeof internalLogic === "string"
                    ? internalLogic
                    : (internalLogic.description as string) || (internalLogic.logic as string) || JSON.stringify(internalLogic, null, 2)
                  collapsibleChildren.push({
                    type: "column" as const,
                    gap: "0.25rem",
                    children: [
                      { type: "text" as const, text: "内部逻辑", variant: "label" as const, color: "muted" as const },
                      {
                        type: "text" as const,
                        text: logicText,
                        variant: "caption" as const,
                        className: "text-[0.75rem] whitespace-pre-wrap bg-muted p-2 rounded",
                      },
                    ],
                  })
                }

                // Sentence patterns
                if (sentencePatterns && Object.keys(sentencePatterns).length > 0) {
                  const patternText = typeof sentencePatterns === "string"
                    ? sentencePatterns
                    : JSON.stringify(sentencePatterns, null, 2)
                  collapsibleChildren.push({
                    type: "column" as const,
                    gap: "0.25rem",
                    children: [
                      { type: "text" as const, text: "句式模式", variant: "label" as const, color: "muted" as const },
                      {
                        type: "text" as const,
                        text: patternText,
                        variant: "caption" as const,
                        className: "text-[0.75rem] whitespace-pre-wrap bg-muted p-2 rounded",
                      },
                    ],
                  })
                }

                // If no detailed content, show function description
                if (collapsibleChildren.length === 0 && func) {
                  collapsibleChildren.push({
                    type: "text" as const,
                    text: func,
                    variant: "caption" as const,
                    color: "muted" as const,
                  })
                }

                return {
                  type: "collapsible" as const,
                  title: `${idx + 1}. ${sectionName}`,
                  subtitle: func,
                  defaultOpen: idx === 0,
                  badges,
                  children: collapsibleChildren.length > 0
                    ? [{ type: "column" as const, gap: "0.75rem", children: collapsibleChildren }]
                    : [{ type: "text" as const, text: t("reverse.noContent"), color: "muted" as const }],
                }
              }
            })
          : [{ type: "text" as const, text: t("reverse.noContent"), color: "muted" as const }],
      }

      // === RULES TAB (合并 Core Rules + Lexical + Rhetoric + Anti-patterns) ===
      const hasSentenceTemplates = sentenceTemplates && sentenceTemplates.length > 0
      const hasAntiPatterns = antiPatterns && antiPatterns.length > 0
      const hasCoreRules = coreRules && coreRules.length > 0
      const hasLexicalContent = vocabularyTier || preferredTerms.length > 0 || bannedTerms.length > 0 || adjStyle || verbStyle
      const hasRhetoricContent = preferredDevices.length > 0 || openingPattern || closingPattern || argStyle || deviceSample
      const hasRulesContent = hasCoreRules || hasLexicalContent || hasRhetoricContent || hasAntiPatterns || hasSentenceTemplates

      const rulesTabContent: A2UINode = {
        type: "column",
        gap: "0.5rem",
        children: hasRulesContent
          ? [
              // 核心规则 Collapsible
              ...(hasCoreRules
                ? [
                    {
                      type: "collapsible" as const,
                      title: t("reverse.coreRulesSection"),
                      subtitle: `${coreRules!.length} 条规则`,
                      defaultOpen: true,
                      children: [
                        {
                          type: "column" as const,
                          gap: "0.5rem",
                          children: coreRules!.slice(0, 5).map((rule) => ({
                            type: "column" as const,
                            gap: "0.25rem",
                            className: "p-2 bg-muted rounded border-l-[3px] border-primary",
                            children: [
                              {
                                type: "row" as const,
                                justify: "between" as const,
                                children: [
                                  { type: "text" as const, text: rule.rule || rule.rule_text || rule.feature || "规则", className: "text-[0.85rem] font-medium" },
                                  ...(rule.impact ? [{ type: "badge" as const, text: `影响: ${rule.impact}`, color: "info" as const }] : []),
                                ],
                              },
                              ...(rule.evidence ? [{ type: "text" as const, text: rule.evidence, variant: "caption" as const, className: "text-[0.75rem]" }] : []),
                              ...(rule.example ? [{ type: "text" as const, text: `示例: ${rule.example}`, variant: "caption" as const, color: "muted" as const, className: "text-[0.75rem] italic" }] : []),
                            ],
                          })),
                        },
                      ],
                    },
                  ]
                : []),
              // 词汇约束 Collapsible
              ...(hasLexicalContent
                ? [
                    {
                      type: "collapsible" as const,
                      title: t("reverse.lexicalSection"),
                      defaultOpen: false,
                      children: [
                        {
                          type: "column" as const,
                          gap: "0.5rem",
                          children: [
                            // Vocabulary tier
                            ...(vocabularyTier
                              ? [
                                  {
                                    type: "row" as const,
                                    gap: "0.5rem",
                                    align: "center" as const,
                                    children: [
                                      { type: "text" as const, text: t("reverse.vocabularyTier") + ":", variant: "caption" as const, color: "muted" as const },
                                      { type: "badge" as const, text: vocabularyTier, color: "primary" as const },
                                    ],
                                  },
                                ]
                              : []),
                            // Preferred terms (必用词)
                            ...(preferredTerms.length > 0
                              ? [
                                  {
                                    type: "column" as const,
                                    gap: "0.25rem",
                                    children: [
                                      { type: "text" as const, text: t("reverse.preferredTerms"), variant: "caption" as const, color: "muted" as const },
                                      {
                                        type: "row" as const,
                                        gap: "0.25rem",
                                        className: "flex-wrap",
                                        children: preferredTerms.slice(0, 12).map((term) => ({
                                          type: "badge" as const,
                                          text: term,
                                          color: "success" as const,
                                        })),
                                      },
                                    ],
                                  },
                                ]
                              : []),
                            // Banned terms (禁用词)
                            ...(bannedTerms.length > 0
                              ? [
                                  {
                                    type: "column" as const,
                                    gap: "0.25rem",
                                    children: [
                                      { type: "text" as const, text: t("reverse.bannedTerms"), variant: "caption" as const, color: "muted" as const },
                                      {
                                        type: "row" as const,
                                        gap: "0.25rem",
                                        className: "flex-wrap",
                                        children: bannedTerms.slice(0, 12).map((term) => ({
                                          type: "badge" as const,
                                          text: term,
                                          color: "destructive" as const,
                                        })),
                                      },
                                    ],
                                  },
                                ]
                              : []),
                            // Adjective & Verb style
                            ...(adjStyle
                              ? [{ type: "text" as const, text: `形容词: ${adjStyle}`, variant: "caption" as const, className: "text-[0.8rem]" }]
                              : []),
                            ...(verbStyle
                              ? [{ type: "text" as const, text: `动词: ${verbStyle}`, variant: "caption" as const, className: "text-[0.8rem]" }]
                              : []),
                          ],
                        },
                      ],
                    },
                  ]
                : []),
              // 修辞模式 Collapsible
              ...(hasRhetoricContent
                ? [
                    {
                      type: "collapsible" as const,
                      title: t("reverse.rhetoricSection"),
                      defaultOpen: false,
                      children: [
                        {
                          type: "column" as const,
                          gap: "0.5rem",
                          children: [
                            // Preferred devices
                            ...(preferredDevices.length > 0
                              ? [
                                  {
                                    type: "row" as const,
                                    gap: "0.25rem",
                                    className: "flex-wrap",
                                    children: [
                                      { type: "text" as const, text: t("reverse.preferredDevices") + ":", variant: "caption" as const, color: "muted" as const },
                                      ...preferredDevices.slice(0, 8).map((device) => ({
                                        type: "badge" as const,
                                        text: device,
                                        color: "info" as const,
                                      })),
                                    ],
                                  },
                                ]
                              : []),
                            // Opening pattern
                            ...(openingPattern
                              ? [
                                  {
                                    type: "column" as const,
                                    gap: "0.125rem",
                                    children: [
                                      { type: "text" as const, text: "开场模式:", variant: "caption" as const, color: "muted" as const },
                                      { type: "text" as const, text: openingPattern, className: "text-[0.8rem] p-1 px-2 bg-muted rounded" },
                                    ],
                                  },
                                ]
                              : []),
                            // Closing pattern
                            ...(closingPattern
                              ? [
                                  {
                                    type: "column" as const,
                                    gap: "0.125rem",
                                    children: [
                                      { type: "text" as const, text: "收尾模式:", variant: "caption" as const, color: "muted" as const },
                                      { type: "text" as const, text: closingPattern, className: "text-[0.8rem] p-1 px-2 bg-muted rounded" },
                                    ],
                                  },
                                ]
                              : []),
                            // Argument style
                            ...(argStyle
                              ? [{ type: "text" as const, text: `论证风格: ${argStyle}`, variant: "caption" as const, className: "text-[0.8rem]" }]
                              : []),
                            // Device sample
                            ...(deviceSample
                              ? [
                                  {
                                    type: "text" as const,
                                    text: `示例: "${deviceSample}"`,
                                    className: "text-[0.8rem] italic p-1 px-2 bg-[rgba(59,130,246,0.1)] rounded",
                                  },
                                ]
                              : []),
                          ],
                        },
                      ],
                    },
                  ]
                : []),
              // 反面模式 Collapsible
              ...(hasAntiPatterns
                ? [
                    {
                      type: "collapsible" as const,
                      title: t("reverse.antiPatternsSection"),
                      subtitle: `${antiPatterns!.length} 条`,
                      defaultOpen: false,
                      children: [
                        {
                          type: "column" as const,
                          gap: "0.375rem",
                          children: antiPatterns!.slice(0, 5).map((ap) => ({
                            type: "column" as const,
                            gap: "0.125rem",
                            className: "p-1.5 px-2 bg-[rgba(255,0,0,0.05)] rounded border-l-2 border-destructive",
                            children: [
                              { type: "text" as const, text: `⚠️ ${ap.forbidden || ap.pattern || ""}`, className: "text-[0.8rem] text-destructive" },
                              ...(ap.bad_case ? [{ type: "text" as const, text: `反例: "${ap.bad_case}"`, variant: "caption" as const, color: "muted" as const, className: "text-[0.75rem] italic" }] : []),
                            ],
                          })),
                        },
                      ],
                    },
                  ]
                : []),
            ]
          : [{ type: "text" as const, text: t("reverse.noContent"), color: "muted" as const }],
      }

      // === SAMPLES TAB (合并 Golden Samples + Transfer Demo) ===
      const hasGoldenSamples = goldenSamples && goldenSamples.length > 0
      const hasTransferDemo = transferPairs && transferPairs.length > 0
      const hasSamplesContent = hasGoldenSamples || hasTransferDemo

      const samplesTabContent: A2UINode = {
        type: "column",
        gap: "0.5rem",
        children: hasSamplesContent
          ? [
              // 黄金样本 Collapsible
              ...(hasGoldenSamples
                ? [
                    {
                      type: "collapsible" as const,
                      title: t("reverse.goldenSamplesSection"),
                      subtitle: `${goldenSamples.length} 个样本`,
                      defaultOpen: true,
                      children: [
                        {
                          type: "column" as const,
                          gap: "0.5rem",
                          children: goldenSamples.map((sample, idx) => ({
                            type: "column" as const,
                            gap: "0.375rem",
                            className: "p-2 bg-muted rounded-md border-l-[3px] border-success",
                            children: [
                              ...(sample.text
                                ? [
                                    {
                                      type: "text" as const,
                                      text: sample.text,
                                      className: "text-[0.85rem] leading-relaxed whitespace-pre-wrap",
                                    },
                                  ]
                                : []),
                              ...(sample.why
                                ? [
                                    {
                                      type: "text" as const,
                                      text: `入选理由: ${sample.why}`,
                                      className: "text-[0.75rem] italic text-success",
                                    },
                                  ]
                                : []),
                              // Tech list (v7.0)
                              ...((sample as { tech_list?: string[] }).tech_list && (sample as { tech_list?: string[] }).tech_list!.length > 0
                                ? [
                                    {
                                      type: "row" as const,
                                      gap: "0.25rem",
                                      className: "flex-wrap",
                                      children: [
                                        { type: "text" as const, text: "技巧:", variant: "caption" as const, color: "muted" as const },
                                        ...(sample as { tech_list?: string[] }).tech_list!.map((tech) => ({
                                          type: "badge" as const,
                                          text: tech,
                                          color: "info" as const,
                                        })),
                                      ],
                                    },
                                  ]
                                : []),
                            ],
                          })),
                        },
                      ],
                    },
                  ]
                : []),
              // 风格迁移 Collapsible
              ...(hasTransferDemo
                ? [
                    {
                      type: "collapsible" as const,
                      title: t("reverse.transferDemoSection"),
                      subtitle: `${transferPairs.length} 个示例`,
                      defaultOpen: !hasGoldenSamples,
                      children: [
                        {
                          type: "column" as const,
                          gap: "0.5rem",
                          children: transferPairs.map((pair) => {
                            const pairWithTopic = pair as { before?: string; after?: string; explanation?: string; topic?: string }
                            return {
                              type: "column" as const,
                              gap: "0.375rem",
                              className: "p-2 bg-muted rounded-md",
                              children: [
                                // Topic
                                ...(pairWithTopic.topic
                                  ? [{ type: "text" as const, text: pairWithTopic.topic, className: "text-[0.85rem] font-medium" }]
                                  : []),
                                // After text (迁移后的文本)
                                ...(pair.after
                                  ? [
                                      {
                                        type: "text" as const,
                                        text: pair.after,
                                        className: "text-[0.85rem] leading-normal bg-[rgba(0,255,0,0.05)] p-2 rounded whitespace-pre-wrap",
                                      },
                                    ]
                                  : []),
                                // Explanation (保留元素)
                                ...(pair.explanation
                                  ? [
                                      {
                                        type: "text" as const,
                                        text: `保留元素: ${pair.explanation}`,
                                        className: "text-[0.75rem] italic text-muted-foreground",
                                      },
                                    ]
                                  : []),
                              ],
                            }
                          }),
                        },
                      ],
                    },
                  ]
                : []),
            ]
          : [{ type: "text" as const, text: t("reverse.noSamples"), color: "muted" as const }],
      }

      // === PROMPT TAB (合并 Metrics + Constraints + Execution Prompt) ===
      const hasExecutionPrompt = executionPrompt && executionPrompt.trim().length > 0
      const hasPromptContent = hasMetrics || hasExecutionPrompt

      const promptTabContent: A2UINode = {
        type: "column",
        gap: "0.75rem",
        children: hasPromptContent
          ? [
              // 量化指标 (横向排列，紧凑)
              ...(hasMetrics
                ? [
                    {
                      type: "row" as const,
                      gap: "1rem",
                      className: "flex-wrap p-2 bg-muted rounded-md",
                      children: [
                        ...(wordCount != null
                          ? [
                              {
                                type: "column" as const,
                                gap: "0.125rem",
                                className: "text-center min-w-[50px]",
                                children: [
                                  { type: "text" as const, text: wordCount.toString(), variant: "h4" as const },
                                  { type: "text" as const, text: "字", variant: "caption" as const, color: "muted" as const },
                                ],
                              },
                            ]
                          : []),
                        ...(paraCount != null
                          ? [
                              {
                                type: "column" as const,
                                gap: "0.125rem",
                                className: "text-center min-w-[50px]",
                                children: [
                                  { type: "text" as const, text: paraCount.toString(), variant: "h4" as const },
                                  { type: "text" as const, text: "段", variant: "caption" as const, color: "muted" as const },
                                ],
                              },
                            ]
                          : []),
                        ...(ttr != null
                          ? [
                              {
                                type: "column" as const,
                                gap: "0.125rem",
                                className: "text-center min-w-[50px]",
                                children: [
                                  { type: "text" as const, text: (ttr * 100).toFixed(0) + "%", variant: "h4" as const },
                                  { type: "text" as const, text: "TTR", variant: "caption" as const, color: "muted" as const },
                                ],
                              },
                            ]
                          : []),
                        ...(burstiness != null
                          ? [
                              {
                                type: "column" as const,
                                gap: "0.125rem",
                                className: "text-center min-w-[50px]",
                                children: [
                                  { type: "text" as const, text: (burstiness * 100).toFixed(0) + "%", variant: "h4" as const },
                                  { type: "text" as const, text: "突变度", variant: "caption" as const, color: "muted" as const },
                                ],
                              },
                            ]
                          : []),
                        ...(avgSentLen != null
                          ? [
                              {
                                type: "column" as const,
                                gap: "0.125rem",
                                className: "text-center min-w-[50px]",
                                children: [
                                  { type: "text" as const, text: avgSentLen.toFixed(0), variant: "h4" as const },
                                  { type: "text" as const, text: "句长", variant: "caption" as const, color: "muted" as const },
                                ],
                              },
                            ]
                          : []),
                      ],
                    },
                  ]
                : []),
              // 执行提示词
              ...(hasExecutionPrompt
                ? [
                    { type: "divider" as const },
                    { type: "text" as const, text: t("reverse.executionPromptLabel"), variant: "label" as const, color: "muted" as const },
                    {
                      type: "text" as const,
                      text: executionPrompt,
                      className: "text-[0.85rem] leading-relaxed whitespace-pre-wrap bg-muted p-3 rounded-md font-mono",
                    },
                  ]
                : []),
            ]
          : [{ type: "text" as const, text: t("reverse.noContent"), color: "muted" as const }],
      }

      // Build tabs array - 5 个 Tab 结构
      const tabs: Array<{ label: string; content: A2UINode }> = [
        { label: t("reverse.tabStyle"), content: styleTabContent },
      ]
      if (hasRulesContent) {
        tabs.push({ label: t("reverse.tabRules"), content: rulesTabContent })
      }
      if (hasBlueprint) {
        tabs.push({ label: t("reverse.tabBlueprint"), content: blueprintTabContent })
      }
      if (hasSamplesContent) {
        tabs.push({ label: t("reverse.tabSamples"), content: samplesTabContent })
      }
      if (hasPromptContent) {
        tabs.push({ label: t("reverse.tabPrompt"), content: promptTabContent })
      }

      // Build title
      const title = analysis.sourceTitle || styleName || t("reverse.untitled")
      const subtitle = styleName && analysis.sourceTitle && styleName !== analysis.sourceTitle
        ? `${t("reverse.styleName")}: ${styleName}`
        : undefined

      // Build status
      type StatusColor = "success" | "warning" | "destructive" | "pending" | "info"
      const statusColorMap: Record<string, StatusColor> = {
        SUCCESS: "success",
        FAILED: "destructive",
        PENDING: "pending",
      }
      const status = analysis.status
        ? { text: analysis.status, color: statusColorMap[analysis.status] ?? ("info" as StatusColor) }
        : undefined

      // Build badges
      const badges: MaterialCardBadge[] = []
      if (primaryType) {
        badges.push({ text: primaryType.replace(/_/g, " ").toUpperCase(), color: "primary" })
      }

      // Build metrics
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
      if (analysis.useCount != null) {
        metrics.push({ value: analysis.useCount, label: t("reverse.useCount") })
      }

      // Build actions
      const actions: MaterialCardAction[] = []
      if (analysis.executionPrompt) {
        actions.push({
          icon: "copy",
          variant: "ghost",
          action: { action: "copyPrompt", args: [analysis.id] },
        })
      }
      actions.push({
        text: t("common.delete"),
        variant: "destructive",
        action: { action: "deleteLog", args: [analysis.id] },
      })

      // Build extra content (tabs)
      const extraContent: A2UINode[] = [
        {
          type: "container",
          className: "mt-2",
          children: [{ type: "tabs", tabs }],
        },
      ]

      return buildMaterialCardNode({
        id: `log-${analysis.id}`,
        title,
        titleHref: analysis.sourceUrl ?? undefined,
        subtitle,
        status,
        version: analysisVersion ?? undefined,
        badges,
        metrics: metrics.length > 0 ? metrics : undefined,
        actions,
        primaryAction: {
          text: t("reverse.cloneToTask"),
          variant: "primary",
          action: { action: "cloneToTask", args: [analysis.id] },
        },
        extraContent,
        hoverable: false,
      })
    })

    return {
      type: "container",
      className: isMobile ? "grid grid-cols-1 gap-3" : "grid grid-cols-[repeat(auto-fit,minmax(min(100%,550px),1fr))] gap-3",
      children: logCards,
    }
  }

  const buildTableNode = (): A2UINode => {
    if (isLoading) {
      return { type: "text", text: t("common.loading"), color: "muted" }
    }

    return {
      type: "materials-table",
      data: logs,
      onClone: { action: "cloneToTask" },
      onDelete: { action: "deleteLog" },
      onViewDetail: { action: "viewDetail" },
    }
  }

  // Build detail modal content
  const buildDetailModalNode = (): A2UINode | null => {
    if (!selectedAnalysis) return null

    const styleIdentity = selectedAnalysis.styleIdentity
    const lexicalLogic = selectedAnalysis.lexicalLogic
    const toneKeywords = lexicalLogic?.tone_keywords ?? []

    const detailItems: A2UINode[] = [
      // Header with type and status badges
      {
        type: "row",
        gap: "0.5rem",
        children: [
          ...(selectedAnalysis.primaryType ? [{ type: "badge" as const, text: selectedAnalysis.primaryType, color: "primary" as const }] : []),
          ...(selectedAnalysis.status ? [{ type: "badge" as const, text: selectedAnalysis.status, color: selectedAnalysis.status === "SUCCESS" ? "success" as const : "default" as const }] : []),
        ],
      },
    ]

    // Article URL
    if (selectedAnalysis.sourceUrl) {
      detailItems.push({
        type: "column",
        gap: "0.25rem",
        children: [
          { type: "text", text: t("reverse.articleUrl"), variant: "caption", color: "muted" },
          { type: "link", text: t("reverse.readOriginal"), href: selectedAnalysis.sourceUrl, external: true, variant: "primary" },
        ],
      })
    }

    // Metrics
    const metricsConstraints = selectedAnalysis.metricsConstraints
    const hasMetrics = selectedAnalysis.wordCount != null || selectedAnalysis.paraCount != null
    if (hasMetrics) {
      detailItems.push({
        type: "column",
        gap: "0.25rem",
        children: [
          { type: "text", text: t("reverse.metrics"), variant: "caption", color: "muted" },
          {
            type: "row",
            gap: "1rem",
            children: [
              ...(selectedAnalysis.wordCount != null ? [{ type: "text" as const, text: `${t("reverse.totalWords")}: ${selectedAnalysis.wordCount}` }] : []),
              ...(selectedAnalysis.paraCount != null ? [{ type: "text" as const, text: `${t("reverse.paragraphCount")}: ${selectedAnalysis.paraCount}` }] : []),
              ...(metricsConstraints?.avg_sentence_length != null ? [{ type: "text" as const, text: `${t("insights.avgSentLen")}: ${metricsConstraints.avg_sentence_length.toFixed(1)}` }] : []),
            ],
          },
        ],
      })
    }

    // Style identity
    if (styleIdentity?.archetype || styleIdentity?.implied_reader || toneKeywords.length > 0) {
      const metaChildren: A2UINode[] = [
        { type: "text", text: t("reverse.metaProfile"), variant: "caption", color: "muted" },
      ]

      if (styleIdentity?.archetype) {
        metaChildren.push({ type: "text", text: `${t("reverse.archetype")}: ${styleIdentity.archetype}` })
      }
      if (styleIdentity?.implied_reader) {
        metaChildren.push({ type: "text", text: `${t("reverse.targetAudience")}: ${styleIdentity.implied_reader}` })
      }
      if (toneKeywords.length > 0) {
        metaChildren.push({
          type: "row",
          gap: "0.5rem",
          className: "flex-wrap",
          children: [
            { type: "text", text: `${t("reverse.toneKeywords")}: ` },
            ...toneKeywords.slice(0, 10).map((k) => ({ type: "badge" as const, text: k, color: "default" as const })),
          ],
        })
      }

      if (metaChildren.length > 1) {
        detailItems.push({ type: "column", gap: "0.25rem", children: metaChildren })
      }
    }

    // Timestamps
    detailItems.push({
      type: "text",
      text: `${t("reverse.createdAt")}: ${formatDate(selectedAnalysis.createdAt)}`,
      variant: "caption",
      color: "muted",
    })

    // Close button
    detailItems.push({
      type: "row",
      justify: "end",
      className: "mt-2",
      children: [{ type: "button", text: t("common.cancel"), variant: "secondary", onClick: { action: "closeDetailModal" } }],
    })

    return {
      type: "modal",
      open: detailModalOpen,
      title: selectedAnalysis.sourceTitle || t("reverse.detail"),
      onClose: { action: "closeDetailModal" },
      children: [
        {
          type: "column",
          gap: "1rem",
          className: "max-h-[70vh] overflow-auto",
          children: detailItems,
        },
      ],
    }
  }

  // Header section (fixed)
  const headerNode: A2UINode = {
    type: "column",
    gap: "1rem",
    children: [
      {
        type: "row",
        justify: "between",
        align: "center",
        wrap: true,
        gap: "0.75rem",
        children: [
          { type: "text", text: t("reverse.title"), variant: "h2" },
          {
            type: "row",
            gap: "0.5rem",
            align: "center",
            children: [
              {
                type: "button",
                text: "▦",
                variant: viewMode === "card" ? "primary" : "secondary",
                size: "sm",
                onClick: { action: "setViewCard" },
              },
              {
                type: "button",
                text: "☰",
                variant: viewMode === "list" ? "primary" : "secondary",
                size: "sm",
                onClick: { action: "setViewList" },
              },
              { type: "button", text: t("reverse.newAnalysis"), variant: "primary", onClick: { action: "newAnalysis" } },
            ],
          },
        ],
      },
      // 搜索框
      {
        type: "input",
        id: "search-materials",
        name: "search-materials",
        value: searchQuery,
        placeholder: t("reverse.searchPlaceholder"),
        inputType: "text",
        autocomplete: "off",
        className: "max-w-full",
        onChange: { action: "setSearch" },
      },
    ],
  }

  // Build page structure with scroll-area
  const pageNode: A2UINode = {
    type: "container",
    className: "flex-1 min-h-0 flex flex-col overflow-hidden",
    children: [
      // Header stays fixed
      {
        type: "container",
        className: "flex-shrink-0 pb-3",
        children: [headerNode],
      },
      // Content scrolls independently
      {
        type: "scroll-area",
        className: "flex-1 min-h-0",
        children: [
          {
            type: "container",
            className: "flex flex-col gap-3",
            children: viewMode === "card" ? [buildListNode()] : [buildTableNode()],
          },
        ],
      },
    ],
  }

  const detailModalNode = buildDetailModalNode()

  // Memoize initialData to prevent unnecessary re-renders
  const createTaskInitialData = useMemo(
    () => (cloneMaterialId ? { refMaterialId: cloneMaterialId } : undefined),
    [cloneMaterialId]
  )

  const handleCreateTaskClose = useCallback(() => {
    setIsCreateTaskModalOpen(false)
    setCloneMaterialId(null)
  }, [])

  const handleAction = useCallback(
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "newAnalysis":
          setIsModalOpen(true)
          break
        case "viewDetail": {
          const logId = args?.[0] as string
          const log = logs.find((l) => l.id === logId)
          if (log) {
            setSelectedAnalysis(log as StyleAnalysis)
            setDetailModalOpen(true)
          }
          break
        }
        case "closeDetailModal":
          setDetailModalOpen(false)
          setSelectedAnalysis(null)
          break
        case "deleteLog": {
          const deleteId = args?.[0] as string
          const log = logs.find((l) => l.id === deleteId) as StyleAnalysis | undefined
          const title = log?.styleName || log?.sourceTitle || t("reverse.untitled")

          showConfirmToast(
            t("reverse.deleteConfirm"),
            () => {
              deleteMutation.mutate(
                { id: deleteId },
                {
                  onSuccess: () => {
                    a2uiToast.success(t("reverse.deleteSuccess"))
                  },
                  onError: () => {
                    a2uiToast.error(t("reverse.deleteFailed"))
                  },
                }
              )
            },
            {
              label: t("common.delete"),
              description: title,
            }
          )
          break
        }
        case "copyPrompt": {
          const logId = args?.[0] as string
          const log = logs.find((l) => l.id === logId) as StyleAnalysis | undefined
          if (log?.executionPrompt) {
            navigator.clipboard.writeText(log.executionPrompt).then(() => {
              a2uiToast.success(t("reverse.copySuccess"))
            }).catch(() => {
              a2uiToast.error(t("reverse.copyFailed"))
            })
          } else {
            a2uiToast.warning(t("reverse.noPromptToCopy"))
          }
          break
        }
        case "cloneToTask": {
          const materialId = args?.[0] as string
          setCloneMaterialId(materialId)
          setIsCreateTaskModalOpen(true)
          break
        }
        case "setViewCard":
          setViewMode("card")
          break
        case "setViewList":
          setViewMode("list")
          break
        case "setSearch":
          setSearchQuery(args?.[0] as string ?? "")
          break
        case "clearSearch":
          setSearchQuery("")
          break
        case "closeReverseSubmit":
          setIsModalOpen(false)
          break
        case "reverseSubmitSuccess":
          handleSuccess()
          break
        case "closeCreateTask":
          handleCreateTaskClose()
          break
      }
    },
    [logs, t, deleteMutation, handleSuccess, handleCreateTaskClose]
  )

  if (status === "loading") return null

  const modalNodes: A2UINode[] = [
    ...(detailModalOpen && detailModalNode ? [detailModalNode] : []),
    {
      type: "reverse-submit-modal",
      open: isModalOpen,
      onClose: { action: "closeReverseSubmit" },
      onSuccess: { action: "reverseSubmitSuccess" },
    },
    {
      type: "create-task-modal",
      open: isCreateTaskModalOpen,
      initialData: createTaskInitialData,
      onClose: { action: "closeCreateTask" },
      onSuccess: { action: "closeCreateTask" },
    },
  ]

  return (
    <DashboardShell>
      <A2UIRenderer node={[pageNode, ...modalNodes]} onAction={handleAction} />
    </DashboardShell>
  )
}
