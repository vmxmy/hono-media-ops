"use client"

import { useCallback, useMemo } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UIAppShellNode, A2UICardNode, A2UINode } from "@/lib/a2ui"
import { buildNavItems } from "@/lib/navigation"

export default function WechatArticleAnalyticsPage() {
  const { t } = useI18n()
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const mounted = status !== "loading"
  const logout = () => signOut({ callbackUrl: "/login" })
  const navItems = buildNavItems(t)

  // API calls
  const { data: overview } = api.wechatArticleAnalytics.getOverview.useQuery()
  const { data: accountDistribution } = api.wechatArticleAnalytics.getAccountDistribution.useQuery({ limit: 20 })
  const { data: authorDistribution } = api.wechatArticleAnalytics.getAuthorDistribution.useQuery({ limit: 20 })
  const { data: importTrend } = api.wechatArticleAnalytics.getImportTrend.useQuery({ days: 30 })
  const { data: publishTrend } = api.wechatArticleAnalytics.getPublishTrend.useQuery({ days: 30 })
  const { data: adAnalysis } = api.wechatArticleAnalytics.getAdAnalysis.useQuery()
  const { data: coverAnalysis } = api.wechatArticleAnalytics.getCoverAnalysis.useQuery()
  const { data: timeDistribution } = api.wechatArticleAnalytics.getTimeDistribution.useQuery()
  const { data: topArticles } = api.wechatArticleAnalytics.getTopArticles.useQuery({ limit: 20 })
  const { data: accountStats } = api.wechatArticleAnalytics.getAccountStats.useQuery({ limit: 20 })

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

  // Overview card
  const overviewCard = useMemo((): A2UICardNode => {
    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: "0.5rem",
          children: [
            { type: "text", text: "Overview", variant: "h4" },
            {
              type: "row",
              gap: "1rem",
              wrap: true,
              children: [
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: overview?.totalArticles.toLocaleString() ?? "0", variant: "h2" },
                    { type: "text", text: "Total Articles", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: overview?.totalAccounts.toLocaleString() ?? "0", variant: "h2" },
                    { type: "text", text: "Total Accounts", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: overview?.totalAuthors.toLocaleString() ?? "0", variant: "h2" },
                    { type: "text", text: "Total Authors", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: `${overview?.adRate.toFixed(1) ?? "0"}%`, variant: "h2" },
                    { type: "text", text: "Ad Rate", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
            { type: "divider" },
            {
              type: "row",
              gap: "1rem",
              wrap: true,
              children: [
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: `${overview?.coverRate.toFixed(1) ?? "0"}%`, variant: "h2" },
                    { type: "text", text: "Cover Rate", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: overview?.avgArticlesPerAccount.toFixed(1) ?? "0", variant: "h2" },
                    { type: "text", text: "Avg Articles/Account", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
  }, [overview])

  // Account distribution card
  const accountDistCard = useMemo((): A2UICardNode => {
    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: "0.5rem",
          children: [
            { type: "text", text: "Top Accounts", variant: "h4" },
            {
              type: "column",
              gap: "0.5rem",
              children: (accountDistribution?.slice(0, 10).map((item) => ({
                type: "row" as const,
                justify: "between" as const,
                padding: "0.5rem" as const,
                style: { borderBottom: "1px solid #eee" },
                children: [
                  { type: "text" as const, text: item.accountName, variant: "body" as const },
                  { type: "text" as const, text: `${item.articleCount} (${item.percentage.toFixed(1)}%)`, variant: "caption" as const, color: "muted" as const },
                ],
              })) ?? []) as A2UINode[],
            },
          ],
        },
      ],
    }
  }, [accountDistribution])

  // Author distribution card
  const authorDistCard = useMemo((): A2UICardNode => {
    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: "0.5rem",
          children: [
            { type: "text", text: "Top Authors", variant: "h4" },
            {
              type: "column",
              gap: "0.5rem",
              children: (authorDistribution?.slice(0, 10).map((item) => ({
                type: "row" as const,
                justify: "between" as const,
                padding: "0.5rem" as const,
                style: { borderBottom: "1px solid #eee" },
                children: [
                  { type: "text" as const, text: item.authorName, variant: "body" as const },
                  { type: "text" as const, text: `${item.articleCount} (${item.percentage.toFixed(1)}%)`, variant: "caption" as const, color: "muted" as const },
                ],
              })) ?? []) as A2UINode[],
            },
          ],
        },
      ],
    }
  }, [authorDistribution])

  // Import trend card
  const importTrendCard = useMemo((): A2UICardNode => {
    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: "0.5rem",
          children: [
            { type: "text", text: "Import Trend (30 Days)", variant: "h4" },
            {
              type: "column",
              gap: "0.25rem",
              children: (importTrend?.slice(-7).map((item) => ({
                type: "row" as const,
                justify: "between" as const,
                padding: "0.5rem" as const,
                children: [
                  { type: "text" as const, text: item.date, variant: "body" as const },
                  { type: "text" as const, text: `${item.count} articles`, variant: "caption" as const, color: "muted" as const },
                ],
              })) ?? []) as A2UINode[],
            },
          ],
        },
      ],
    }
  }, [importTrend])

  // Publish trend card
  const publishTrendCard = useMemo((): A2UICardNode => {
    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: "0.5rem",
          children: [
            { type: "text", text: "Publish Trend (30 Days)", variant: "h4" },
            {
              type: "column",
              gap: "0.25rem",
              children: (publishTrend?.slice(-7).map((item) => ({
                type: "row" as const,
                justify: "between" as const,
                padding: "0.5rem" as const,
                children: [
                  { type: "text" as const, text: item.date, variant: "body" as const },
                  { type: "text" as const, text: `${item.count} articles`, variant: "caption" as const, color: "muted" as const },
                ],
              })) ?? []) as A2UINode[],
            },
          ],
        },
      ],
    }
  }, [publishTrend])

  // Ad analysis card
  const adAnalysisCard = useMemo((): A2UICardNode => {
    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: "0.5rem",
          children: [
            { type: "text", text: "Ad Analysis", variant: "h4" },
            {
              type: "row",
              gap: "1rem",
              wrap: true,
              children: [
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: adAnalysis?.totalAds.toLocaleString() ?? "0", variant: "h2" },
                    { type: "text", text: "Total Ads", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: adAnalysis?.totalNonAds.toLocaleString() ?? "0", variant: "h2" },
                    { type: "text", text: "Non-Ads", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: `${adAnalysis?.adRate.toFixed(1) ?? "0"}%`, variant: "h2" },
                    { type: "text", text: "Ad Rate", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
            { type: "divider" },
            { type: "text", text: "Top Ad Accounts", variant: "body" },
            {
              type: "column",
              gap: "0.25rem",
              children: (adAnalysis?.topAdAccounts.slice(0, 5).map((account) => ({
                type: "row" as const,
                justify: "between" as const,
                padding: "0.25rem" as const,
                children: [
                  { type: "text" as const, text: account.accountName, variant: "body" as const },
                  { type: "text" as const, text: `${account.adCount} (${account.adRate.toFixed(1)}%)`, variant: "caption" as const, color: "muted" as const },
                ],
              })) ?? []) as A2UINode[],
            },
          ],
        },
      ],
    }
  }, [adAnalysis])

  // Cover analysis card
  const coverAnalysisCard = useMemo((): A2UICardNode => {
    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: "0.5rem",
          children: [
            { type: "text", text: "Cover Analysis", variant: "h4" },
            {
              type: "row",
              gap: "1rem",
              wrap: true,
              children: [
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: coverAnalysis?.withCover.toLocaleString() ?? "0", variant: "h2" },
                    { type: "text", text: "With Cover", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: coverAnalysis?.withoutCover.toLocaleString() ?? "0", variant: "h2" },
                    { type: "text", text: "Without Cover", variant: "caption", color: "muted" },
                  ],
                },
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "text-center flex-1 min-w-[100px]",
                  children: [
                    { type: "text", text: `${coverAnalysis?.coverRate.toFixed(1) ?? "0"}%`, variant: "h2" },
                    { type: "text", text: "Cover Rate", variant: "caption", color: "muted" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
  }, [coverAnalysis])

  // Time distribution card
  const timeDistCard = useMemo((): A2UICardNode => {
    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: "0.5rem",
          children: [
            { type: "text", text: "Publish Time Distribution (by Hour)", variant: "h4" },
            {
              type: "column",
              gap: "0.25rem",
              children: (timeDistribution?.slice(0, 10).map((item) => ({
                type: "row" as const,
                justify: "between" as const,
                padding: "0.25rem" as const,
                children: [
                  { type: "text" as const, text: `${item.hour}:00`, variant: "body" as const },
                  { type: "text" as const, text: `${item.count} (${item.percentage.toFixed(1)}%)`, variant: "caption" as const, color: "muted" as const },
                ],
              })) ?? []) as A2UINode[],
            },
          ],
        },
      ],
    }
  }, [timeDistribution])

  // Top articles card
  const topArticlesCard = useMemo((): A2UICardNode => {
    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: "0.5rem",
          children: [
            { type: "text", text: "Recent Articles", variant: "h4" },
            {
              type: "column",
              gap: "0.5rem",
              children: topArticles?.slice(0, 10).map((article) => ({
                type: "column" as const,
                gap: "0.25rem" as const,
                padding: "0.5rem" as const,
                style: { borderBottom: "1px solid #eee" },
                children: [
                  { type: "text" as const, text: article.title, variant: "body" as const },
                  {
                    type: "row" as const,
                    gap: "0.5rem" as const,
                    children: [
                      { type: "text" as const, text: article.accountName, variant: "caption" as const, color: "muted" as const },
                      ...(article.isAd ? [{ type: "badge" as const, text: "Ad", color: "destructive" as const }] : []),
                    ],
                  },
                ],
              })) ?? [],
            },
          ],
        },
      ],
    }
  }, [topArticles])

  // Account stats card
  const accountStatsCard = useMemo((): A2UICardNode => {
    return {
      type: "card",
      children: [
        {
          type: "column",
          gap: "0.5rem",
          children: [
            { type: "text", text: "Account Statistics", variant: "h4" },
            {
              type: "column",
              gap: "0.5rem",
              children: accountStats?.slice(0, 10).map((account) => ({
                type: "column" as const,
                gap: "0.25rem" as const,
                padding: "0.5rem" as const,
                style: { borderBottom: "1px solid #eee" },
                children: [
                  { type: "text" as const, text: account.accountName, variant: "body" as const },
                  {
                    type: "row" as const,
                    gap: "1rem" as const,
                    children: [
                      { type: "text" as const, text: `${account.articleCount} articles`, variant: "caption" as const, color: "muted" as const },
                      { type: "text" as const, text: `Ad: ${account.adRate.toFixed(1)}%`, variant: "caption" as const, color: "muted" as const },
                      { type: "text" as const, text: `Cover: ${account.coverRate.toFixed(1)}%`, variant: "caption" as const, color: "muted" as const },
                    ],
                  },
                ],
              })) ?? [],
            },
          ],
        },
      ],
    }
  }, [accountStats])

  if (!mounted) return null

  const appShellNode: A2UIAppShellNode = {
    type: "app-shell",
    brand: t("app.title"),
    logoSrc: "/logo.png",
    logoAlt: "Wonton",
    navItems,
    activePath: pathname,
    children: [
      {
        type: "column",
        gap: "1.5rem",
        children: [
          overviewCard,
          { type: "row", gap: "1rem", children: [accountDistCard, authorDistCard] },
          { type: "row", gap: "1rem", children: [importTrendCard, publishTrendCard] },
          { type: "row", gap: "1rem", children: [adAnalysisCard, coverAnalysisCard] },
          timeDistCard,
          { type: "row", gap: "1rem", children: [topArticlesCard, accountStatsCard] },
        ],
      },
    ],
  }

  return <A2UIRenderer node={appShellNode} onAction={handleAction} />
}
