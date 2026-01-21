"use client"

import { useCallback, useMemo } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UIAppShellNode, A2UICardNode, A2UIColumnNode } from "@/lib/a2ui"
import { ANALYTICS_LAYOUT, analyticsCard, analyticsGrid, analyticsHeader } from "@/lib/analytics/layout"
import { buildNavItems } from "@/lib/navigation"


export default function ImagePromptAnalyticsPage() {
  const { t } = useI18n()
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const mounted = status !== "loading"
  const logout = () => signOut({ callbackUrl: "/login" })
  const navItems = buildNavItems(t)
  const wrapCard = (card: A2UICardNode) => analyticsCard(card)

  // Image Prompt Analytics API calls
  const { data: overview } = api.imagePromptAnalytics.getOverview.useQuery()
  const { data: usageTrend } = api.imagePromptAnalytics.getUsageTrend.useQuery({ days: 30 })
  const { data: categoryDistribution } = api.imagePromptAnalytics.getCategoryDistribution.useQuery()
  const { data: categoryUsage } = api.imagePromptAnalytics.getCategoryUsage.useQuery()
  const { data: modelDistribution } = api.imagePromptAnalytics.getModelDistribution.useQuery()
  const { data: ratioDistribution } = api.imagePromptAnalytics.getRatioDistribution.useQuery()
  const { data: resolutionDistribution } = api.imagePromptAnalytics.getResolutionDistribution.useQuery()
  const { data: ratingDistribution } = api.imagePromptAnalytics.getRatingDistribution.useQuery()
  const { data: topRatedPrompts } = api.imagePromptAnalytics.getTopRatedPrompts.useQuery({ limit: 10 })
  const { data: sourceDistribution } = api.imagePromptAnalytics.getSourceDistribution.useQuery()
  const { data: creationTrend } = api.imagePromptAnalytics.getCreationTrend.useQuery({ days: 30 })
  const { data: topTags } = api.imagePromptAnalytics.getTopTags.useQuery({ limit: 20 })

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
      return wrapCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    return wrapCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Overview", variant: "h3", weight: "semibold" },
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
                    { type: "text", text: overview.totalCount.toString(), variant: "h2", weight: "bold" },
                    { type: "text", text: "Total Prompts", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: overview.publicCount.toString(), variant: "h2", weight: "bold", color: "success" },
                    { type: "text", text: "Public", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: overview.avgRating.toFixed(1), variant: "h2", weight: "bold" },
                    { type: "text", text: "Avg Rating", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: overview.totalUsage.toLocaleString(), variant: "h2", weight: "bold" },
                    { type: "text", text: "Total Usage", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
  }, [overview, t])

  const categoryDistCard = useMemo((): A2UICardNode => {
    if (!categoryDistribution || categoryDistribution.length === 0) {
      return wrapCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]
    const chartData = categoryDistribution.map((item, index) => ({
      id: item.category,
      label: item.category,
      value: item.count,
      color: colors[index % colors.length],
    }))

    return wrapCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Category Distribution", variant: "h3", weight: "semibold" },
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
  }, [categoryDistribution, t])

  const modelDistCard = useMemo((): A2UICardNode => {
    if (!modelDistribution || modelDistribution.length === 0) {
      return wrapCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"]
    const chartData = modelDistribution.map((item, index) => ({
      id: item.model,
      label: item.model,
      value: item.count,
      color: colors[index % colors.length],
    }))

    return wrapCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Model Distribution", variant: "h3", weight: "semibold" },
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
  }, [modelDistribution, t])

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

    return wrapCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Ratio Distribution", variant: "h3", weight: "semibold" },
            {
              type: "chart-bar",
              data: chartData,
              height: ANALYTICS_LAYOUT.chartHeight.bar,
              layout: "horizontal",
              keys: ["value"],
              indexBy: "label",
            },
          ],
        },
      ],
    })
  }, [ratioDistribution, t])

  const resolutionDistCard = useMemo((): A2UICardNode => {
    if (!resolutionDistribution || resolutionDistribution.length === 0) {
      return wrapCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    const chartData = resolutionDistribution.map((item) => ({
      id: item.resolution,
      label: item.resolution,
      value: item.count,
      color: "#ec4899",
    }))

    return wrapCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Resolution Distribution", variant: "h3", weight: "semibold" },
            {
              type: "chart-bar",
              data: chartData,
              height: ANALYTICS_LAYOUT.chartHeight.bar,
              layout: "horizontal",
              keys: ["value"],
              indexBy: "label",
            },
          ],
        },
      ],
    })
  }, [resolutionDistribution, t])

  const ratingDistCard = useMemo((): A2UICardNode => {
    if (!ratingDistribution || ratingDistribution.length === 0) {
      return wrapCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    const chartData = ratingDistribution.map((item) => ({
      id: `${item.rating} stars`,
      label: `${item.rating} ⭐`,
      value: item.count,
      color: "#f59e0b",
    }))

    return wrapCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Rating Distribution", variant: "h3", weight: "semibold" },
            {
              type: "chart-bar",
              data: chartData,
              height: ANALYTICS_LAYOUT.chartHeight.bar,
              layout: "horizontal",
              keys: ["value"],
              indexBy: "label",
            },
          ],
        },
      ],
    })
  }, [ratingDistribution, t])

  const sourceDistCard = useMemo((): A2UICardNode => {
    if (!sourceDistribution || sourceDistribution.length === 0) {
      return wrapCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    const colors = { manual: "#3b82f6", ai: "#22c55e", imported: "#f59e0b" }
    const chartData = sourceDistribution.map((item) => ({
      id: item.source,
      label: item.source,
      value: item.count,
      color: colors[item.source as keyof typeof colors] || "#6b7280",
    }))

    return wrapCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Source Distribution", variant: "h3", weight: "semibold" },
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
  }, [sourceDistribution, t])

  const topRatedCard = useMemo((): A2UICardNode => {
    if (!topRatedPrompts || topRatedPrompts.length === 0) {
      return wrapCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    return wrapCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Top Rated Prompts", variant: "h3", weight: "semibold" },
            {
              type: "column",
              gap: "0.5rem",
              children: topRatedPrompts.map((prompt, index) => ({
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
                      { type: "text" as const, text: `${index + 1}. ${prompt.title}`, weight: "medium" as const },
                      { type: "text" as const, text: prompt.category || "uncategorized", variant: "caption" as const, color: "muted" as const },
                    ],
                  },
                  {
                    type: "column" as const,
                    gap: "0.25rem",
                    className: "text-right",
                    children: [
                      { type: "text" as const, text: `${"⭐".repeat(prompt.rating)}`, weight: "semibold" as const },
                      { type: "text" as const, text: `${prompt.useCount} uses`, variant: "caption" as const, color: "muted" as const },
                    ],
                  },
                ],
              })),
            },
          ],
        },
      ],
    })
  }, [topRatedPrompts, t])

  const usageTrendCard = useMemo((): A2UICardNode => {
    if (!usageTrend || usageTrend.length === 0) {
      return wrapCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    const chartData = [{
      id: "usage",
      color: "#3b82f6",
      data: usageTrend.map((item) => ({
        x: item.date,
        y: item.count,
      })),
    }]

    return wrapCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Usage Trend (30 Days)", variant: "h3", weight: "semibold" },
            {
              type: "chart-line",
              data: chartData,
              height: ANALYTICS_LAYOUT.chartHeight.trend,
            },
          ],
        },
      ],
    })
  }, [usageTrend, t])

  const creationTrendCard = useMemo((): A2UICardNode => {
    if (!creationTrend || creationTrend.length === 0) {
      return wrapCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    const chartData = [{
      id: "creation",
      color: "#22c55e",
      data: creationTrend.map((item) => ({
        x: item.date,
        y: item.count,
      })),
    }]

    return wrapCard({
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
  }, [creationTrend, t])

  const topTagsCard = useMemo((): A2UICardNode => {
    if (!topTags || topTags.length === 0) {
      return wrapCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    const wordCloudData = topTags.map((tag) => ({
      text: tag.tag,
      value: tag.count,
    }))

    return wrapCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Top Tags", variant: "h3", weight: "semibold" },
            {
              type: "chart-word-cloud",
              words: wordCloudData,
              height: ANALYTICS_LAYOUT.chartHeight.compact,
            },
          ],
        },
      ],
    })
  }, [topTags, t])

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
        gap: ANALYTICS_LAYOUT.sectionGap,
        children: [
          analyticsHeader("Image Prompt Analytics", "Prompt usage, quality, and distribution insights."),
          overviewCard,
          categoryDistCard,
          analyticsGrid([modelDistCard, sourceDistCard]),
          analyticsGrid([ratioDistCard, resolutionDistCard]),
          ratingDistCard,
          topRatedCard,
          analyticsGrid([usageTrendCard, creationTrendCard]),
          topTagsCard,
        ],
      },
    ],
  }

  return <A2UIRenderer node={appShellNode} onAction={handleAction} />
}
