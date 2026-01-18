"use client"

import { useState, useCallback, useMemo } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UIAppShellNode, A2UINode, A2UICardNode, A2UIColumnNode } from "@/lib/a2ui"
import { buildNavItems } from "@/lib/navigation"

const CHART_HEIGHT = {
  card: 280,
  trend: 300,
  compact: 200,
  bar: 250,
  heatmap: 280,
  scatter: 300,
  gauge: 200,
  treemap: 280,
} as const

const CARD_MIN_WIDTH = "280px"
const LAYOUT_GAP = {
  section: "1.5rem",
  card: "1rem",
  content: "0.5rem",
} as const

export default function MaterialsPage() {
  const { t } = useI18n()
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const mounted = status !== "loading"
  const logout = () => signOut({ callbackUrl: "/login" })
  const navItems = buildNavItems(t)

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
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "navigate": {
          const href = args?.[0] as string
          if (href) router.push(href)
          break
        }
        case "logout":
          logout()
          break
      }
    },
    [router, logout]
  )

  const materialOverviewCard = useMemo((): A2UICardNode => {
    if (!materialOverview) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: "Material Overview", variant: "h4", weight: "semibold" },
            {
              type: "row",
              gap: LAYOUT_GAP.card,
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
    }
  }, [materialOverview, t])

  const materialQualityMetricsCard = useMemo((): A2UICardNode => {
    if (!materialQualityMetrics) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: "Quality Metrics", variant: "h4", weight: "semibold" },
            {
              type: "row",
              gap: LAYOUT_GAP.card,
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
    }
  }, [materialQualityMetrics, t])

  const materialWordCountDistCard = useMemo((): A2UICardNode => {
    if (!materialWordCountDist || materialWordCountDist.length === 0) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    const chartData = materialWordCountDist.map((item) => ({
      id: item.range,
      label: item.range,
      value: item.count,
      color: "#3b82f6",
    }))

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: "Word Count Distribution", variant: "h4", weight: "semibold" },
            {
              type: "chart-bar",
              data: chartData,
              height: CHART_HEIGHT.bar,
              layout: "vertical",
              keys: ["value"],
              indexBy: "label",
            },
          ],
        },
      ],
    }
  }, [materialWordCountDist, t])

  const materialTypeDistCard = useMemo((): A2UICardNode => {
    if (!materialTypeDistribution || materialTypeDistribution.length === 0) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]
    const chartData = materialTypeDistribution.map((item, index) => ({
      id: item.type,
      label: item.type,
      value: item.count,
      color: colors[index % colors.length],
    }))

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: "Type Distribution", variant: "h4", weight: "semibold" },
            {
              type: "chart-pie",
              data: chartData,
              height: CHART_HEIGHT.card,
              innerRadius: 0.5,
            },
          ],
        },
      ],
    }
  }, [materialTypeDistribution, t])

  const materialTopUsedCard = useMemo((): A2UICardNode => {
    if (!materialTopUsed || materialTopUsed.length === 0) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: "Top Used Materials", variant: "h4", weight: "semibold" },
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
    }
  }, [materialTopUsed, t])

  const materialGrowthTrendCard = useMemo((): A2UICardNode => {
    if (!materialGrowthTrend || materialGrowthTrend.length === 0) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    const chartData = [{
      id: "materials",
      color: "#3b82f6",
      data: materialGrowthTrend.map((item) => ({
        x: item.date,
        y: item.cumulativeCount,
      })),
    }]

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: "Material Growth Trend (30 Days)", variant: "h4", weight: "semibold" },
            {
              type: "chart-line",
              data: chartData,
              height: CHART_HEIGHT.trend,
            },
          ],
        },
      ],
    }
  }, [materialGrowthTrend, t])

  const materialMetricsScatterCard = useMemo((): A2UICardNode => {
    if (!materialMetricsScatter || materialMetricsScatter.length === 0) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    const chartData = materialMetricsScatter.map((item) => ({
      id: item.id,
      x: item.ttr,
      y: item.burstiness,
      title: item.sourceTitle,
    }))

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: "TTR vs Burstiness", variant: "h4", weight: "semibold" },
            {
              type: "chart-scatter",
              data: chartData,
              height: CHART_HEIGHT.scatter,
              xAxisLabel: "TTR",
              yAxisLabel: "Burstiness",
            },
          ],
        },
      ],
    }
  }, [materialMetricsScatter, t])

  const materialStatusDistCard = useMemo((): A2UICardNode => {
    if (!materialStatusDist || materialStatusDist.length === 0) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    const colors = { SUCCESS: "#22c55e", PENDING: "#f59e0b", FAILED: "#ef4444" }
    const chartData = materialStatusDist.map((item) => ({
      id: item.status,
      label: item.status,
      value: item.count,
      color: colors[item.status as keyof typeof colors] || "#6b7280",
    }))

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: "Status Distribution", variant: "h4", weight: "semibold" },
            {
              type: "chart-pie",
              data: chartData,
              height: CHART_HEIGHT.card,
              innerRadius: 0.5,
            },
          ],
        },
      ],
    }
  }, [materialStatusDist, t])

  const materialCreationTrendCard = useMemo((): A2UICardNode => {
    if (!materialCreationTrend || materialCreationTrend.length === 0) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    const chartData = [{
      id: "creation",
      color: "#22c55e",
      data: materialCreationTrend.map((item) => ({
        x: item.date,
        y: item.count,
      })),
    }]

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: "Creation Trend (30 Days)", variant: "h4", weight: "semibold" },
            {
              type: "chart-line",
              data: chartData,
              height: CHART_HEIGHT.trend,
            },
          ],
        },
      ],
    }
  }, [materialCreationTrend, t])

  const materialParaCountDistCard = useMemo((): A2UICardNode => {
    if (!materialParaCountDist || materialParaCountDist.length === 0) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    const chartData = materialParaCountDist.map((item) => ({
      id: item.range,
      label: item.range,
      value: item.count,
      color: "#8b5cf6",
    }))

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: "Paragraph Count Distribution", variant: "h4", weight: "semibold" },
            {
              type: "chart-bar",
              data: chartData,
              height: CHART_HEIGHT.bar,
              layout: "vertical",
              keys: ["value"],
              indexBy: "label",
            },
          ],
        },
      ],
    }
  }, [materialParaCountDist, t])

  const materialSentLenDistCard = useMemo((): A2UICardNode => {
    if (!materialSentLenDist || materialSentLenDist.length === 0) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    const chartData = materialSentLenDist.map((item) => ({
      id: item.range,
      label: item.range,
      value: item.count,
      color: "#ec4899",
    }))

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: "Sentence Length Distribution", variant: "h4", weight: "semibold" },
            {
              type: "chart-bar",
              data: chartData,
              height: CHART_HEIGHT.bar,
              layout: "vertical",
              keys: ["value"],
              indexBy: "label",
            },
          ],
        },
      ],
    }
  }, [materialSentLenDist, t])

  const materialTypeTrendCard = useMemo((): A2UICardNode => {
    if (!materialTypeTrend || materialTypeTrend.length === 0) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
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

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: "Type Trend (90 Days)", variant: "h4", weight: "semibold" },
            {
              type: "chart-line",
              data: chartData,
              height: CHART_HEIGHT.trend,
            },
          ],
        },
      ],
    }
  }, [materialTypeTrend, t])

  if (!mounted) return null

  const appShellNode: A2UIAppShellNode = {
    type: "app-shell",
    brand: t("app.title"),
    logoSrc: "/logo.png",
    logoAlt: "Wonton",
    navItems,
    activePath: pathname,
    onNavigate: { action: "navigate" },
    onLogout: { action: "logout" },
    logoutLabel: t("auth.logout"),
    headerActions: [{ type: "theme-switcher" }],
    children: [
      {
        type: "column",
        gap: LAYOUT_GAP.section,
        children: [
          { type: "text", text: "Material Analytics", variant: "h2", weight: "bold" },
          materialOverviewCard,
          materialQualityMetricsCard,
          materialWordCountDistCard,
          materialTypeDistCard,
          materialTopUsedCard,
          materialGrowthTrendCard,
          materialMetricsScatterCard,
          materialStatusDistCard,
          materialCreationTrendCard,
          materialParaCountDistCard,
          materialSentLenDistCard,
          materialTypeTrendCard,
        ],
      },
    ],
  }

  return <A2UIRenderer node={appShellNode} onAction={handleAction} />
}
