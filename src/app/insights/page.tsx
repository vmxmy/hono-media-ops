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
  const [selectedPrimaryType, setSelectedPrimaryType] = useState<string>("")
  const [trendDays, setTrendDays] = useState(30)

  // API queries - v7.3 compatible
  const { data: profile, isLoading: profileLoading } = api.reverseLogs.getMyStyleProfile.useQuery()
  const { data: statistics } = api.reverseLogs.getMyStatistics.useQuery()
  const { data: primaryTypes } = api.reverseLogs.getPrimaryTypes.useQuery()
  const { data: trend } = api.reverseLogs.getMyMetricsTrend.useQuery({ days: trendDays })
  const { data: typeInsights, isLoading: typeLoading } = api.reverseLogs.getPrimaryTypeInsights.useQuery(
    { primaryType: selectedPrimaryType },
    { enabled: !!selectedPrimaryType }
  )

  const handleAction = useCallback(
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "setPrimaryType":
          setSelectedPrimaryType(args?.[0] as string)
          break
        case "setTrendDays":
          setTrendDays(Number(args?.[0]) || 30)
          break
      }
    },
    []
  )

  // Safely format metric values
  const formatMetric = (value: unknown, decimals: number): string => {
    if (value == null) return "-"
    const num = typeof value === "string" ? parseFloat(value) : Number(value)
    return isNaN(num) ? "-" : num.toFixed(decimals)
  }

  const formatPercent = (value: unknown): string => {
    if (value == null) return "-"
    const num = typeof value === "string" ? parseFloat(value) : Number(value)
    return isNaN(num) ? "-" : `${(num * 100).toFixed(0)}%`
  }

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
            { type: "text", text: formatMetric(profile.averageMetrics.wordCount, 0), variant: "h3" },
            { type: "text", text: t("insights.wordCount"), variant: "caption", color: "muted" },
          ],
        },
        {
          type: "column",
          gap: "0.25rem",
          style: { flex: 1, textAlign: "center" },
          children: [
            { type: "text", text: formatMetric(profile.averageMetrics.paraCount, 0), variant: "h3" },
            { type: "text", text: t("reverse.paragraphCount"), variant: "caption", color: "muted" },
          ],
        },
        {
          type: "column",
          gap: "0.25rem",
          style: { flex: 1, textAlign: "center" },
          children: [
            { type: "text", text: formatPercent(profile.averageMetrics.ttr), variant: "h3" },
            { type: "text", text: "TTR", variant: "caption", color: "muted" },
          ],
        },
        {
          type: "column",
          gap: "0.25rem",
          style: { flex: 1, textAlign: "center" },
          children: [
            { type: "text", text: formatPercent(profile.averageMetrics.burstiness), variant: "h3" },
            { type: "text", text: "Burstiness", variant: "caption", color: "muted" },
          ],
        },
      ],
    }

    const typesRow: A2UIRowNode = {
      type: "row",
      gap: "0.5rem",
      style: { flexWrap: "wrap", marginTop: "0.5rem" },
      children: profile.topPrimaryTypes.slice(0, 5).map((item: { primaryType: string; percentage: number }) => ({
        type: "badge",
        text: `${item.primaryType} (${formatPercent(item.percentage)})`,
        color: "primary" as const,
      })),
    }

    const vocabularyRow: A2UIRowNode = {
      type: "row",
      gap: "0.5rem",
      style: { flexWrap: "wrap", marginTop: "0.5rem" },
      children: profile.commonToneKeywords.slice(0, 10).map((word: string) => ({
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
            { type: "text", text: t("insights.topCategories"), variant: "label" },
            typesRow,
            { type: "divider" },
            { type: "text", text: t("insights.toneKeywords"), variant: "label" },
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
                { type: "text", text: `Words: ${formatMetric(point.wordCount, 0)}`, variant: "caption", color: "muted" },
                { type: "text", text: `Para: ${formatMetric(point.paraCount, 0)}`, variant: "caption", color: "muted" },
                { type: "text", text: `TTR: ${formatPercent(point.ttr)}`, variant: "caption", color: "muted" },
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

  // Build type insights card
  const buildTypeCard = (): A2UICardNode => {
    const typeOptions = (primaryTypes ?? []).map((t: string) => ({ label: t, value: t }))

    const insightsContent: A2UINode = !selectedPrimaryType
      ? { type: "text", text: t("insights.selectCategory"), color: "muted", style: { textAlign: "center", padding: "1rem" } }
      : typeLoading
        ? { type: "text", text: t("common.loading"), color: "muted" }
        : typeInsights
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
                        { type: "text", text: String(typeInsights.totalAnalyses), variant: "h3" },
                        { type: "text", text: t("insights.totalAnalyses"), variant: "caption", color: "muted" },
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
                        { type: "text", text: t("insights.wordCount"), variant: "label" },
                        { type: "text", text: `Avg: ${formatMetric(typeInsights.metrics.wordCount.avg, 0)}`, variant: "caption" },
                        { type: "text", text: `Range: ${formatMetric(typeInsights.metrics.wordCount.min, 0)} - ${formatMetric(typeInsights.metrics.wordCount.max, 0)}`, variant: "caption", color: "muted" },
                      ],
                    },
                    {
                      type: "column",
                      gap: "0.25rem",
                      style: { flex: 1 },
                      children: [
                        { type: "text", text: "TTR", variant: "label" },
                        { type: "text", text: `Avg: ${formatPercent(typeInsights.metrics.ttr.avg)}`, variant: "caption" },
                      ],
                    },
                    {
                      type: "column",
                      gap: "0.25rem",
                      style: { flex: 1 },
                      children: [
                        { type: "text", text: "Burstiness", variant: "label" },
                        { type: "text", text: `Avg: ${formatPercent(typeInsights.metrics.burstiness.avg)}`, variant: "caption" },
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
                { type: "text", text: t("insights.categoryInsights"), variant: "h3" },
                {
                  type: "select",
                  id: "primaryType",
                  value: selectedPrimaryType,
                  options: [{ label: t("insights.selectCategory"), value: "" }, ...typeOptions],
                  onChange: { action: "setPrimaryType" },
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

  // Build statistics card
  const buildStatisticsCard = (): A2UICardNode => {
    if (!statistics) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    const typeBadges: A2UINode[] = Object.entries(statistics.byPrimaryType).slice(0, 8).map(([type, count]) => ({
      type: "badge",
      text: `${type}: ${count}`,
      color: "primary" as const,
    }))

    const statusBadges: A2UINode[] = Object.entries(statistics.byStatus).slice(0, 4).map(([status, count]) => ({
      type: "badge",
      text: `${status}: ${count}`,
      color: status === "SUCCESS" ? "success" as const : status === "FAILED" ? "destructive" as const : "default" as const,
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
            { type: "text", text: t("insights.byCategory"), variant: "label" },
            { type: "row", gap: "0.5rem", style: { flexWrap: "wrap" }, children: typeBadges },
            { type: "divider" },
            { type: "text", text: "By Status", variant: "label" },
            { type: "row", gap: "0.5rem", style: { flexWrap: "wrap" }, children: statusBadges },
          ],
        },
      ],
    }
  }

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
          { type: "column", gap: "1.5rem", style: { flex: 1, minWidth: "300px" }, children: [buildTrendCard(), buildTypeCard()] },
        ],
      },
    ],
  })

  if (!mounted) return null

  return (
    <AppLayout onLogout={logout}>
      <A2UIRenderer node={buildPageNode()} onAction={handleAction} />
    </AppLayout>
  )
}
