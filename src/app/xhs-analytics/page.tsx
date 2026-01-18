"use client"

import { useCallback, useMemo } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UIAppShellNode, A2UICardNode } from "@/lib/a2ui"
import { buildNavItems } from "@/lib/navigation"

const CHART_HEIGHT = {
  card: 280,
  trend: 300,
  compact: 200,
  bar: 250,
} as const

const CARD_MIN_WIDTH = "280px"
const LAYOUT_GAP = {
  section: "1.5rem",
  card: "1rem",
  content: "0.5rem",
} as const

export default function XhsAnalyticsPage() {
  const { t } = useI18n()
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const mounted = status !== "loading"
  const logout = () => signOut({ callbackUrl: "/login" })
  const navItems = buildNavItems(t)

  // XHS Analytics API calls
  const { data: overview } = api.xhsAnalytics.getOverview.useQuery()
  const { data: statusDistribution } = api.xhsAnalytics.getStatusDistribution.useQuery()
  const { data: creationTrend } = api.xhsAnalytics.getCreationTrend.useQuery({ days: 30 })
  const { data: completionTrend } = api.xhsAnalytics.getCompletionTrend.useQuery({ days: 30 })
  const { data: imageTypeDistribution } = api.xhsAnalytics.getImageTypeDistribution.useQuery()
  const { data: ratioDistribution } = api.xhsAnalytics.getRatioDistribution.useQuery()
  const { data: resolutionDistribution } = api.xhsAnalytics.getResolutionDistribution.useQuery()
  const { data: completionAnalysis } = api.xhsAnalytics.getCompletionAnalysis.useQuery()
  const { data: topSources } = api.xhsAnalytics.getTopSources.useQuery({ limit: 10 })
  const { data: performanceMetrics } = api.xhsAnalytics.getPerformanceMetrics.useQuery()

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

  const overviewCard = useMemo((): A2UICardNode => {
    if (!overview) {
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
            { type: "text", text: "Overview", variant: "h4", weight: "semibold" },
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
                    { type: "text", text: overview.totalJobs.toString(), variant: "h2", weight: "bold" },
                    { type: "text", text: "Total Jobs", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: overview.completedJobs.toString(), variant: "h2", weight: "bold", color: "success" },
                    { type: "text", text: "Completed", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: `${overview.completionRate}%`, variant: "h2", weight: "bold" },
                    { type: "text", text: "Completion Rate", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: overview.totalImages.toLocaleString(), variant: "h2", weight: "bold" },
                    { type: "text", text: "Total Images", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
  }, [overview, t])

  const statusDistCard = useMemo((): A2UICardNode => {
    if (!statusDistribution || statusDistribution.length === 0) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    const statusColors: Record<string, string> = {
      pending: "#f59e0b",
      processing: "#3b82f6",
      completed: "#22c55e",
      failed: "#ef4444",
    }

    const chartData = statusDistribution.map((item) => ({
      id: item.status,
      label: item.status,
      value: item.count,
      color: statusColors[item.status] || "#6b7280",
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
  }, [statusDistribution, t])

  const creationTrendCard = useMemo((): A2UICardNode => {
    if (!creationTrend || creationTrend.length === 0) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    const chartData = [{
      id: "creation",
      color: "#3b82f6",
      data: creationTrend.map((item) => ({
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
  }, [creationTrend, t])

  const completionTrendCard = useMemo((): A2UICardNode => {
    if (!completionTrend || completionTrend.length === 0) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    const chartData = [{
      id: "completion",
      color: "#22c55e",
      data: completionTrend.map((item) => ({
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
            { type: "text", text: "Completion Trend (30 Days)", variant: "h4", weight: "semibold" },
            {
              type: "chart-line",
              data: chartData,
              height: CHART_HEIGHT.trend,
            },
          ],
        },
      ],
    }
  }, [completionTrend, t])

  const imageTypeDistCard = useMemo((): A2UICardNode => {
    if (!imageTypeDistribution || imageTypeDistribution.length === 0) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    const typeColors: Record<string, string> = {
      cover: "#3b82f6",
      content: "#22c55e",
      ending: "#f59e0b",
    }

    const chartData = imageTypeDistribution.map((item) => ({
      id: item.type,
      label: item.type,
      value: item.count,
      color: typeColors[item.type] || "#6b7280",
    }))

    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: LAYOUT_GAP.content,
          children: [
            { type: "text", text: "Image Type Distribution", variant: "h4", weight: "semibold" },
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
  }, [imageTypeDistribution, t])

  const ratioDistCard = useMemo((): A2UICardNode => {
    if (!ratioDistribution || ratioDistribution.length === 0) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    const chartData = ratioDistribution.map((item) => ({
      id: item.ratio,
      label: item.ratio,
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
            { type: "text", text: "Ratio Distribution", variant: "h4", weight: "semibold" },
            {
              type: "chart-bar",
              data: chartData,
              height: CHART_HEIGHT.bar,
              layout: "horizontal",
              keys: ["value"],
              indexBy: "label",
            },
          ],
        },
      ],
    }
  }, [ratioDistribution, t])

  const resolutionDistCard = useMemo((): A2UICardNode => {
    if (!resolutionDistribution || resolutionDistribution.length === 0) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    const chartData = resolutionDistribution.map((item) => ({
      id: item.resolution,
      label: item.resolution,
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
            { type: "text", text: "Resolution Distribution", variant: "h4", weight: "semibold" },
            {
              type: "chart-bar",
              data: chartData,
              height: CHART_HEIGHT.bar,
              layout: "horizontal",
              keys: ["value"],
              indexBy: "label",
            },
          ],
        },
      ],
    }
  }, [resolutionDistribution, t])

  const completionAnalysisCard = useMemo((): A2UICardNode => {
    if (!completionAnalysis) {
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
            { type: "text", text: "Completion Analysis", variant: "h4", weight: "semibold" },
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
                    { type: "text", text: completionAnalysis.fullyCompleted.toString(), variant: "h2", weight: "bold", color: "success" },
                    { type: "text", text: "Fully Completed", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: completionAnalysis.partiallyCompleted.toString(), variant: "h2", weight: "bold" },
                    { type: "text", text: "Partially Completed", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: `${completionAnalysis.avgCompletionRate}%`, variant: "h2", weight: "bold" },
                    { type: "text", text: "Avg Completion", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
  }, [completionAnalysis, t])

  const topSourcesCard = useMemo((): A2UICardNode => {
    if (!topSources || topSources.length === 0) {
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
            { type: "text", text: "Top Sources", variant: "h4", weight: "semibold" },
            {
              type: "column",
              gap: "0.5rem",
              children: topSources.map((source, index) => ({
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
                      { type: "text" as const, text: `${index + 1}. ${source.sourceTitle || source.sourceUrl}`, weight: "medium" as const },
                      { type: "text" as const, text: `${source.totalImages} images`, variant: "caption" as const, color: "muted" as const },
                    ],
                  },
                  {
                    type: "column" as const,
                    gap: "0.25rem",
                    className: "text-right",
                    children: [
                      { type: "text" as const, text: `${source.jobCount} jobs`, weight: "semibold" as const },
                      { type: "text" as const, text: `${source.avgCompletionRate}% completed`, variant: "caption" as const, color: "muted" as const },
                    ],
                  },
                ],
              })),
            },
          ],
        },
      ],
    }
  }, [topSources, t])

  const performanceCard = useMemo((): A2UICardNode => {
    if (!performanceMetrics) {
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
            { type: "text", text: "Performance Metrics", variant: "h4", weight: "semibold" },
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
                    { type: "text", text: `${performanceMetrics.avgCompletionTimeHours}h`, variant: "h2", weight: "bold" },
                    { type: "text", text: "Avg Time", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: `${performanceMetrics.successRate}%`, variant: "h2", weight: "bold", color: "success" },
                    { type: "text", text: "Success Rate", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: performanceMetrics.avgImagesPerCompletedJob.toString(), variant: "h2", weight: "bold" },
                    { type: "text", text: "Avg Images/Job", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
  }, [performanceMetrics, t])

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
          { type: "text", text: "XHS Image Analytics", variant: "h2", weight: "bold" },
          overviewCard,
          statusDistCard,
          {
            type: "row",
            gap: LAYOUT_GAP.card,
            wrap: true,
            children: [
              { type: "column", style: { flex: 1, minWidth: CARD_MIN_WIDTH }, children: [creationTrendCard] },
              { type: "column", style: { flex: 1, minWidth: CARD_MIN_WIDTH }, children: [completionTrendCard] },
            ],
          },
          imageTypeDistCard,
          {
            type: "row",
            gap: LAYOUT_GAP.card,
            wrap: true,
            children: [
              { type: "column", style: { flex: 1, minWidth: CARD_MIN_WIDTH }, children: [ratioDistCard] },
              { type: "column", style: { flex: 1, minWidth: CARD_MIN_WIDTH }, children: [resolutionDistCard] },
            ],
          },
          {
            type: "row",
            gap: LAYOUT_GAP.card,
            wrap: true,
            children: [
              { type: "column", style: { flex: 1, minWidth: CARD_MIN_WIDTH }, children: [completionAnalysisCard] },
              { type: "column", style: { flex: 1, minWidth: CARD_MIN_WIDTH }, children: [performanceCard] },
            ],
          },
          topSourcesCard,
        ],
      },
    ],
  }

  return <A2UIRenderer node={appShellNode} onAction={handleAction} />
}
