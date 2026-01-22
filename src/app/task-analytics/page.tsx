"use client"

import { useMemo } from "react"
import { useSession } from "next-auth/react"
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { DashboardShell } from "@/components/dashboard-shell"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UICardNode, A2UINode } from "@/lib/a2ui"
import { ANALYTICS_LAYOUT, analyticsCard, analyticsGrid, analyticsHeader } from "@/lib/analytics/layout"

export default function TaskAnalyticsPage() {
  const { t } = useI18n()
  const { status } = useSession()

  // Task Analytics API calls
  const { data: overview } = api.taskAnalytics.getOverview.useQuery()
  const { data: statusDistribution } = api.taskAnalytics.getStatusDistribution.useQuery()
  const { data: creationTrend } = api.taskAnalytics.getCreationTrend.useQuery({ days: 30 })
  const { data: completionTrend } = api.taskAnalytics.getCompletionTrend.useQuery({ days: 30 })
  const { data: wordCountDistribution } = api.taskAnalytics.getWordCountDistribution.useQuery()
  const { data: progressAnalysis } = api.taskAnalytics.getProgressAnalysis.useQuery()
  const { data: referenceUsage } = api.taskAnalytics.getReferenceUsage.useQuery()
  const { data: executionStats } = api.taskAnalytics.getExecutionStats.useQuery()
  const { data: topTopics } = api.taskAnalytics.getTopTopics.useQuery({ limit: 10 })
  const { data: topKeywords } = api.taskAnalytics.getTopKeywords.useQuery({ limit: 20 })

  const overviewCard = useMemo((): A2UICardNode => {
    if (!overview) {
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
                    { type: "text", text: "Total Tasks", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: overview.completedCount.toString(), variant: "h2", weight: "bold", color: "success" },
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
                    { type: "text", text: overview.avgWordCount.toLocaleString(), variant: "h2", weight: "bold" },
                    { type: "text", text: "Avg Word Count", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
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
                    { type: "text", text: overview.pendingCount.toString(), variant: "h3", weight: "semibold" },
                    { type: "text", text: "Pending", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: overview.processingCount.toString(), variant: "h3", weight: "semibold", color: "primary" },
                    { type: "text", text: "Processing", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: overview.failedCount.toString(), variant: "h3", weight: "semibold", color: "destructive" },
                    { type: "text", text: "Failed", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: overview.cancelledCount.toString(), variant: "h3", weight: "semibold" },
                    { type: "text", text: "Cancelled", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
  }, [overview, t])

  const statusDistCard = useMemo((): A2UICardNode => {
    if (!statusDistribution || statusDistribution.length === 0) {
      return analyticsCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    const statusColors: Record<string, string> = {
      pending: "#f59e0b",
      processing: "#3b82f6",
      completed: "#22c55e",
      failed: "#ef4444",
      cancelled: "#6b7280",
    }

    const chartData = statusDistribution.map((item) => ({
      id: item.status,
      label: item.status,
      value: item.count,
      color: statusColors[item.status] || "#6b7280",
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
  }, [statusDistribution, t])

  const creationTrendCard = useMemo((): A2UICardNode => {
    if (!creationTrend || creationTrend.length === 0) {
      return analyticsCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    const chartData = [{
      id: "creation",
      color: "#3b82f6",
      data: creationTrend.map((item) => ({
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
  }, [creationTrend, t])

  const completionTrendCard = useMemo((): A2UICardNode => {
    if (!completionTrend || completionTrend.length === 0) {
      return analyticsCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    const chartData = [{
      id: "completion",
      color: "#22c55e",
      data: completionTrend.map((item) => ({
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
            { type: "text", text: "Completion Trend (30 Days)", variant: "h3", weight: "semibold" },
            {
              type: "chart-line",
              data: chartData,
              height: ANALYTICS_LAYOUT.chartHeight.trend,
            },
          ],
        },
      ],
    })
  }, [completionTrend, t])

  const wordCountDistCard = useMemo((): A2UICardNode => {
    if (!wordCountDistribution || wordCountDistribution.length === 0) {
      return analyticsCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    const chartData = wordCountDistribution.map((item) => ({
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
            { type: "text", text: "Word Count Distribution", variant: "h3", weight: "semibold" },
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
  }, [wordCountDistribution, t])

  const progressCard = useMemo((): A2UICardNode => {
    if (!progressAnalysis) {
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
            { type: "text", text: "Progress Analysis", variant: "h3", weight: "semibold" },
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
                    { type: "text", text: `${progressAnalysis.avgProgress}%`, variant: "h2", weight: "bold" },
                    { type: "text", text: "Avg Progress", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: progressAnalysis.completedChapters.toString(), variant: "h2", weight: "bold" },
                    { type: "text", text: "Completed Chapters", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: progressAnalysis.totalChapters.toString(), variant: "h2", weight: "bold" },
                    { type: "text", text: "Total Chapters", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
  }, [progressAnalysis, t])

  const referenceCard = useMemo((): A2UICardNode => {
    if (!referenceUsage) {
      return analyticsCard({
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      })
    }

    const chartData = [
      { id: "Material Only", label: "Material Only", value: referenceUsage.withMaterial, color: "#3b82f6" },
      { id: "Cover Prompt Only", label: "Cover Prompt Only", value: referenceUsage.withCoverPrompt, color: "#22c55e" },
      { id: "Both", label: "Both", value: referenceUsage.withBoth, color: "#f59e0b" },
      { id: "Neither", label: "Neither", value: referenceUsage.withNeither, color: "#6b7280" },
    ]

    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Reference Usage", variant: "h3", weight: "semibold" },
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
  }, [referenceUsage, t])

  const executionCard = useMemo((): A2UICardNode => {
    if (!executionStats) {
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
            { type: "text", text: "Execution Statistics", variant: "h3", weight: "semibold" },
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
                    { type: "text", text: executionStats.totalExecutions.toString(), variant: "h2", weight: "bold" },
                    { type: "text", text: "Total Executions", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: `${executionStats.successRate}%`, variant: "h2", weight: "bold", color: "success" },
                    { type: "text", text: "Success Rate", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: executionStats.failedExecutions.toString(), variant: "h2", weight: "bold", color: "destructive" },
                    { type: "text", text: "Failed", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
  }, [executionStats, t])

  const topTopicsCard = useMemo((): A2UICardNode => {
    if (!topTopics || topTopics.length === 0) {
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
            { type: "text", text: "Top Topics", variant: "h3", weight: "semibold" },
            {
              type: "column",
              gap: "0.5rem",
              children: topTopics.map((topic, index) => ({
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
                      { type: "text" as const, text: `${index + 1}. ${topic.topic}`, weight: "medium" as const },
                      { type: "text" as const, text: `${topic.avgWordCount} words avg`, variant: "caption" as const, color: "muted" as const },
                    ],
                  },
                  {
                    type: "column" as const,
                    gap: "0.25rem",
                    className: "text-right",
                    children: [
                      { type: "text" as const, text: `${topic.count} tasks`, weight: "semibold" as const },
                      { type: "text" as const, text: `${topic.completionRate}% completed`, variant: "caption" as const, color: "muted" as const },
                    ],
                  },
                ],
              })),
            },
          ],
        },
      ],
    })
  }, [topTopics, t])

  const topKeywordsCard = useMemo((): A2UICardNode => {
    if (!topKeywords || topKeywords.length === 0) {
      return {
        type: "card",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    const wordCloudData = topKeywords.map((keyword) => ({
      text: keyword.keyword,
      value: keyword.count,
    }))

    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Top Keywords", variant: "h3", weight: "semibold" },
            {
              type: "chart-word-cloud",
              words: wordCloudData,
              height: ANALYTICS_LAYOUT.chartHeight.compact,
            },
          ],
        },
      ],
    })
  }, [topKeywords, t])

  if (status === "loading") return null

  const contentNode: A2UINode = {
    type: "column",
    gap: ANALYTICS_LAYOUT.sectionGap,
    children: [
      analyticsHeader("Task Analytics", "Task execution, quality, and throughput metrics."),
      overviewCard,
      statusDistCard,
      analyticsGrid([creationTrendCard, completionTrendCard]),
      wordCountDistCard,
      analyticsGrid([progressCard, executionCard]),
      referenceCard,
      topTopicsCard,
      topKeywordsCard,
    ],
  }

  return (
    <DashboardShell>
      <A2UIRenderer node={contentNode} />
    </DashboardShell>
  )
}
