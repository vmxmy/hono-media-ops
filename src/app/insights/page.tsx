"use client"

import { useState, useCallback } from "react"
import { api } from "@/trpc/react"
import { AppLayout } from "@/components/app-layout"
import { useI18n } from "@/contexts/i18n-context"
import { useAuth } from "@/hooks/use-auth"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UINode, A2UIColumnNode, A2UIRowNode, A2UICardNode } from "@/lib/a2ui"

export default function InsightsPage() {
  const { t } = useI18n()
  const { mounted, logout } = useAuth()
  const [selectedGenre, setSelectedGenre] = useState<string>("")
  const [trendDays, setTrendDays] = useState(30)
  const [promptModalOpen, setPromptModalOpen] = useState(false)
  const [selectedPrompt, setSelectedPrompt] = useState<string>("")

  // API queries
  const { data: profile, isLoading: profileLoading } = api.reverseLogs.getMyStyleProfile.useQuery()
  const { data: statistics } = api.reverseLogs.getMyStatistics.useQuery()
  const { data: genres } = api.reverseLogs.getGenreCategories.useQuery()
  const { data: trend } = api.reverseLogs.getMyMetricsTrend.useQuery({ days: trendDays })
  const { data: genreInsights, isLoading: genreLoading } = api.reverseLogs.getGenreInsights.useQuery(
    { genreCategory: selectedGenre },
    { enabled: !!selectedGenre }
  )
  const { data: topPrompts } = api.reverseLogs.getTopPrompts.useQuery({ limit: 10 })
  const { data: promptSuggestions } = api.reverseLogs.getPromptSuggestions.useQuery(
    { genreCategory: selectedGenre, limit: 5 },
    { enabled: !!selectedGenre }
  )

  const handleAction = useCallback(
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "setGenre":
          setSelectedGenre(args?.[0] as string)
          break
        case "setTrendDays":
          setTrendDays(Number(args?.[0]) || 30)
          break
        case "viewPrompt":
          setSelectedPrompt(args?.[0] as string)
          setPromptModalOpen(true)
          break
        case "closeModal":
          setPromptModalOpen(false)
          setSelectedPrompt("")
          break
      }
    },
    []
  )

  // Build style profile card
  const buildProfileCard = (): A2UICardNode => {
    if (profileLoading) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    if (!profile) {
      return {
        type: "card",
        style: { padding: "2rem", textAlign: "center" },
        children: [{ type: "text", text: t("insights.noProfile"), color: "muted" }],
      }
    }

    const metricsRow: A2UIRowNode = {
      type: "row",
      gap: "1.5rem",
      style: { marginTop: "1rem" },
      children: [
        {
          type: "column",
          gap: "0.25rem",
          style: { flex: 1, textAlign: "center" },
          children: [
            { type: "text", text: profile.averageMetrics.burstiness?.toFixed(2) ?? "-", variant: "h3" },
            { type: "text", text: t("insights.burstiness"), variant: "caption", color: "muted" },
          ],
        },
        {
          type: "column",
          gap: "0.25rem",
          style: { flex: 1, textAlign: "center" },
          children: [
            { type: "text", text: profile.averageMetrics.ttr?.toFixed(3) ?? "-", variant: "h3" },
            { type: "text", text: t("insights.ttr"), variant: "caption", color: "muted" },
          ],
        },
        {
          type: "column",
          gap: "0.25rem",
          style: { flex: 1, textAlign: "center" },
          children: [
            { type: "text", text: profile.averageMetrics.avgSentLen?.toFixed(1) ?? "-", variant: "h3" },
            { type: "text", text: t("insights.avgSentLen"), variant: "caption", color: "muted" },
          ],
        },
      ],
    }

    const genresRow: A2UIRowNode = {
      type: "row",
      gap: "0.5rem",
      style: { flexWrap: "wrap", marginTop: "0.5rem" },
      children: profile.topGenres.slice(0, 5).map((g) => ({
        type: "badge",
        text: `${g.genre} (${(g.percentage * 100).toFixed(0)}%)`,
        color: "primary" as const,
      })),
    }

    const vocabularyRow: A2UIRowNode = {
      type: "row",
      gap: "0.5rem",
      style: { flexWrap: "wrap", marginTop: "0.5rem" },
      children: profile.commonVocabulary.slice(0, 10).map((word) => ({
        type: "badge",
        text: word,
        color: "default" as const,
      })),
    }

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: "1rem",
          children: [
            { type: "text", text: t("insights.styleProfile"), variant: "h3" },
            {
              type: "row",
              gap: "2rem",
              children: [
                {
                  type: "column",
                  gap: "0.25rem",
                  children: [
                    { type: "text", text: String(profile.totalAnalyses), variant: "h2" },
                    { type: "text", text: t("insights.totalAnalyses"), variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  children: [
                    { type: "text", text: `${(profile.successRate * 100).toFixed(0)}%`, variant: "h2" },
                    { type: "text", text: t("insights.successRate"), variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  children: [
                    { type: "text", text: profile.lastAnalysisAt ? new Date(profile.lastAnalysisAt).toLocaleDateString() : "-", variant: "h4" },
                    { type: "text", text: t("insights.lastAnalysis"), variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
            { type: "divider" },
            { type: "text", text: t("insights.averageMetrics"), variant: "label" },
            metricsRow,
            { type: "divider" },
            { type: "text", text: t("insights.topGenres"), variant: "label" },
            genresRow,
            { type: "divider" },
            { type: "text", text: t("insights.commonVocabulary"), variant: "label" },
            vocabularyRow,
          ],
        },
      ],
    }
  }

  // Build metrics trend card
  const buildTrendCard = (): A2UICardNode => {
    const trendData = trend ?? []

    const chartContent: A2UINode = trendData.length === 0
      ? { type: "text", text: t("common.noData"), color: "muted", style: { textAlign: "center", padding: "2rem" } }
      : {
          type: "column",
          gap: "0.5rem",
          children: trendData.slice(-10).map((point) => ({
            type: "row",
            justify: "between",
            children: [
              { type: "text", text: point.date, variant: "caption" },
              { type: "row", gap: "1rem", children: [
                { type: "text", text: `B: ${point.burstiness?.toFixed(2) ?? "-"}`, variant: "caption", color: "muted" },
                { type: "text", text: `TTR: ${point.ttr?.toFixed(3) ?? "-"}`, variant: "caption", color: "muted" },
                { type: "text", text: `Len: ${point.avgSentLen?.toFixed(1) ?? "-"}`, variant: "caption", color: "muted" },
                { type: "badge", text: String(point.count), color: "default" as const },
              ]},
            ],
          })),
        }

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: "1rem",
          children: [
            {
              type: "row",
              justify: "between",
              align: "center",
              children: [
                { type: "text", text: t("insights.metricsTrend"), variant: "h3" },
                {
                  type: "select",
                  id: "trendDays",
                  value: String(trendDays),
                  options: [
                    { label: t("insights.days", { count: 7 }), value: "7" },
                    { label: t("insights.days", { count: 30 }), value: "30" },
                    { label: t("insights.days", { count: 90 }), value: "90" },
                  ],
                  onChange: { action: "setTrendDays" },
                  style: { width: "120px" },
                },
              ],
            },
            chartContent,
          ],
        },
      ],
    }
  }

  // Build genre insights card
  const buildGenreCard = (): A2UICardNode => {
    const genreOptions = (genres ?? []).map((g) => ({ label: g, value: g }))

    const insightsContent: A2UINode = !selectedGenre
      ? { type: "text", text: t("insights.selectGenre"), color: "muted", style: { textAlign: "center", padding: "1rem" } }
      : genreLoading
        ? { type: "text", text: t("common.loading"), color: "muted" }
        : genreInsights
          ? {
              type: "column",
              gap: "1rem",
              children: [
                {
                  type: "row",
                  gap: "2rem",
                  children: [
                    {
                      type: "column",
                      gap: "0.25rem",
                      children: [
                        { type: "text", text: String(genreInsights.totalAnalyses), variant: "h3" },
                        { type: "text", text: t("insights.totalAnalyses"), variant: "caption", color: "muted" },
                      ],
                    },
                    {
                      type: "column",
                      gap: "0.25rem",
                      children: [
                        { type: "text", text: `${(genreInsights.successRate * 100).toFixed(0)}%`, variant: "h3" },
                        { type: "text", text: t("insights.successRate"), variant: "caption", color: "muted" },
                      ],
                    },
                  ],
                },
                {
                  type: "row",
                  gap: "1.5rem",
                  children: [
                    {
                      type: "column",
                      gap: "0.25rem",
                      style: { flex: 1 },
                      children: [
                        { type: "text", text: t("insights.burstiness"), variant: "label" },
                        { type: "text", text: `Avg: ${genreInsights.metrics.burstiness.avg?.toFixed(2) ?? "-"}`, variant: "caption" },
                        { type: "text", text: `Range: ${genreInsights.metrics.burstiness.min?.toFixed(2) ?? "-"} - ${genreInsights.metrics.burstiness.max?.toFixed(2) ?? "-"}`, variant: "caption", color: "muted" },
                      ],
                    },
                    {
                      type: "column",
                      gap: "0.25rem",
                      style: { flex: 1 },
                      children: [
                        { type: "text", text: t("insights.ttr"), variant: "label" },
                        { type: "text", text: `Avg: ${genreInsights.metrics.ttr.avg?.toFixed(3) ?? "-"}`, variant: "caption" },
                        { type: "text", text: `Range: ${genreInsights.metrics.ttr.min?.toFixed(3) ?? "-"} - ${genreInsights.metrics.ttr.max?.toFixed(3) ?? "-"}`, variant: "caption", color: "muted" },
                      ],
                    },
                  ],
                },
              ],
            }
          : { type: "text", text: t("common.noData"), color: "muted" }

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: "1rem",
          children: [
            {
              type: "row",
              justify: "between",
              align: "center",
              children: [
                { type: "text", text: t("insights.genreInsights"), variant: "h3" },
                {
                  type: "select",
                  id: "genre",
                  value: selectedGenre,
                  options: [{ label: t("insights.selectGenre"), value: "" }, ...genreOptions],
                  onChange: { action: "setGenre" },
                  style: { width: "180px" },
                },
              ],
            },
            insightsContent,
          ],
        },
      ],
    }
  }

  // Build prompt suggestions card
  const buildPromptsCard = (): A2UICardNode => {
    const prompts = selectedGenre ? promptSuggestions : topPrompts
    const title = selectedGenre ? t("insights.promptSuggestions") : t("insights.topPrompts")

    const promptsList: A2UINode = !prompts || prompts.length === 0
      ? { type: "text", text: t("common.noData"), color: "muted", style: { textAlign: "center", padding: "1rem" } }
      : {
          type: "column",
          gap: "0.75rem",
          children: prompts.map((p) => ({
            type: "row",
            justify: "between",
            align: "center",
            style: { padding: "0.5rem", borderRadius: "0.375rem", backgroundColor: "var(--muted)" },
            children: [
              {
                type: "column",
                gap: "0.25rem",
                style: { flex: 1 },
                children: [
                  { type: "text", text: p.articleTitle ?? "Untitled", variant: "body", weight: "medium" },
                  { type: "row", gap: "0.5rem", children: [
                    p.genreCategory ? { type: "badge", text: p.genreCategory, color: "primary" as const } : null,
                    { type: "text", text: `${t("insights.qualityScore")}: ${p.qualityScore}`, variant: "caption", color: "muted" },
                  ].filter(Boolean) as A2UINode[] },
                ],
              },
              {
                type: "button",
                text: t("insights.viewPrompt"),
                variant: "secondary",
                size: "sm",
                onClick: { action: "viewPrompt", args: [p.finalSystemPrompt ?? ""] },
              },
            ],
          })),
        }

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: "1rem",
          children: [
            { type: "text", text: title, variant: "h3" },
            promptsList,
          ],
        },
      ],
    }
  }

  // Build statistics card
  const buildStatisticsCard = (): A2UICardNode => {
    if (!statistics) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    const statusBadges: A2UINode[] = Object.entries(statistics.byStatus).map(([status, count]) => ({
      type: "badge",
      text: `${status}: ${count}`,
      color: status === "SUCCESS" ? "success" as const : status === "FAILED" ? "failed" as const : "default" as const,
    }))

    const genreBadges: A2UINode[] = Object.entries(statistics.byGenre).slice(0, 8).map(([genre, count]) => ({
      type: "badge",
      text: `${genre}: ${count}`,
      color: "default" as const,
    }))

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: "1rem",
          children: [
            { type: "text", text: t("insights.statistics"), variant: "h3" },
            {
              type: "column",
              gap: "0.25rem",
              children: [
                { type: "text", text: String(statistics.total), variant: "h2" },
                { type: "text", text: t("insights.totalAnalyses"), variant: "caption", color: "muted" },
              ],
            },
            { type: "divider" },
            { type: "text", text: t("insights.byStatus"), variant: "label" },
            { type: "row", gap: "0.5rem", style: { flexWrap: "wrap" }, children: statusBadges },
            { type: "divider" },
            { type: "text", text: t("insights.byGenre"), variant: "label" },
            { type: "row", gap: "0.5rem", style: { flexWrap: "wrap" }, children: genreBadges },
          ],
        },
      ],
    }
  }

  // Build prompt modal
  const buildPromptModal = (): A2UINode => ({
    type: "modal",
    open: promptModalOpen,
    title: t("insights.viewPrompt"),
    onClose: { action: "closeModal" },
    style: { maxWidth: "48rem" },
    children: [
      {
        type: "column",
        gap: "1rem",
        children: [
          {
            type: "textarea",
            id: "promptContent",
            value: selectedPrompt,
            rows: 15,
            style: { fontFamily: "monospace", fontSize: "0.875rem" },
          },
          {
            type: "row",
            justify: "end",
            children: [
              { type: "button", text: t("common.cancel"), variant: "secondary", onClick: { action: "closeModal" } },
            ],
          },
        ],
      },
    ],
  })

  // Build main page layout
  const buildPageNode = (): A2UIColumnNode => ({
    type: "column",
    gap: "1.5rem",
    children: [
      { type: "text", text: t("insights.title"), variant: "h2", weight: "bold" },
      {
        type: "row",
        gap: "1.5rem",
        align: "start",
        style: { flexWrap: "wrap" },
        children: [
          { type: "column", gap: "1.5rem", style: { flex: 1, minWidth: "300px" }, children: [buildProfileCard(), buildStatisticsCard()] },
          { type: "column", gap: "1.5rem", style: { flex: 1, minWidth: "300px" }, children: [buildTrendCard(), buildGenreCard()] },
        ],
      },
      buildPromptsCard(),
      buildPromptModal(),
    ],
  })

  if (!mounted) return null

  return (
    <AppLayout onLogout={logout}>
      <A2UIRenderer node={buildPageNode()} onAction={handleAction} />
    </AppLayout>
  )
}
