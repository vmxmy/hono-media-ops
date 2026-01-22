"use client"

import { useState, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
// Removed: usePathname, useRouter - using DashboardShell now
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { DashboardShell } from "@/components/dashboard-shell"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UINode, A2UICardNode, A2UIColumnNode } from "@/lib/a2ui"
import { ANALYTICS_LAYOUT, analyticsCard, analyticsGrid, analyticsHeader } from "@/lib/analytics/layout"

export default function MaterialsPage() {
  const { t } = useI18n()
  const { status } = useSession()

  // Material Analytics API calls
  const { data: materialOverview } = api.materialAnalytics.getOverview.useQuery()
  const { data: materialQualityMetrics } = api.materialAnalytics.getQualityMetrics.useQuery()
  const { data: materialTypeDistribution } = api.materialAnalytics.getTypeDistribution.useQuery()
  const { data: materialWordCountDist } = api.materialAnalytics.getWordCountDistribution.useQuery()
  const { data: materialTopUsed } = api.materialAnalytics.getTopUsedMaterials.useQuery({ limit: 10 })
  const { data: materialGrowthTrend } = api.materialAnalytics.getGrowthTrend.useQuery({ days: 30 })
  const { data: materialMetricsScatter } = api.materialAnalytics.getMetricsScatter.useQuery()
  const { data: materialStatusDist } = api.materialAnalytics.getStatusDistribution.useQuery()
  const { data: materialCreationTrend } = api.materialAnalytics.getCreationTrend.useQuery({ days: 30 })
  const { data: materialParaCountDist } = api.materialAnalytics.getParaCountDistribution.useQuery()
  const { data: materialSentLenDist } = api.materialAnalytics.getSentLenDistribution.useQuery()
  const { data: materialTypeTrend } = api.materialAnalytics.getTypeTrend.useQuery({ days: 90 })

  const handleAction = useCallback(
    (action: string) => {
      // No actions needed yet
    },
    []
  )

  const materialOverviewCard = useMemo((): A2UICardNode => {
    if (!materialOverview) {
      return analyticsCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Material Overview", variant: "h3", weight: "semibold" },
            {
              type: "row",
              gap: ANALYTICS_LAYOUT.cardGap,
              wrap: true,
              justify: "around",
              children: [
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: materialOverview.totalCount.toString(), variant: "h2", weight: "bold" },
                    { type: "text", text: "Total Materials", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: `${materialOverview.successRate.toFixed(1)}%`, variant: "h2", weight: "bold", color: "success" },
                    { type: "text", text: "Success Rate", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: `${materialOverview.usageRate.toFixed(1)}%`, variant: "h2", weight: "bold" },
                    { type: "text", text: "Usage Rate", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: Math.round(materialOverview.avgWordCount).toLocaleString(), variant: "h2", weight: "bold" },
                    { type: "text", text: "Avg Word Count", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
  }, [materialOverview, t])

  const materialQualityMetricsCard = useMemo((): A2UICardNode => {
    if (!materialQualityMetrics) {
      return analyticsCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Quality Metrics", variant: "h3", weight: "semibold" },
            {
              type: "row",
              gap: ANALYTICS_LAYOUT.cardGap,
              wrap: true,
              justify: "around",
              children: [
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: Math.round(materialQualityMetrics.avgWordCount).toLocaleString(), variant: "h3", weight: "bold" },
                    { type: "text", text: "Avg Words", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: Math.round(materialQualityMetrics.avgParaCount).toString(), variant: "h3", weight: "bold" },
                    { type: "text", text: "Avg Paragraphs", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: materialQualityMetrics.avgTtr.toFixed(2), variant: "h3", weight: "bold" },
                    { type: "text", text: "Avg TTR", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: materialQualityMetrics.avgBurstiness.toFixed(2), variant: "h3", weight: "bold" },
                    { type: "text", text: "Avg Burstiness", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: materialQualityMetrics.avgSentLen.toFixed(1), variant: "h3", weight: "bold" },
                    { type: "text", text: "Avg Sent Length", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
  }, [materialQualityMetrics, t])

  const materialWordCountDistCard = useMemo((): A2UICardNode => {
    if (!materialWordCountDist || materialWordCountDist.length === 0) {
      return analyticsCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    const chartData = materialWordCountDist.map((item) => ({
      id: item.range,
      label: item.range,
      value: item.count,
      color: "#3b82f6",
    }))

    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Word Count Distribution", variant: "h3", weight: "semibold" },
            {
              type: "chart-bar",
              data: chartData,
              height: ANALYTICS_LAYOUT.chartHeight.bar,
              layout: "vertical",
              keys: ["value"],
              indexBy: "label",
            },
          ],
        },
      ],
    })
  }, [materialWordCountDist, t])

  const materialTypeDistCard = useMemo((): A2UICardNode => {
    if (!materialTypeDistribution || materialTypeDistribution.length === 0) {
      return analyticsCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]
    const chartData = materialTypeDistribution.map((item, index) => ({
      id: item.type,
      label: item.type,
      value: item.count,
      color: colors[index % colors.length],
    }))

    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Type Distribution", variant: "h3", weight: "semibold" },
            {
              type: "chart-pie",
              data: chartData,
              height: ANALYTICS_LAYOUT.chartHeight.card,
              innerRadius: 0.5,
            },
          ],
        },
      ],
    })
  }, [materialTypeDistribution, t])

  const materialTopUsedCard = useMemo((): A2UICardNode => {
    if (!materialTopUsed || materialTopUsed.length === 0) {
      return analyticsCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Top Used Materials", variant: "h3", weight: "semibold" },
            {
              type: "column",
              gap: "0.5rem",
              children: materialTopUsed.map((material) => ({
                type: "row" as const,
                gap: "1rem",
                justify: "between" as const,
                className: "p-3 rounded-lg bg-muted/30",
                children: [
                  {
                    type: "column" as const,
                    gap: "0.25rem",
                    className: "flex-1",
                    children: [
                      { type: "text" as const, text: material.sourceTitle, weight: "medium" as const },
                      { type: "text" as const, text: `${material.primaryType} • ${material.wordCount} words`, variant: "caption" as const, color: "muted" as const },
                    ],
                  },
                  {
                    type: "column" as const,
                    gap: "0.25rem",
                    className: "text-right",
                    children: [
                      { type: "text" as const, text: `${material.useCount} uses`, weight: "semibold" as const },
                      { type: "text" as const, text: `Grade ${material.grade}`, variant: "caption" as const, color: "muted" as const },
                    ],
                  },
                ],
              })),
            },
          ],
        },
      ],
    })
  }, [materialTopUsed, t])

  const materialGrowthTrendCard = useMemo((): A2UICardNode => {
    if (!materialGrowthTrend || materialGrowthTrend.length === 0) {
      return analyticsCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    const chartData = [{
      id: "materials",
      color: "#3b82f6",
      data: materialGrowthTrend.map((item) => ({
        x: item.date,
        y: item.cumulativeCount,
      })),
    }]

    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Material Growth Trend (30 Days)", variant: "h3", weight: "semibold" },
            {
              type: "chart-line",
              data: chartData,
              height: ANALYTICS_LAYOUT.chartHeight.trend,
            },
          ],
        },
      ],
    })
  }, [materialGrowthTrend, t])

  const materialMetricsScatterCard = useMemo((): A2UICardNode => {
    if (!materialMetricsScatter || materialMetricsScatter.length === 0) {
      return analyticsCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    const chartData = materialMetricsScatter.map((item) => ({
      id: item.id,
      x: item.ttr,
      y: item.burstiness,
      title: item.sourceTitle,
    }))

    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "TTR vs Burstiness", variant: "h3", weight: "semibold" },
            {
              type: "chart-scatter",
              data: chartData,
              height: ANALYTICS_LAYOUT.chartHeight.scatter,
              xAxisLabel: "TTR",
              yAxisLabel: "Burstiness",
            },
          ],
        },
      ],
    })
  }, [materialMetricsScatter, t])

  const materialStatusDistCard = useMemo((): A2UICardNode => {
    if (!materialStatusDist || materialStatusDist.length === 0) {
      return analyticsCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    const colors = { SUCCESS: "#22c55e", PENDING: "#f59e0b", FAILED: "#ef4444" }
    const chartData = materialStatusDist.map((item) => ({
      id: item.status,
      label: item.status,
      value: item.count,
      color: colors[item.status as keyof typeof colors] || "#6b7280",
    }))

    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Status Distribution", variant: "h3", weight: "semibold" },
            {
              type: "chart-pie",
              data: chartData,
              height: ANALYTICS_LAYOUT.chartHeight.card,
              innerRadius: 0.5,
            },
          ],
        },
      ],
    })
  }, [materialStatusDist, t])

  const materialCreationTrendCard = useMemo((): A2UICardNode => {
    if (!materialCreationTrend || materialCreationTrend.length === 0) {
      return analyticsCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    const chartData = [{
      id: "creation",
      color: "#22c55e",
      data: materialCreationTrend.map((item) => ({
        x: item.date,
        y: item.count,
      })),
    }]

    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Creation Trend (30 Days)", variant: "h3", weight: "semibold" },
            {
              type: "chart-line",
              data: chartData,
              height: ANALYTICS_LAYOUT.chartHeight.trend,
            },
          ],
        },
      ],
    })
  }, [materialCreationTrend, t])

  const materialParaCountDistCard = useMemo((): A2UICardNode => {
    if (!materialParaCountDist || materialParaCountDist.length === 0) {
      return analyticsCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    const chartData = materialParaCountDist.map((item) => ({
      id: item.range,
      label: item.range,
      value: item.count,
      color: "#8b5cf6",
    }))

    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Paragraph Count Distribution", variant: "h3", weight: "semibold" },
            {
              type: "chart-bar",
              data: chartData,
              height: ANALYTICS_LAYOUT.chartHeight.bar,
              layout: "vertical",
              keys: ["value"],
              indexBy: "label",
            },
          ],
        },
      ],
    })
  }, [materialParaCountDist, t])

  const materialSentLenDistCard = useMemo((): A2UICardNode => {
    if (!materialSentLenDist || materialSentLenDist.length === 0) {
      return analyticsCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    const chartData = materialSentLenDist.map((item) => ({
      id: item.range,
      label: item.range,
      value: item.count,
      color: "#ec4899",
    }))

    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Sentence Length Distribution", variant: "h3", weight: "semibold" },
            {
              type: "chart-bar",
              data: chartData,
              height: ANALYTICS_LAYOUT.chartHeight.bar,
              layout: "vertical",
              keys: ["value"],
              indexBy: "label",
            },
          ],
        },
      ],
    })
  }, [materialSentLenDist, t])

  const materialTypeTrendCard = useMemo((): A2UICardNode => {
    if (!materialTypeTrend || materialTypeTrend.length === 0) {
      return analyticsCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]
    const typeMap = new Map<string, { x: string; y: number }[]>()

    materialTypeTrend.forEach((item) => {
      if (!typeMap.has(item.type)) {
        typeMap.set(item.type, [])
      }
      typeMap.get(item.type)!.push({ x: item.date, y: item.count })
    })

    const chartData = Array.from(typeMap.entries()).map(([type, data], index) => ({
      id: type,
      color: colors[index % colors.length],
      data,
    }))

    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Type Trend (90 Days)", variant: "h3", weight: "semibold" },
            {
              type: "chart-line",
              data: chartData,
              height: ANALYTICS_LAYOUT.chartHeight.trend,
            },
          ],
        },
      ],
    })
  }, [materialTypeTrend, t])

  if (status === "loading") return null

  const contentNode: A2UINode = {
    type: "column",
    gap: ANALYTICS_LAYOUT.sectionGap,
    children: [
      analyticsHeader("Material Analytics", "Material coverage, quality, and usage signals."),
      analyticsGrid([materialOverviewCard, materialQualityMetricsCard]),
      analyticsGrid([materialWordCountDistCard, materialTypeDistCard]),
      analyticsGrid([materialTopUsedCard, materialGrowthTrendCard]),
      analyticsGrid([materialMetricsScatterCard, materialStatusDistCard]),
      analyticsGrid([materialCreationTrendCard, materialParaCountDistCard]),
      materialSentLenDistCard,
      materialTypeTrendCard,
    ],
  }

  return (
    <DashboardShell>
      <A2UIRenderer node={contentNode} onAction={handleAction} />
    </DashboardShell>
  )
}
