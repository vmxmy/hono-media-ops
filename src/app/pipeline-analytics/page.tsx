"use client"

import { useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { DashboardShell } from "@/components/dashboard-shell"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UIAppShellNode, A2UICardNode, A2UINode } from "@/lib/a2ui"
import { ANALYTICS_LAYOUT, analyticsCard, analyticsGrid, analyticsHeader } from "@/lib/analytics/layout"

export default function PipelineAnalyticsPage() {
  const { t } = useI18n()
  const { status } = useSession()

  // API calls
  const { data: overview } = api.pipelineAnalytics.getOverview.useQuery()
  const { data: statusDistribution } = api.pipelineAnalytics.getStatusDistribution.useQuery()
  const { data: creationTrend } = api.pipelineAnalytics.getCreationTrend.useQuery({ days: 30 })
  const { data: completionTrend } = api.pipelineAnalytics.getCompletionTrend.useQuery({ days: 30 })
  const { data: progressAnalysis } = api.pipelineAnalytics.getProgressAnalysis.useQuery()
  const { data: topSources } = api.pipelineAnalytics.getTopSources.useQuery({ limit: 10 })
  const { data: topTopics } = api.pipelineAnalytics.getTopTopics.useQuery({ limit: 10 })
  const { data: topKeywords } = api.pipelineAnalytics.getTopKeywords.useQuery({ limit: 20 })
  const { data: performanceMetrics } = api.pipelineAnalytics.getPerformanceMetrics.useQuery()

  // Overview card
  const overviewCard = useMemo((): A2UICardNode => {
    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Overview", variant: "h3" },
            {
              type: "row",
              gap: ANALYTICS_LAYOUT.cardGap,
              wrap: true,
              children: [
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: overview?.totalPipelines.toLocaleString() ?? "0", variant: "h2" },
                    { type: "text", text: "Total Pipelines", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: overview?.completedCount.toLocaleString() ?? "0", variant: "h2", color: "success" },
                    { type: "text", text: "Completed", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: overview?.processingCount.toLocaleString() ?? "0", variant: "h2" },
                    { type: "text", text: "Processing", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: `${overview?.completionRate.toFixed(1) ?? "0"}%`, variant: "h2" },
                    { type: "text", text: "Completion Rate", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
            { type: "divider" },
            {
              type: "row",
              gap: ANALYTICS_LAYOUT.cardGap,
              wrap: true,
              children: [
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: overview?.analyzingCount.toLocaleString() ?? "0", variant: "h2" },
                    { type: "text", text: "Analyzing", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: overview?.pendingSelectionCount.toLocaleString() ?? "0", variant: "h2" },
                    { type: "text", text: "Pending Selection", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: overview?.failedCount.toLocaleString() ?? "0", variant: "h2", color: "destructive" },
                    { type: "text", text: "Failed", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
  }, [overview])

  // Status distribution card
  const statusDistCard = useMemo((): A2UICardNode => {
    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Status Distribution", variant: "h3" },
            {
              type: "column",
              gap: ANALYTICS_LAYOUT.contentGap,
              children: (statusDistribution?.map((item) => ({
                type: "row" as const,
                justify: "between" as const,
                padding: "0.5rem" as const,
                style: { borderBottom: "1px solid #eee" },
                children: [
                  { type: "text" as const, text: item.status, variant: "body" as const },
                  { type: "text" as const, text: `${item.count} (${item.percentage.toFixed(1)}%)`, variant: "caption" as const, color: "muted" as const },
                ],
              })) ?? []) as A2UINode[],
            },
          ],
        },
      ],
    })
  }, [statusDistribution])

  // Creation trend card
  const creationTrendCard = useMemo((): A2UICardNode => {
    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Creation Trend (30 Days)", variant: "h3" },
            {
              type: "column",
              gap: "0.25rem",
              children: (creationTrend?.slice(-7).map((item) => ({
                type: "row" as const,
                justify: "between" as const,
                padding: "0.5rem" as const,
                children: [
                  { type: "text" as const, text: item.date, variant: "body" as const },
                  { type: "text" as const, text: `${item.count} pipelines`, variant: "caption" as const, color: "muted" as const },
                ],
              })) ?? []) as A2UINode[],
            },
          ],
        },
      ],
    })
  }, [creationTrend])

  // Completion trend card
  const completionTrendCard = useMemo((): A2UICardNode => {
    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Completion Trend (30 Days)", variant: "h3" },
            {
              type: "column",
              gap: "0.25rem",
              children: (completionTrend?.slice(-7).map((item) => ({
                type: "row" as const,
                justify: "between" as const,
                padding: "0.5rem" as const,
                children: [
                  { type: "text" as const, text: item.date, variant: "body" as const },
                  { type: "text" as const, text: `${item.count} (${(item.avgCompletionTime / 60).toFixed(1)}m)`, variant: "caption" as const, color: "muted" as const },
                ],
              })) ?? []) as A2UINode[],
            },
          ],
        },
      ],
    })
  }, [completionTrend])

  // Progress analysis card
  const progressAnalysisCard = useMemo((): A2UICardNode => {
    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Progress Analysis", variant: "h3" },
            {
              type: "row",
              gap: ANALYTICS_LAYOUT.cardGap,
              wrap: true,
              children: [
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: `${progressAnalysis?.avgArticleProgress.toFixed(1) ?? "0"}%`, variant: "h2" },
                    { type: "text", text: "Avg Article Progress", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: `${progressAnalysis?.avgXhsProgress.toFixed(1) ?? "0"}%`, variant: "h2" },
                    { type: "text", text: "Avg XHS Progress", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
            { type: "divider" },
            {
              type: "row",
              gap: ANALYTICS_LAYOUT.cardGap,
              wrap: true,
              children: [
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: progressAnalysis?.fullyCompletedArticles.toLocaleString() ?? "0", variant: "h2", color: "success" },
                    { type: "text", text: "Completed Articles", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: progressAnalysis?.fullyCompletedXhs.toLocaleString() ?? "0", variant: "h2", color: "success" },
                    { type: "text", text: "Completed XHS", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
  }, [progressAnalysis])

  // Top sources card
  const topSourcesCard = useMemo((): A2UICardNode => {
    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Top Sources", variant: "h3" },
            {
              type: "column",
              gap: ANALYTICS_LAYOUT.contentGap,
              children: (topSources?.map((item) => ({
                type: "column" as const,
                gap: "0.25rem" as const,
                padding: "0.5rem" as const,
                style: { borderBottom: "1px solid #eee" },
                children: [
                  { type: "text" as const, text: item.sourceUrl, variant: "body" as const },
                  {
                    type: "row" as const,
                    gap: ANALYTICS_LAYOUT.cardGap,
                    children: [
                      { type: "text" as const, text: `${item.count} total`, variant: "caption" as const, color: "muted" as const },
                      { type: "text" as const, text: `${item.successCount} success`, variant: "caption" as const, color: "muted" as const },
                      { type: "text" as const, text: `${item.successRate.toFixed(1)}% rate`, variant: "caption" as const, color: "muted" as const },
                    ],
                  },
                ],
              })) ?? []) as A2UINode[],
            },
          ],
        },
      ],
    })
  }, [topSources])

  // Top topics card
  const topTopicsCard = useMemo((): A2UICardNode => {
    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Top Topics", variant: "h3" },
            {
              type: "column",
              gap: ANALYTICS_LAYOUT.contentGap,
              children: (topTopics?.map((item) => ({
                type: "row" as const,
                justify: "between" as const,
                padding: "0.5rem" as const,
                style: { borderBottom: "1px solid #eee" },
                children: [
                  { type: "text" as const, text: item.topic, variant: "body" as const },
                  { type: "text" as const, text: `${item.count} (${item.avgWordCount.toFixed(0)} words)`, variant: "caption" as const, color: "muted" as const },
                ],
              })) ?? []) as A2UINode[],
            },
          ],
        },
      ],
    })
  }, [topTopics])

  // Top keywords card
  const topKeywordsCard = useMemo((): A2UICardNode => {
    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Top Keywords", variant: "h3" },
            {
              type: "row",
              gap: ANALYTICS_LAYOUT.contentGap,
              wrap: true,
              children: (topKeywords?.slice(0, 15).map((item) => ({
                type: "badge" as const,
                text: `${item.keyword} (${item.count})`,
                color: "primary" as const,
              })) ?? []) as A2UINode[],
            },
          ],
        },
      ],
    })
  }, [topKeywords])

  // Performance metrics card
  const performanceCard = useMemo((): A2UICardNode => {
    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Performance Metrics", variant: "h3" },
            {
              type: "row",
              gap: ANALYTICS_LAYOUT.cardGap,
              wrap: true,
              children: [
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: `${((performanceMetrics?.avgTimeToComplete ?? 0) / 60).toFixed(1)}m`, variant: "h2" },
                    { type: "text", text: "Avg Time", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: `${performanceMetrics?.successRate.toFixed(1) ?? "0"}%`, variant: "h2", color: "success" },
                    { type: "text", text: "Success Rate", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: performanceMetrics?.avgArticleChapters.toFixed(1) ?? "0", variant: "h2" },
                    { type: "text", text: "Avg Chapters", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: performanceMetrics?.avgXhsImages.toFixed(1) ?? "0", variant: "h2" },
                    { type: "text", text: "Avg Images", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
  }, [performanceMetrics])

  if (status === "loading") return null

  const contentNode: A2UINode = {
        type: "column",
        gap: ANALYTICS_LAYOUT.sectionGap,
        children: [
          analyticsHeader("Pipeline Analytics", "Pipeline throughput and performance overview."),
          overviewCard,
          analyticsGrid([statusDistCard, progressAnalysisCard]),
          analyticsGrid([creationTrendCard, completionTrendCard]),
          analyticsGrid([topSourcesCard, topTopicsCard]),
          analyticsGrid([topKeywordsCard, performanceCard]),
        ],
      }

  return (
    <DashboardShell>
      <A2UIRenderer node={contentNode} />
    </DashboardShell>
  )
}
