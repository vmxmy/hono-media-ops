"use client"

import { useState, useCallback, useMemo } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UIAppShellNode, A2UINode, A2UIColumnNode, A2UICardNode } from "@/lib/a2ui"
import { buildNavItems } from "@/lib/navigation"

// ============================================================================
// Chart Layout Constants
// ============================================================================
const CHART_HEIGHT = {
  card: 280,      // Standard card chart height (pie, radar, radial-bar)
  trend: 300,     // Full-width trend chart height
  compact: 200,   // Compact chart height (word cloud)
  bar: 250,       // Bar chart height
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

  // API queries
  const { data: profile, isLoading: profileLoading } = api.reverseLogs.getMyStyleProfile.useQuery()
  const { data: statistics } = api.reverseLogs.getMyStatistics.useQuery()
  const { data: trend } = api.reverseLogs.getMyMetricsTrend.useQuery({ days: trendDays })

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

  // Transform data for stat cards
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
    return Object.entries(statistics.byPrimaryType)
      .filter(([type]) => type && type !== "null" && type !== "undefined")
      .slice(0, 8)
      .map(([type, count]) => ({
        id: type,
        label: type,
        value: count as number,
      }))
  }, [statistics])

  const trendChartData = useMemo(() => {
    if (!trend?.length) return []
    return [
      {
        id: t("insights.wordCount"),
        data: trend.map((point) => ({
          x: point.date.slice(5), // MM-DD format
          y: point.wordCount ?? 0,
        })),
      },
      {
        id: "TTR×1000",
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
      value: 20 - index, // Higher value for earlier words (more common)
    }))
  }, [profile])

  const radarData = useMemo(() => {
    if (!profile?.averageMetrics) return []
    const { wordCount, paraCount, ttr, burstiness } = profile.averageMetrics
    return [
      { trait: t("insights.wordCount"), value: Math.min(((wordCount ?? 0) / 5000) * 100, 100) },
      { trait: t("reverse.paragraphCount"), value: Math.min(((paraCount ?? 0) / 50) * 100, 100) },
      { trait: "TTR", value: (ttr ?? 0) * 100 },
      { trait: "Burstiness", value: (burstiness ?? 0) * 100 },
    ]
  }, [profile, t])

  // Build header stats card
  const buildHeaderCard = (): A2UICardNode => {
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
              style: { textAlign: "center" },
              children: [
                { type: "text", text: String(profile.totalAnalyses), variant: "h1", weight: "bold" },
                { type: "text", text: t("insights.totalAnalyses"), variant: "caption", color: "muted" },
              ],
            },
            {
              type: "column",
              gap: "0.25rem",
              style: { textAlign: "center" },
              children: [
                { type: "text", text: profile.lastAnalysisAt ? new Date(profile.lastAnalysisAt).toLocaleDateString() : "-", variant: "h3" },
                { type: "text", text: t("insights.lastAnalysis"), variant: "caption", color: "muted" },
              ],
            },
            {
              type: "column",
              gap: "0.25rem",
              style: { textAlign: "center" },
              children: [
                { type: "text", text: String(profile.topPrimaryTypes.length), variant: "h3" },
                { type: "text", text: t("insights.topCategories"), variant: "caption", color: "muted" },
              ],
            },
          ],
        },
      ],
    }
  }

  // Build metrics stat cards
  const buildMetricsCard = (): A2UICardNode => {
    if (!metricsStats) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.noData"), color: "muted" }],
      }
    }

    // Helper to build a single stat item
    const buildStatItem = (value: string | number, label: string, description?: string): A2UINode => ({
      type: "column",
      gap: "0.25rem",
      style: { textAlign: "center", flex: 1, minWidth: "100px" },
      children: [
        { type: "text", text: String(value), variant: "h2", weight: "bold" },
        { type: "text", text: label, variant: "caption", color: "muted" },
        ...(description ? [{ type: "text", text: description, variant: "caption", color: "muted", style: { fontSize: "10px" } } as A2UINode] : []),
      ],
    })

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
                buildStatItem(metricsStats.wordCount.toLocaleString(), t("insights.wordCount")),
                buildStatItem(metricsStats.paraCount, t("reverse.paragraphCount")),
                buildStatItem(metricsStats.ttr, "TTR", t("insights.ttrDescription")),
                buildStatItem(metricsStats.burstiness, "Burstiness", t("insights.burstyDescription")),
              ],
            },
          ],
        },
      ],
    }
  }

  // Build type distribution pie chart card
  const buildTypeDistributionCard = (): A2UICardNode => {
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
            } as A2UINode,
          ],
        },
      ],
    }
  }

  // Build radar chart card
  const buildRadarCard = (): A2UICardNode => {
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
            } as A2UINode,
          ],
        },
      ],
    }
  }

  // Build trend chart card
  const buildTrendCard = (): A2UICardNode => {
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
              ? ({
                  type: "chart-line",
                  data: trendChartData,
                  height: CHART_HEIGHT.trend,
                  enableArea: true,
                  curve: "catmullRom",
                  xLegend: t("common.date"),
                } as A2UINode)
              : { type: "text", text: t("common.noData"), color: "muted", style: { textAlign: "center", padding: "2rem" } },
          ],
        },
      ],
    }
  }

  // Build word cloud card
  const buildWordCloudCard = (): A2UICardNode => {
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
            } as A2UINode,
          ],
        },
      ],
    }
  }

  // Build bar chart card
  const buildBarChartCard = (): A2UICardNode => {
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
            } as A2UINode,
          ],
        },
      ],
    }
  }

  // Build main page layout - 6 chart modules
  const buildPageNode = (): A2UIColumnNode => ({
    type: "column",
    gap: LAYOUT_GAP.section,
    children: [
      // Title
      { type: "text", text: t("insights.title"), variant: "h2", weight: "bold" },
      // Header stats
      buildHeaderCard(),
      // Row 1: Metrics Stats (full width)
      buildMetricsCard(),
      // Row 2: Type Distribution + Radar
      {
        type: "row",
        gap: LAYOUT_GAP.card,
        wrap: true,
        children: [
          { type: "column", style: { flex: 1, minWidth: CARD_MIN_WIDTH }, children: [buildTypeDistributionCard()] },
          { type: "column", style: { flex: 1, minWidth: CARD_MIN_WIDTH }, children: [buildRadarCard()] },
        ],
      },
      // Row 3: Trend Chart (full width)
      buildTrendCard(),
      // Row 3: Word Cloud + Bar Chart
      {
        type: "row",
        gap: LAYOUT_GAP.card,
        wrap: true,
        children: [
          { type: "column", style: { flex: 1, minWidth: CARD_MIN_WIDTH }, children: [buildWordCloudCard()] },
          { type: "column", style: { flex: 1, minWidth: CARD_MIN_WIDTH }, children: [buildBarChartCard()] },
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
