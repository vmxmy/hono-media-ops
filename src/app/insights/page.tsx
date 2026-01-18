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

export default function InsightsPage() {
  const { t } = useI18n()
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const mounted = status !== "loading"
  const logout = () => signOut({ callbackUrl: "/login" })
  const navItems = buildNavItems(t)
  const [trendDays, setTrendDays] = useState(30)

  const { data: profile, isLoading: profileLoading } = api.reverseLogs.getMyStyleProfile.useQuery()
  const { data: statistics } = api.reverseLogs.getMyStatistics.useQuery()
  const { data: trend } = api.reverseLogs.getMyMetricsTrend.useQuery({ days: trendDays })
  const { data: detailedMetrics } = api.reverseLogs.getMyDetailedMetrics.useQuery()

  // Phase 3: Advanced Analytics
  const { data: styleCombinations } = api.reverseLogs.getStylePromptCombinations.useQuery({ limit: 10 })
  const { data: metricsComparison } = api.reverseLogs.compareMetricsWithAverage.useQuery()

  // Phase 1: Usage Analytics
  const { data: topStyles } = api.reverseLogs.getTopUsedStyles.useQuery({ limit: 5 })
  const { data: topPrompts } = api.imagePrompts.getTopUsedImagePrompts.useQuery({ limit: 5 })

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
        case "setTrendDays":
          setTrendDays(Number(args?.[0]) || 30)
          break
      }
    },
    [router, logout]
  )

  const metricsStats = useMemo(() => {
    if (!profile?.averageMetrics) return null
    const { wordCount, paraCount, ttr, burstiness } = profile.averageMetrics
    return {
      wordCount: Math.round(wordCount ?? 0),
      paraCount: Math.round(paraCount ?? 0),
      ttr: (ttr ?? 0).toFixed(2),
      burstiness: (burstiness ?? 0).toFixed(2),
    }
  }, [profile])

  const typeDistributionData = useMemo(() => {
    if (!statistics?.byPrimaryType) return []
    const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]
    return Object.entries(statistics.byPrimaryType)
      .filter(([type]) => type && type !== "null" && type !== "undefined")
      .slice(0, 8)
      .map(([type, count], index) => ({
        id: type,
        label: type,
        value: count as number,
        color: colors[index % colors.length],
      }))
  }, [statistics])

  const trendChartData = useMemo(() => {
    if (!trend?.length) return []
    return [
      {
        id: t("insights.wordCount"),
        color: "#3b82f6",
        data: trend.map((point) => ({
          x: point.date.slice(5),
          y: point.wordCount ?? 0,
        })),
      },
      {
        id: "TTR×1000",
        color: "#22c55e",
        data: trend.map((point) => ({
          x: point.date.slice(5),
          y: Math.round((point.ttr ?? 0) * 1000),
        })),
      },
    ]
  }, [trend, t])

  const barChartData = useMemo(() => {
    if (!statistics?.byPrimaryType) return []
    return Object.entries(statistics.byPrimaryType)
      .filter(([type]) => type && type !== "null" && type !== "undefined")
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 6)
      .map(([type, count]) => ({
        type,
        count: count as number,
      }))
  }, [statistics])

  const wordCloudData = useMemo(() => {
    if (!profile?.commonToneKeywords) return []
    return profile.commonToneKeywords.slice(0, 20).map((word: string, index: number) => ({
      text: word,
      value: 20 - index,
    }))
  }, [profile])

  const radarData = useMemo(() => {
    if (!profile?.averageMetrics) return []
    const { wordCount, paraCount, ttr, burstiness } = profile.averageMetrics
    return [
      { trait: t("insights.wordCount"), value: Math.min(((wordCount ?? 0) / 5000) * 100, 100) },
      { trait: t("reverse.paragraphCount"), value: Math.min(((paraCount ?? 0) / 50) * 100, 100) },
      { trait: "TTR", value: (ttr ?? 0) * 100 },
      { trait: "Burstiness", value: Math.min(((burstiness ?? 0) / 25) * 100, 100) },
    ]
  }, [profile, t])

  const treemapData = useMemo(() => {
    if (!statistics?.byPrimaryType) return []
    const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]
    return Object.entries(statistics.byPrimaryType)
      .filter(([type]) => type && type !== "null" && type !== "undefined")
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([type, count], index) => ({
        id: type,
        label: type,
        value: count as number,
        color: colors[index % colors.length],
      }))
  }, [statistics])

  const scatterData = useMemo(() => {
    if (!detailedMetrics || detailedMetrics.length === 0) return []
    return detailedMetrics
      .filter((m) => m.metricsTtr !== null && m.metricsBurstiness !== null)
      .map((m) => ({
        x: (m.metricsTtr ?? 0) * 1000,
        y: m.metricsBurstiness ?? 0,
        id: m.id,
        title: m.sourceTitle ?? `Analysis ${m.id.slice(0, 8)}`,
      }))
      .slice(0, 50)
  }, [detailedMetrics])

  const wordCountHistogramData = useMemo(() => {
    if (!detailedMetrics || detailedMetrics.length === 0) return []
    const wordCounts = detailedMetrics.map((m) => m.wordCount ?? 0).filter((wc) => wc > 0)
    if (wordCounts.length === 0) return []

    const min = Math.min(...wordCounts)
    const max = Math.max(...wordCounts)
    const binCount = 10
    const binSize = Math.max(Math.ceil((max - min) / binCount), 100)
    const bins = Array.from({ length: binCount }, (_, i) => ({
      range: `${min + i * binSize} - ${Math.min(min + (i + 1) * binSize, max)}`,
      count: wordCounts.filter((wc) => wc >= min + i * binSize && wc < Math.min(min + (i + 1) * binSize, max)).length,
    }))

    return bins
  }, [detailedMetrics])

  const styleCombinationsData = useMemo(() => {
    if (!styleCombinations || styleCombinations.length === 0) return []
    return styleCombinations.map((combo) => ({
      style: combo.styleTitle,
      prompt: combo.promptTitle,
      uses: combo.totalUses,
      successRate: `${(combo.successRate * 100).toFixed(1)}%`,
      avgChapters: combo.avgArticleChapters.toFixed(1),
      avgImages: combo.avgXhsImages.toFixed(1),
    }))
  }, [styleCombinations])

  const topStylesData = useMemo(() => {
    if (!topStyles || topStyles.length === 0) return []
    return topStyles.map((style) => ({
      name: style.sourceTitle,
      uses: style.useCount,
      lastUsed: style.lastUsedAt ? new Date(style.lastUsedAt).toLocaleDateString() : "-",
    }))
  }, [topStyles])

  const topPromptsData = useMemo(() => {
    if (!topPrompts || topPrompts.length === 0) return []
    return topPrompts.map((prompt) => ({
      name: prompt.title,
      uses: prompt.useCount,
      lastUsed: prompt.lastUsedAt ? new Date(prompt.lastUsedAt).toLocaleDateString() : "-",
    }))
  }, [topPrompts])

  const headerCard = useMemo((): A2UICardNode => {
    if (profileLoading) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    if (!profile) {
      return {
        type: "card",
        className: "p-8 text-center",
        children: [{ type: "text", text: t("insights.noProfile"), color: "muted" }],
      }
    }

    return {
      type: "card",
      children: [
        {
          type: "row",
          gap: "2rem",
          justify: "around",
          align: "center",
          wrap: true,
          children: [
            {
              type: "column",
              gap: "0.25rem",
              className: "text-center",
              children: [
                { type: "text", text: String(profile.totalAnalyses), variant: "h1", weight: "bold" },
                { type: "text", text: t("insights.totalAnalyses"), variant: "caption", color: "muted" },
              ],
            },
            {
              type: "column",
              gap: "0.25rem",
              className: "text-center",
              children: [
                { type: "text", text: profile.lastAnalysisAt ? new Date(profile.lastAnalysisAt).toLocaleDateString() : "-", variant: "h3" },
                { type: "text", text: t("insights.lastAnalysis"), variant: "caption", color: "muted" },
              ],
            },
            {
              type: "column",
              gap: "0.25rem",
              className: "text-center",
              children: [
                { type: "text", text: String(profile.topPrimaryTypes.length), variant: "h3" },
                { type: "text", text: t("insights.topCategories"), variant: "caption", color: "muted" },
              ],
            },
          ],
        },
      ],
    }
  }, [profile, profileLoading, t])

  const metricsCard = useMemo((): A2UICardNode => {
    if (!metricsStats) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.noData"), color: "muted" }],
      }
    }

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: t("insights.averageMetrics"), variant: "h4", weight: "semibold" },
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
                    { type: "text", text: metricsStats.wordCount.toLocaleString(), variant: "h2", weight: "bold" },
                    { type: "text", text: t("insights.wordCount"), variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: metricsStats.paraCount.toString(), variant: "h2", weight: "bold" },
                    { type: "text", text: t("reverse.paragraphCount"), variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: metricsStats.ttr, variant: "h2", weight: "bold" },
                    { type: "text", text: "TTR", variant: "caption", color: "muted" },
                    { type: "text", text: t("insights.ttrDescription"), variant: "caption", color: "muted", className: "text-[10px]" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: metricsStats.burstiness, variant: "h2", weight: "bold" },
                    { type: "text", text: "Burstiness", variant: "caption", color: "muted" },
                    { type: "text", text: t("insights.burstyDescription"), variant: "caption", color: "muted", className: "text-[10px]" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
  }, [metricsStats, t])

  const buildScatterChartCard = (): A2UINode => ({
    type: "card",
    children: [
      {
        type: "column",
        gap: LAYOUT_GAP.content,
        children: [
          { type: "text", text: "TTR vs Burstiness", variant: "h4", weight: "semibold" },
          scatterData.length > 0
            ? {
                type: "chart-scatter",
                data: scatterData,
                height: CHART_HEIGHT.scatter,
                xAxisLabel: "TTR",
                yAxisLabel: "Burstiness",
                pointSize: 8,
              }
            : { type: "text", text: t("common.noData"), color: "muted", className: "text-center p-8" },
        ],
      },
    ],
  })

  const buildHistogramCard = (): A2UICardNode => ({
    type: "card",
    children: [
      {
        type: "column",
        gap: LAYOUT_GAP.content,
        children: [
          { type: "text", text: "Word Count Distribution", variant: "h4", weight: "semibold" },
          wordCountHistogramData.length > 0
            ? {
                type: "chart-histogram",
                data: wordCountHistogramData,
                height: CHART_HEIGHT.bar,
                xAxisLabel: "Word Count",
                yAxisLabel: "Frequency",
              }
            : { type: "text", text: t("common.noData"), color: "muted", className: "text-center p-8" },
        ],
      },
    ],
  })

  const buildGaugeCards = (): A2UICardNode[] => {
    if (!metricsStats) return []

    return [
      {
        type: "card",
        children: [
          {
            type: "column",
            gap: LAYOUT_GAP.content,
            children: [
              { type: "text", text: "TTR Level", variant: "h4", weight: "semibold" },
              {
                type: "chart-gauge",
                value: parseFloat(metricsStats.ttr) * 100,
                min: 0,
                max: 100,
                height: CHART_HEIGHT.gauge,
                label: "TTR",
                thresholds: [
                  { value: 40, color: "#ef4444", label: "Low" },
                  { value: 70, color: "#f59e0b", label: "Medium" },
                  { value: 85, color: "#22c55e", label: "High" },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "card",
        children: [
          {
            type: "column",
            gap: LAYOUT_GAP.content,
            children: [
              { type: "text", text: "Burstiness Level", variant: "h4", weight: "semibold" },
              {
                type: "chart-gauge",
                value: parseFloat(metricsStats.burstiness) * 100,
                min: 0,
                max: 100,
                height: CHART_HEIGHT.gauge,
                label: "Burstiness",
                thresholds: [
                  { value: 30, color: "#22c55e", label: "Low" },
                  { value: 60, color: "#f59e0b", label: "Medium" },
                  { value: 80, color: "#22c55e", label: "High" },
                ],
              },
            ],
          },
        ],
      },
    ]
  }

  const radarCard = useMemo((): A2UICardNode => {
    if (radarData.length === 0) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.noData"), color: "muted" }],
      }
    }

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: t("insights.styleProfile"), variant: "h4", weight: "semibold" },
            {
              type: "chart-radar",
              data: radarData,
              keys: ["value"],
              indexBy: "trait",
              height: CHART_HEIGHT.card,
              maxValue: 100,
            },
          ],
        },
      ],
    }
  }, [radarData, t])

  const trendCard = useMemo((): A2UICardNode => {
    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            {
              type: "row",
              justify: "between",
              align: "center",
              children: [
                { type: "text", text: t("insights.metricsTrend"), variant: "h4", weight: "semibold" },
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
            trendChartData.length > 0
              ? {
                  type: "chart-line",
                  data: trendChartData,
                  height: CHART_HEIGHT.trend,
                  enableArea: true,
                  curve: "catmullRom",
                  xLegend: t("common.date"),
                }
              : { type: "text", text: t("common.noData"), color: "muted", className: "text-center p-8" },
          ],
        },
      ],
    }
  }, [trendChartData, trendDays, t])

  const wordCloudCard = useMemo((): A2UICardNode => {
    if (wordCloudData.length === 0) {
      return {
        type: "card",
        children: [
          {
            type: "column",
            gap: LAYOUT_GAP.content,
            children: [
              { type: "text", text: t("insights.toneKeywords"), variant: "h4", weight: "semibold" },
              { type: "text", text: t("common.noData"), color: "muted" },
            ],
          },
        ],
      }
    }

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: t("insights.toneKeywords"), variant: "h4", weight: "semibold" },
            {
              type: "chart-word-cloud",
              words: wordCloudData,
              height: CHART_HEIGHT.compact,
            },
          ],
        },
      ],
    }
  }, [wordCloudData, t])

  const barChartCard = useMemo((): A2UICardNode => {
    if (barChartData.length === 0) {
      return {
        type: "card",
        children: [
          {
            type: "column",
            gap: LAYOUT_GAP.content,
            children: [
              { type: "text", text: t("insights.categoryInsights"), variant: "h4", weight: "semibold" },
              { type: "text", text: t("common.noData"), color: "muted" },
            ],
          },
        ],
      }
    }

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: t("insights.categoryInsights"), variant: "h4", weight: "semibold" },
            {
              type: "chart-bar",
              data: barChartData,
              keys: ["count"],
              indexBy: "type",
              layout: "horizontal",
              height: CHART_HEIGHT.bar,
            },
          ],
        },
      ],
    }
  }, [barChartData, t])

  const treemapCard = useMemo((): A2UICardNode => {
    if (treemapData.length === 0) {
      return {
        type: "card",
        children: [
          {
            type: "column",
            gap: LAYOUT_GAP.content,
            children: [
              { type: "text", text: "Category Distribution", variant: "h4", weight: "semibold" },
              { type: "text", text: t("common.noData"), color: "muted" },
            ],
          },
        ],
      }
    }

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: "Category Distribution", variant: "h4", weight: "semibold" },
            {
              type: "chart-treemap",
              data: treemapData,
              height: CHART_HEIGHT.treemap,
            },
          ],
        },
      ],
    }
  }, [treemapData])

  const styleCombinationsCard = useMemo((): A2UICardNode => {
    if (styleCombinationsData.length === 0) {
      return {
        type: "card",
        children: [
          {
            type: "column",
            gap: LAYOUT_GAP.content,
            children: [
              { type: "text", text: "Best Style-Prompt Combinations", variant: "h4", weight: "semibold" },
              { type: "text", text: t("common.noData"), color: "muted" },
            ],
          },
        ],
      }
    }

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: "Best Style-Prompt Combinations", variant: "h4", weight: "semibold" },
            {
              type: "column",
              gap: "0.5rem",
              children: styleCombinationsData.map((combo, index) => ({
                type: "row",
                gap: "1rem",
                align: "center",
                justify: "between",
                className: "p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors",
                children: [
                  {
                    type: "column",
                    gap: "0.25rem",
                    style: { flex: 1 },
                    children: [
                      { type: "text", text: `${index + 1}. ${combo.style}`, variant: "body", weight: "medium" },
                      { type: "text", text: combo.prompt, variant: "caption", color: "muted" },
                    ],
                  },
                  {
                    type: "row",
                    gap: "1rem",
                    children: [
                      {
                        type: "column",
                        gap: "0.25rem",
                        className: "text-center",
                        children: [
                          { type: "text", text: String(combo.uses), variant: "body", weight: "bold" },
                          { type: "text", text: "Uses", variant: "caption", color: "muted" },
                        ],
                      },
                      {
                        type: "column",
                        gap: "0.25rem",
                        className: "text-center",
                        children: [
                          { type: "text", text: combo.successRate, variant: "body", weight: "bold", color: "success" },
                          { type: "text", text: "Success", variant: "caption", color: "muted" },
                        ],
                      },
                    ],
                  },
                ],
              })),
            },
          ],
        },
      ],
    }
  }, [styleCombinationsData, t])

  const metricsComparisonCard = useMemo((): A2UICardNode => {
    if (!metricsComparison) {
      return {
        type: "card",
        children: [
          {
            type: "column",
            gap: LAYOUT_GAP.content,
            children: [
              { type: "text", text: "Your Metrics vs Global Average", variant: "h4", weight: "semibold" },
              { type: "text", text: t("common.noData"), color: "muted" },
            ],
          },
        ],
      }
    }

    const metrics = [
      { label: t("insights.wordCount"), user: Number(metricsComparison.userMetrics.wordCount) || 0, global: Number(metricsComparison.globalMetrics.wordCount) || 0, diff: Number(metricsComparison.comparison.wordCountDiff) || 0 },
      { label: t("reverse.paragraphCount"), user: Number(metricsComparison.userMetrics.paraCount) || 0, global: Number(metricsComparison.globalMetrics.paraCount) || 0, diff: Number(metricsComparison.comparison.paraCountDiff) || 0 },
      { label: "TTR", user: Number(metricsComparison.userMetrics.ttr) || 0, global: Number(metricsComparison.globalMetrics.ttr) || 0, diff: Number(metricsComparison.comparison.ttrDiff) || 0 },
      { label: "Burstiness", user: Number(metricsComparison.userMetrics.burstiness) || 0, global: Number(metricsComparison.globalMetrics.burstiness) || 0, diff: Number(metricsComparison.comparison.burstinessDiff) || 0 },
    ]

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: "Your Metrics vs Global Average", variant: "h4", weight: "semibold" },
            {
              type: "column",
              gap: "0.75rem",
              children: metrics.map((metric) => ({
                type: "column",
                gap: "0.25rem",
                children: [
                  {
                    type: "row",
                    justify: "between",
                    align: "center",
                    children: [
                      { type: "text", text: metric.label, variant: "body", weight: "medium" },
                      {
                        type: "badge",
                        text: `${metric.diff > 0 ? "+" : ""}${metric.diff.toFixed(1)}%`,
                        color: metric.diff > 0 ? "success" : metric.diff < 0 ? "warning" : "default",
                      },
                    ],
                  },
                  {
                    type: "row",
                    gap: "1rem",
                    children: [
                      {
                        type: "column",
                        gap: "0.125rem",
                        style: { flex: 1 },
                        children: [
                          { type: "text", text: "You", variant: "caption", color: "muted" },
                          { type: "text", text: metric.user.toFixed(2), variant: "body" },
                        ],
                      },
                      {
                        type: "column",
                        gap: "0.125rem",
                        style: { flex: 1 },
                        children: [
                          { type: "text", text: "Global", variant: "caption", color: "muted" },
                          { type: "text", text: metric.global.toFixed(2), variant: "body", color: "muted" },
                        ],
                      },
                    ],
                  },
                  { type: "divider" },
                ],
              })),
            },
          ],
        },
      ],
    }
  }, [metricsComparison, t])

  const topStylesCard = useMemo((): A2UICardNode => {
    if (topStylesData.length === 0) {
      return {
        type: "card",
        children: [
          {
            type: "column",
            gap: LAYOUT_GAP.content,
            children: [
              { type: "text", text: "Most Used Styles", variant: "h4", weight: "semibold" },
              { type: "text", text: t("common.noData"), color: "muted" },
            ],
          },
        ],
      }
    }

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: "Most Used Styles", variant: "h4", weight: "semibold" },
            {
              type: "column",
              gap: "0.5rem",
              children: topStylesData.map((style, index) => ({
                type: "row",
                gap: "1rem",
                align: "center",
                justify: "between",
                className: "p-2 rounded-lg hover:bg-muted/30 transition-colors",
                children: [
                  {
                    type: "row",
                    gap: "0.5rem",
                    align: "center",
                    style: { flex: 1 },
                    children: [
                      { type: "text", text: `${index + 1}.`, variant: "body", color: "muted" },
                      { type: "text", text: style.name, variant: "body", weight: "medium" },
                    ],
                  },
                  {
                    type: "row",
                    gap: "1rem",
                    children: [
                      {
                        type: "badge",
                        text: `${style.uses} uses`,
                        color: "default",
                      },
                      { type: "text", text: style.lastUsed, variant: "caption", color: "muted" },
                    ],
                  },
                ],
              })),
            },
          ],
        },
      ],
    }
  }, [topStylesData, t])

  const topPromptsCard = useMemo((): A2UICardNode => {
    if (topPromptsData.length === 0) {
      return {
        type: "card",
        children: [
          {
            type: "column",
            gap: LAYOUT_GAP.content,
            children: [
              { type: "text", text: "Most Used Prompts", variant: "h4", weight: "semibold" },
              { type: "text", text: t("common.noData"), color: "muted" },
            ],
          },
        ],
      }
    }

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: "Most Used Prompts", variant: "h4", weight: "semibold" },
            {
              type: "column",
              gap: "0.5rem",
              children: topPromptsData.map((prompt, index) => ({
                type: "row",
                gap: "1rem",
                align: "center",
                justify: "between",
                className: "p-2 rounded-lg hover:bg-muted/30 transition-colors",
                children: [
                  {
                    type: "row",
                    gap: "0.5rem",
                    align: "center",
                    style: { flex: 1 },
                    children: [
                      { type: "text", text: `${index + 1}.`, variant: "body", color: "muted" },
                      { type: "text", text: prompt.name, variant: "body", weight: "medium" },
                    ],
                  },
                  {
                    type: "row",
                    gap: "1rem",
                    children: [
                      {
                        type: "badge",
                        text: `${prompt.uses} uses`,
                        color: "default",
                      },
                      { type: "text", text: prompt.lastUsed, variant: "caption", color: "muted" },
                    ],
                  },
                ],
              })),
            },
          ],
        },
      ],
    }
  }, [topPromptsData, t])

  const typeDistributionCard = useMemo((): A2UICardNode => {
    if (typeDistributionData.length === 0) {
      return {
        type: "card",
        children: [
          {
            type: "column",
            gap: LAYOUT_GAP.content,
            children: [
              { type: "text", text: t("insights.byCategory"), variant: "h4", weight: "semibold" },
              { type: "text", text: t("common.noData"), color: "muted" },
            ],
          },
        ],
      }
    }

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: t("insights.byCategory"), variant: "h4", weight: "semibold" },
            {
              type: "chart-pie",
              data: typeDistributionData,
              height: CHART_HEIGHT.card,
              innerRadius: 0.5,
            },
          ],
        },
      ],
    }
  }, [typeDistributionData, t])

  const buildPageNode = (): A2UIColumnNode => ({
    type: "column",
    gap: LAYOUT_GAP.section,
    children: [
      { type: "text", text: t("insights.title"), variant: "h2", weight: "bold" },
      headerCard,
      metricsCard,
      metricsComparisonCard,
      {
        type: "row",
        gap: LAYOUT_GAP.card,
        wrap: true,
        children: [
          { type: "column", style: { flex: 1, minWidth: CARD_MIN_WIDTH }, children: [typeDistributionCard] },
          { type: "column", style: { flex: 1, minWidth: CARD_MIN_WIDTH }, children: [radarCard] },
        ],
      },
      {
        type: "row",
        gap: LAYOUT_GAP.card,
        wrap: true,
        children: [
          { type: "column", style: { flex: 1, minWidth: CARD_MIN_WIDTH }, children: [buildScatterChartCard()] },
          { type: "column", style: { flex: 1, minWidth: CARD_MIN_WIDTH }, children: [buildHistogramCard()] },
        ],
      },
      trendCard,
      {
        type: "row",
        gap: LAYOUT_GAP.card,
        wrap: true,
        children: [
          { type: "column", style: { flex: 1, minWidth: CARD_MIN_WIDTH }, children: buildGaugeCards() },
          { type: "column", style: { flex: 1, minWidth: CARD_MIN_WIDTH }, children: [wordCloudCard] },
        ],
      },
      {
        type: "row",
        gap: LAYOUT_GAP.card,
        wrap: true,
        children: [
          { type: "column", style: { flex: 1, minWidth: CARD_MIN_WIDTH }, children: [barChartCard] },
          { type: "column", style: { flex: 1, minWidth: CARD_MIN_WIDTH }, children: [treemapCard] },
        ],
      },
      styleCombinationsCard,
      {
        type: "row",
        gap: LAYOUT_GAP.card,
        wrap: true,
        children: [
          { type: "column", style: { flex: 1, minWidth: CARD_MIN_WIDTH }, children: [topStylesCard] },
          { type: "column", style: { flex: 1, minWidth: CARD_MIN_WIDTH }, children: [topPromptsCard] },
        ],
      },
    ],
  })

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
    children: [buildPageNode()],
  }

  return <A2UIRenderer node={appShellNode} onAction={handleAction} />
}
