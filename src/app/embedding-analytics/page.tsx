"use client"

import { useMemo } from "react"
import { useSession } from "next-auth/react"
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { DashboardShell } from "@/components/dashboard-shell"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UICardNode, A2UINode } from "@/lib/a2ui"
import { ANALYTICS_LAYOUT, analyticsCard, analyticsGrid, analyticsHeader } from "@/lib/analytics/layout"

export default function EmbeddingAnalyticsPage() {
  const { t } = useI18n()
  const { status } = useSession()

  // API calls
  const { data: overview } = api.embeddingAnalytics.getOverview.useQuery()
  const { data: modelVersionDistribution } = api.embeddingAnalytics.getModelVersionDistribution.useQuery()
  const { data: creationTrend } = api.embeddingAnalytics.getCreationTrend.useQuery({ days: 30 })
  const { data: taskEmbeddingStatus } = api.embeddingAnalytics.getTaskEmbeddingStatus.useQuery()
  const { data: contentHashAnalysis } = api.embeddingAnalytics.getContentHashAnalysis.useQuery()
  const { data: embeddingAge } = api.embeddingAnalytics.getEmbeddingAge.useQuery()
  const { data: recentEmbeddings } = api.embeddingAnalytics.getRecentEmbeddings.useQuery({ limit: 20 })
  const { data: growthRate } = api.embeddingAnalytics.getGrowthRate.useQuery()

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
                    { type: "text", text: overview?.totalEmbeddings.toLocaleString() ?? "0", variant: "h2" },
                    { type: "text", text: "Total Embeddings", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: overview?.totalTasks.toLocaleString() ?? "0", variant: "h2" },
                    { type: "text", text: "Total Tasks", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: `${overview?.embeddingRate.toFixed(1) ?? "0"}%`, variant: "h2" },
                    { type: "text", text: "Embedding Rate", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: overview?.avgEmbeddingsPerDay.toFixed(1) ?? "0", variant: "h2" },
                    { type: "text", text: "Avg/Day", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
  }, [overview])

  // Model version distribution card
  const modelVersionCard = useMemo((): A2UICardNode => {
    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Model Versions", variant: "h3" },
            {
              type: "column",
              gap: ANALYTICS_LAYOUT.contentGap,
              children: (modelVersionDistribution?.map((item) => ({
                type: "row" as const,
                justify: "between" as const,
                padding: "0.5rem" as const,
                style: { borderBottom: "1px solid #eee" },
                children: [
                  { type: "text" as const, text: item.modelVersion, variant: "body" as const },
                  { type: "text" as const, text: `${item.count} (${item.percentage.toFixed(1)}%)`, variant: "caption" as const, color: "muted" as const },
                ],
              })) ?? []) as A2UINode[],
            },
          ],
        },
      ],
    })
  }, [modelVersionDistribution])

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
                  { type: "text" as const, text: `${item.count} embeddings`, variant: "caption" as const, color: "muted" as const },
                ],
              })) ?? []) as A2UINode[],
            },
          ],
        },
      ],
    })
  }, [creationTrend])

  // Task embedding status card
  const taskStatusCard = useMemo((): A2UICardNode => {
    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Task Embedding Status", variant: "h3" },
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
                    { type: "text", text: taskEmbeddingStatus?.totalTasks.toLocaleString() ?? "0", variant: "h2" },
                    { type: "text", text: "Total Tasks", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: taskEmbeddingStatus?.tasksWithEmbeddings.toLocaleString() ?? "0", variant: "h2", color: "success" },
                    { type: "text", text: "With Embeddings", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: taskEmbeddingStatus?.tasksWithoutEmbeddings.toLocaleString() ?? "0", variant: "h2" },
                    { type: "text", text: "Without Embeddings", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: `${taskEmbeddingStatus?.embeddingRate.toFixed(1) ?? "0"}%`, variant: "h2" },
                    { type: "text", text: "Embedding Rate", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
  }, [taskEmbeddingStatus])

  // Content hash analysis card
  const contentHashCard = useMemo((): A2UICardNode => {
    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Content Hash Analysis", variant: "h3" },
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
                    { type: "text", text: contentHashAnalysis?.uniqueHashes.toLocaleString() ?? "0", variant: "h2" },
                    { type: "text", text: "Unique Hashes", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: contentHashAnalysis?.duplicateHashes.toLocaleString() ?? "0", variant: "h2" },
                    { type: "text", text: "Duplicates", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: `${contentHashAnalysis?.duplicateRate.toFixed(1) ?? "0"}%`, variant: "h2" },
                    { type: "text", text: "Duplicate Rate", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
            { type: "divider" },
            { type: "text", text: "Top Duplicates", variant: "body" },
            {
              type: "column",
              gap: "0.25rem",
              children: (contentHashAnalysis?.topDuplicates.slice(0, 5).map((item) => ({
                type: "row" as const,
                justify: "between" as const,
                padding: "0.25rem" as const,
                children: [
                  { type: "text" as const, text: item.contentHash.substring(0, 16) + "...", variant: "body" as const },
                  { type: "text" as const, text: `${item.count} times`, variant: "caption" as const, color: "muted" as const },
                ],
              })) ?? []) as A2UINode[],
            },
          ],
        },
      ],
    })
  }, [contentHashAnalysis])

  // Embedding age card
  const embeddingAgeCard = useMemo((): A2UICardNode => {
    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Embedding Age", variant: "h3" },
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
                    { type: "text", text: `${embeddingAge?.avgAgeInDays.toFixed(1) ?? "0"}d`, variant: "h2" },
                    { type: "text", text: "Avg Age", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: embeddingAge?.embeddingsOlderThan30Days.toLocaleString() ?? "0", variant: "h2" },
                    { type: "text", text: ">30 Days", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: embeddingAge?.embeddingsOlderThan90Days.toLocaleString() ?? "0", variant: "h2" },
                    { type: "text", text: ">90 Days", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
  }, [embeddingAge])

  // Recent embeddings card
  const recentEmbeddingsCard = useMemo((): A2UICardNode => {
    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Recent Embeddings", variant: "h3" },
            {
              type: "column",
              gap: ANALYTICS_LAYOUT.contentGap,
              children: (recentEmbeddings?.slice(0, 10).map((item) => ({
                type: "column" as const,
                gap: "0.25rem" as const,
                padding: "0.5rem" as const,
                style: { borderBottom: "1px solid #eee" },
                children: [
                  { type: "text" as const, text: item.modelVersion, variant: "body" as const },
                  {
                    type: "row" as const,
                    gap: "1rem" as const,
                    children: [
                      { type: "text" as const, text: item.contentHash.substring(0, 12) + "...", variant: "caption" as const, color: "muted" as const },
                      { type: "text" as const, text: new Date(item.createdAt).toLocaleDateString(), variant: "caption" as const, color: "muted" as const },
                    ],
                  },
                ],
              })) ?? []) as A2UINode[],
            },
          ],
        },
      ],
    })
  }, [recentEmbeddings])

  // Growth rate card
  const growthRateCard = useMemo((): A2UICardNode => {
    return analyticsCard({
      type: "card",
      children: [
        {
          type: "column",
          gap: ANALYTICS_LAYOUT.contentGap,
          children: [
            { type: "text", text: "Growth Rate", variant: "h3" },
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
                    { type: "text", text: growthRate?.last7Days.toLocaleString() ?? "0", variant: "h2" },
                    { type: "text", text: "Last 7 Days", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: growthRate?.last30Days.toLocaleString() ?? "0", variant: "h2" },
                    { type: "text", text: "Last 30 Days", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: growthRate?.last90Days.toLocaleString() ?? "0", variant: "h2" },
                    { type: "text", text: "Last 90 Days", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
  }, [growthRate])

  if (status === "loading") return null

  const contentNode: A2UINode = {
    type: "column",
    gap: ANALYTICS_LAYOUT.sectionGap,
    children: [
      analyticsHeader("Embedding Analytics", "Embedding coverage and freshness overview."),
      overviewCard,
      analyticsGrid([modelVersionCard, taskStatusCard]),
      analyticsGrid([creationTrendCard, contentHashCard]),
      analyticsGrid([embeddingAgeCard, growthRateCard]),
      recentEmbeddingsCard,
    ],
  }

  return (
    <DashboardShell>
      <A2UIRenderer node={contentNode} />
    </DashboardShell>
  )
}
