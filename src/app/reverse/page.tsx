"use client"

import { useState, useCallback } from "react"
import { api } from "@/trpc/react"
import { AppLayout } from "@/components/app-layout"
import { ReverseSubmitModal } from "@/components/reverse-submit-modal"
import { useI18n } from "@/contexts/i18n-context"
import { useAuth } from "@/hooks/use-auth"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UIColumnNode, A2UINode, A2UIRowNode } from "@/lib/a2ui"

interface ReverseLog {
  id: string
  articleTitle: string | null
  articleUrl: string | null
  originalContent: string | null
  genreCategory: string | null
  reverseResult: unknown
  reverseResultJson: unknown
  metrics: unknown
  finalSystemPrompt: string | null
  modelName: string | null
  metricBurstiness: number | null
  metricTtr: number | null
  metricAvgSentLen: number | null
  status: string | null
  createdAt: Date | null
}

// Parsed structure from reverse_result_json
interface ReverseResultParsed {
  style_name?: string
  meta_profile?: {
    archetype?: string
    tone_keywords?: string[]
    target_audience?: string
  }
  blueprint?: Array<{
    section?: string
    specs?: string
  }>
  constraints?: {
    rhythm_instruction?: string
    vocabulary_level?: string
    formatting_rules?: string
  }
  execution_prompt?: string
}

export default function ReversePage() {
  const { t } = useI18n()
  const { mounted, logout } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<ReverseLog | null>(null)

  const utils = api.useUtils()
  const { data, isLoading } = api.reverseLogs.getAll.useQuery(
    { page: 1, pageSize: 50 },
    { enabled: mounted }
  )

  const deleteMutation = api.reverseLogs.delete.useMutation({
    onSuccess: () => {
      utils.reverseLogs.getAll.invalidate()
    },
  })

  const logs = data?.logs ?? []

  const getStatusColor = (status: string): "success" | "destructive" | "warning" | "default" => {
    switch (status) {
      case "SUCCESS":
        return "success"
      case "FAILED":
        return "destructive"
      case "PENDING":
        return "warning"
      default:
        return "default"
    }
  }

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "SUCCESS":
        return t("reverse.statusSuccess")
      case "FAILED":
        return t("reverse.statusFailed")
      case "PENDING":
        return t("reverse.statusPending")
      default:
        return status
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "-"
    return new Date(date).toLocaleString()
  }

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
            setSelectedLog(log as ReverseLog)
            setDetailModalOpen(true)
          }
          break
        }
        case "closeDetailModal":
          setDetailModalOpen(false)
          setSelectedLog(null)
          break
        case "deleteLog": {
          const deleteId = args?.[0] as string
          if (confirm(t("reverse.deleteConfirm"))) {
            deleteMutation.mutate({ id: deleteId })
          }
          break
        }
      }
    },
    [logs, t, deleteMutation]
  )

  const handleSuccess = () => {
    utils.reverseLogs.getAll.invalidate()
  }

  // Build list content
  const buildListNode = (): A2UINode => {
    if (isLoading) {
      return { type: "text", text: t("common.loading"), color: "muted" }
    }

    if (logs.length === 0) {
      return {
        type: "card",
        hoverable: false,
        style: { padding: "2rem", textAlign: "center" },
        children: [{ type: "text", text: t("reverse.noRecords"), color: "muted" }],
      }
    }

    const logCards: A2UINode[] = logs.map((log) => {
      // Parse reverse_result_json - it might be a string or object
      let parsed: ReverseResultParsed | null = null
      if (log.reverseResultJson) {
        try {
          if (typeof log.reverseResultJson === "string") {
            parsed = JSON.parse(log.reverseResultJson)
          } else if (typeof log.reverseResultJson === "object") {
            const obj = log.reverseResultJson as { text?: string }
            if (obj.text) {
              parsed = JSON.parse(obj.text)
            } else {
              parsed = log.reverseResultJson as ReverseResultParsed
            }
          }
        } catch {
          parsed = null
        }
      }

      // Use legacy metric fields if JSONB metrics not available
      const burstiness = log.metricBurstiness
      const ttr = log.metricTtr
      const avgSentLen = log.metricAvgSentLen

      // Style profile tab - most valuable info
      const hasStyleInfo = parsed?.style_name || parsed?.meta_profile
      const styleTabContent: A2UINode = {
        type: "column",
        gap: "0.75rem",
        children: hasStyleInfo
          ? [
              // Style name - prominent display
              ...(parsed?.style_name
                ? [
                    {
                      type: "column" as const,
                      gap: "0.25rem",
                      children: [
                        { type: "text" as const, text: t("reverse.styleName"), variant: "caption" as const, color: "muted" as const },
                        { type: "text" as const, text: parsed.style_name, variant: "h4" as const },
                      ],
                    },
                  ]
                : []),
              // Meta profile
              ...(parsed?.meta_profile
                ? [
                    {
                      type: "row" as const,
                      gap: "1.5rem",
                      style: { flexWrap: "wrap" as const },
                      children: [
                        ...(parsed.meta_profile.archetype
                          ? [
                              {
                                type: "column" as const,
                                gap: "0.125rem",
                                children: [
                                  { type: "text" as const, text: t("reverse.archetype"), variant: "caption" as const, color: "muted" as const },
                                  { type: "text" as const, text: parsed.meta_profile.archetype, style: { fontSize: "0.875rem" } },
                                ],
                              },
                            ]
                          : []),
                        ...(parsed.meta_profile.target_audience
                          ? [
                              {
                                type: "column" as const,
                                gap: "0.125rem",
                                children: [
                                  { type: "text" as const, text: t("reverse.targetAudience"), variant: "caption" as const, color: "muted" as const },
                                  { type: "text" as const, text: parsed.meta_profile.target_audience, style: { fontSize: "0.875rem" } },
                                ],
                              },
                            ]
                          : []),
                      ],
                    },
                  ]
                : []),
              // Tone keywords
              ...(parsed?.meta_profile?.tone_keywords && parsed.meta_profile.tone_keywords.length > 0
                ? [
                    {
                      type: "column" as const,
                      gap: "0.25rem",
                      children: [
                        { type: "text" as const, text: t("reverse.toneKeywords"), variant: "caption" as const, color: "muted" as const },
                        {
                          type: "row" as const,
                          gap: "0.25rem",
                          style: { flexWrap: "wrap" as const },
                          children: parsed.meta_profile.tone_keywords.map((k) => ({ type: "badge" as const, text: k, color: "default" as const })),
                        },
                      ],
                    },
                  ]
                : []),
            ]
          : [{ type: "text" as const, text: t("reverse.noContent"), color: "muted" as const }],
      }

      // Metrics tab - quantitative data
      const hasMetrics = burstiness != null || ttr != null || avgSentLen != null
      const metricsTabContent: A2UINode = {
        type: "column",
        gap: "0.5rem",
        children: hasMetrics
          ? [
              {
                type: "row",
                gap: "1.5rem",
                style: { flexWrap: "wrap" },
                children: [
                  ...(burstiness != null
                    ? [
                        {
                          type: "column" as const,
                          gap: "0.125rem",
                          children: [
                            { type: "text" as const, text: t("insights.burstiness"), variant: "caption" as const, color: "muted" as const },
                            { type: "text" as const, text: burstiness.toFixed(2), variant: "h4" as const },
                          ],
                        },
                      ]
                    : []),
                  ...(ttr != null
                    ? [
                        {
                          type: "column" as const,
                          gap: "0.125rem",
                          children: [
                            { type: "text" as const, text: t("insights.ttr"), variant: "caption" as const, color: "muted" as const },
                            { type: "text" as const, text: ttr.toFixed(2), variant: "h4" as const },
                          ],
                        },
                      ]
                    : []),
                  ...(avgSentLen != null
                    ? [
                        {
                          type: "column" as const,
                          gap: "0.125rem",
                          children: [
                            { type: "text" as const, text: t("insights.avgSentLen"), variant: "caption" as const, color: "muted" as const },
                            { type: "text" as const, text: avgSentLen.toFixed(1), variant: "h4" as const },
                          ],
                        },
                      ]
                    : []),
                ],
              },
              // Model info inline
              ...(log.modelName
                ? [
                    {
                      type: "text" as const,
                      text: `${t("reverse.modelName")}: ${log.modelName}`,
                      variant: "caption" as const,
                      color: "muted" as const,
                    },
                  ]
                : []),
            ]
          : [{ type: "text" as const, text: t("reverse.noContent"), color: "muted" as const }],
      }

      // Blueprint tab - structure guide
      const hasBlueprint = parsed?.blueprint && parsed.blueprint.length > 0
      const blueprintTabContent: A2UINode = {
        type: "column",
        gap: "0.5rem",
        children: hasBlueprint
          ? parsed!.blueprint!.map((section, idx) => ({
              type: "column" as const,
              gap: "0.125rem",
              style: { padding: "0.5rem", backgroundColor: "var(--muted)", borderRadius: "0.375rem" },
              children: [
                { type: "text" as const, text: `${idx + 1}. ${section.section || ""}`, variant: "body" as const, style: { fontWeight: 600 } },
                { type: "text" as const, text: section.specs || "", variant: "caption" as const, color: "muted" as const, style: { fontSize: "0.75rem" } },
              ],
            }))
          : [{ type: "text" as const, text: t("reverse.noContent"), color: "muted" as const }],
      }

      // Prompt tab - the actionable output (full text with scroll)
      const hasPrompt = parsed?.execution_prompt || log.finalSystemPrompt
      const promptText = parsed?.execution_prompt || log.finalSystemPrompt || ""
      const promptTabContent: A2UINode = {
        type: "column",
        gap: "0.5rem",
        children: hasPrompt
          ? [
              {
                type: "text",
                text: promptText,
                style: {
                  whiteSpace: "pre-wrap",
                  fontSize: "0.75rem",
                  lineHeight: "1.5",
                  padding: "0.75rem",
                  backgroundColor: "var(--muted)",
                  borderRadius: "0.375rem",
                  maxHeight: "300px",
                  overflow: "auto",
                },
              },
            ]
          : [{ type: "text" as const, text: t("reverse.noContent"), color: "muted" as const }],
      }

      return {
        type: "card",
        id: `log-${log.id}`,
        hoverable: false,
        children: [
          {
            type: "column",
            gap: "0.75rem",
            children: [
              // Header row with style name, badges and actions
              {
                type: "row",
                justify: "between",
                align: "start",
                wrap: true,
                gap: "0.75rem",
                children: [
                  {
                    type: "column",
                    gap: "0.5rem",
                    style: { flex: 1, minWidth: "200px" },
                    children: [
                      {
                        type: "link",
                        text: parsed?.style_name || log.articleTitle || t("reverse.untitled"),
                        variant: "default",
                        style: { fontSize: "1rem", fontWeight: 600, cursor: "pointer", wordBreak: "break-word" },
                        onClick: { action: "viewDetail", args: [log.id] },
                      },
                      {
                        type: "row",
                        gap: "0.375rem",
                        wrap: true,
                        children: [
                          { type: "badge", text: getStatusLabel(log.status ?? "PENDING"), color: getStatusColor(log.status ?? "PENDING") },
                          ...(log.genreCategory ? [{ type: "badge" as const, text: log.genreCategory, color: "default" as const }] : []),
                          ...(log.modelName ? [{ type: "badge" as const, text: log.modelName, color: "default" as const }] : []),
                        ],
                      },
                      // Show "Read Original" link if URL exists
                      ...(log.articleUrl
                        ? [
                            {
                              type: "link" as const,
                              text: t("reverse.readOriginal"),
                              href: log.articleUrl,
                              variant: "primary" as const,
                              style: { fontSize: "0.75rem" },
                            },
                          ]
                        : []),
                    ],
                  },
                  {
                    type: "button",
                    text: t("common.delete"),
                    variant: "destructive",
                    size: "sm",
                    onClick: { action: "deleteLog", args: [log.id], stopPropagation: true },
                  },
                ],
              } as A2UIRowNode,
              // Tabs for detailed info - reordered by value
              {
                type: "tabs",
                tabs: [
                  { label: t("reverse.tabStyle"), content: styleTabContent },
                  { label: t("reverse.tabPrompt"), content: promptTabContent },
                  { label: t("reverse.tabBlueprint"), content: blueprintTabContent },
                  { label: t("reverse.tabMetrics"), content: metricsTabContent },
                ],
              },
            ],
          },
        ],
      }
    })

    return {
      type: "container",
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
        gap: "0.75rem",
      },
      children: logCards,
    }
  }

  // Build detail modal content
  const buildDetailModalNode = (): A2UINode | null => {
    if (!selectedLog) return null

    const metrics = selectedLog.metrics as { burstiness?: number; ttr?: number; avgSentLen?: number } | null
    const reverseResult = selectedLog.reverseResult as { genre?: string; tone?: string; structure?: string; vocabulary?: string[] } | null

    const detailItems: A2UINode[] = [
      // Header with status
      {
        type: "row",
        gap: "0.5rem",
        children: [
          { type: "badge", text: getStatusLabel(selectedLog.status ?? "PENDING"), color: getStatusColor(selectedLog.status ?? "PENDING") },
          ...(selectedLog.genreCategory ? [{ type: "badge" as const, text: selectedLog.genreCategory, color: "default" as const }] : []),
        ],
      },
    ]

    // Article URL
    if (selectedLog.articleUrl) {
      detailItems.push({
        type: "column",
        gap: "0.25rem",
        children: [
          { type: "text", text: t("reverse.articleUrl"), variant: "caption", color: "muted" },
          { type: "link", text: t("reverse.readOriginal"), href: selectedLog.articleUrl, variant: "primary" },
        ],
      })
    }

    // Metrics
    if (metrics && (metrics.burstiness || metrics.ttr || metrics.avgSentLen)) {
      detailItems.push({
        type: "column",
        gap: "0.25rem",
        children: [
          { type: "text", text: t("reverse.metrics"), variant: "caption", color: "muted" },
          {
            type: "row",
            gap: "1rem",
            children: [
              ...(metrics.burstiness != null ? [{ type: "text" as const, text: `${t("insights.burstiness")}: ${metrics.burstiness.toFixed(2)}` }] : []),
              ...(metrics.ttr != null ? [{ type: "text" as const, text: `${t("insights.ttr")}: ${metrics.ttr.toFixed(2)}` }] : []),
              ...(metrics.avgSentLen != null ? [{ type: "text" as const, text: `${t("insights.avgSentLen")}: ${metrics.avgSentLen.toFixed(1)}` }] : []),
            ],
          },
        ],
      })
    }

    // Reverse Result
    if (reverseResult) {
      const resultChildren: A2UINode[] = [
        { type: "text", text: t("reverse.reverseResult"), variant: "caption", color: "muted" },
      ]

      if (reverseResult.tone) {
        resultChildren.push({ type: "text", text: `${t("reverse.tone")}: ${reverseResult.tone}` })
      }
      if (reverseResult.structure) {
        resultChildren.push({ type: "text", text: `${t("reverse.structure")}: ${reverseResult.structure}` })
      }
      if (reverseResult.vocabulary && reverseResult.vocabulary.length > 0) {
        resultChildren.push({
          type: "row",
          gap: "0.5rem",
          style: { flexWrap: "wrap" },
          children: [
            { type: "text", text: `${t("reverse.vocabulary")}: ` },
            ...reverseResult.vocabulary.slice(0, 10).map((v) => ({ type: "badge" as const, text: v, color: "default" as const })),
          ],
        })
      }

      if (resultChildren.length > 1) {
        detailItems.push({ type: "column", gap: "0.25rem", children: resultChildren })
      }
    }

    // Model info
    if (selectedLog.modelName) {
      detailItems.push({
        type: "column",
        gap: "0.25rem",
        children: [
          { type: "text", text: t("reverse.modelName"), variant: "caption", color: "muted" },
          { type: "text", text: selectedLog.modelName },
        ],
      })
    }

    // System Prompt
    if (selectedLog.finalSystemPrompt) {
      detailItems.push({
        type: "column",
        gap: "0.25rem",
        children: [
          { type: "text", text: t("reverse.viewPrompt"), variant: "caption", color: "muted" },
          {
            type: "text",
            text: selectedLog.finalSystemPrompt,
            style: { whiteSpace: "pre-wrap", maxHeight: "200px", overflow: "auto", padding: "0.5rem", backgroundColor: "var(--muted)", borderRadius: "0.375rem", fontSize: "0.875rem" },
          },
        ],
      })
    }

    // Original Content
    if (selectedLog.originalContent) {
      detailItems.push({
        type: "column",
        gap: "0.25rem",
        children: [
          { type: "text", text: t("reverse.originalContent"), variant: "caption", color: "muted" },
          {
            type: "text",
            text: selectedLog.originalContent.length > 500 ? selectedLog.originalContent.slice(0, 500) + "..." : selectedLog.originalContent,
            style: { whiteSpace: "pre-wrap", maxHeight: "150px", overflow: "auto", padding: "0.5rem", backgroundColor: "var(--muted)", borderRadius: "0.375rem", fontSize: "0.875rem" },
          },
        ],
      })
    }

    // Timestamps
    detailItems.push({
      type: "text",
      text: `${t("reverse.createdAt")}: ${formatDate(selectedLog.createdAt)}`,
      variant: "caption",
      color: "muted",
    })

    // Close button
    detailItems.push({
      type: "row",
      justify: "end",
      style: { marginTop: "0.5rem" },
      children: [{ type: "button", text: t("common.cancel"), variant: "secondary", onClick: { action: "closeDetailModal" } }],
    })

    return {
      type: "modal",
      open: detailModalOpen,
      title: selectedLog.articleTitle || t("reverse.detail"),
      onClose: { action: "closeDetailModal" },
      children: [
        {
          type: "column",
          gap: "1rem",
          style: { maxHeight: "70vh", overflow: "auto" },
          children: detailItems,
        },
      ],
    }
  }

  // Build page structure
  const pageNode: A2UIColumnNode = {
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
          { type: "button", text: t("reverse.newAnalysis"), variant: "primary", onClick: { action: "newAnalysis" } },
        ],
      },
      buildListNode(),
    ],
  }

  const detailModalNode = buildDetailModalNode()

  if (!mounted) return null

  return (
    <AppLayout onLogout={logout}>
      <A2UIRenderer node={pageNode} onAction={handleAction} />
      {detailModalOpen && detailModalNode && <A2UIRenderer node={detailModalNode} onAction={handleAction} />}
      <ReverseSubmitModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={handleSuccess} />
    </AppLayout>
  )
}
