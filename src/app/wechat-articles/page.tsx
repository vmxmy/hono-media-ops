"use client"

import { useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { DashboardShell } from "@/components/dashboard-shell"
import { A2UIRenderer } from "@/components/a2ui"
import type {
  A2UIColumnNode,
  A2UINode
} from "@/lib/a2ui"

export default function WechatArticlesPage() {
  const { t, locale } = useI18n()
  const { status } = useSession()

  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const pageSize = 20

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setDebouncedSearch(value)
    setPage(1)
  }

  const { data, isLoading, error } = api.wechatArticles.getAll.useQuery({
    page,
    pageSize,
    search: debouncedSearch || undefined,
  }, {
    enabled: status !== "loading",
  })

  const handleAction = useCallback(
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "viewOriginal":
          window.open(args?.[0] as string, "_blank")
          break
        case "prevPage":
          setPage((p) => Math.max(1, p - 1))
          break
        case "nextPage":
          if (data && page < Math.ceil(data.total / pageSize)) {
            setPage((p) => p + 1)
          }
          break
        case "setSearch":
          handleSearchChange(args?.[0] as string)
          break
      }
    },
    [data, page, pageSize]
  )

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "-"
    return new Date(timestamp * 1000).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const buildArticleList = (): A2UINode => {
    if (isLoading) {
      return { type: "text", text: t("common.loading"), color: "muted" }
    }

    if (error) {
      return { type: "text", text: error.message, color: "destructive" }
    }

    const articles = data?.items ?? []

    if (articles.length === 0) {
      return { type: "text", text: t("wechatArticles.noArticles"), color: "muted" }
    }

    const articleNodes: A2UINode[] = articles.map((article) => ({
      type: "card",
      id: `wechat-article-${article.id}`,
      className: "mb-4 p-4",
      children: [
        {
          type: "column",
          gap: "0.5rem",
          className: "overflow-hidden",
          children: [
            {
              type: "text",
              text: article.title,
              variant: "h4",
              weight: "bold",
              className: "truncate"
            },
            {
              type: "text",
              text: article.digest || "",
              variant: "body",
              color: "muted",
              className: "line-clamp-2 text-sm"
            },
            {
              type: "row",
              justify: "between",
              align: "center",
              children: [
                {
                  type: "column",
                  gap: "0.25rem",
                  children: [
                    {
                      type: "row",
                      gap: "1rem",
                      children: [
                        {
                          type: "text",
                          text: `${t("wechatArticles.author")}: ${article.authorName || "-"}`,
                          variant: "caption",
                          color: "muted"
                        },
                        {
                          type: "text",
                          text: `${t("wechatArticles.publishTime")}: ${formatDate(article.createTime)}`,
                          variant: "caption",
                          color: "muted"
                        }
                      ]
                    },
                    {
                      type: "row",
                      gap: "1rem",
                      children: [
                        {
                          type: "text",
                          text: `${t("wechatArticles.accountName")}: ${article.accountName || "-"}`,
                          variant: "caption",
                          color: "muted"
                        },
                        {
                          type: "text",
                          text: `${t("wechatArticles.fakeid")}: ${article.fakeid || "-"}`,
                          variant: "caption",
                          color: "muted"
                        }
                      ]
                    }
                  ]
                },
                {
                  type: "button",
                  text: t("wechatArticles.viewOriginal"),
                  variant: "outline",
                  size: "sm",
                  onClick: { action: "viewOriginal", args: [article.link] }
                }
              ]
            }
          ]
        }
      ]
    }))

    return {
      type: "column",
      gap: "1rem",
      children: articleNodes
    }
  }

  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  const paginationNode: A2UINode | null = totalPages > 1 ? {
    type: "row",
    justify: "center",
    align: "center",
    gap: "1rem",
    className: "mt-8",
    children: [
      {
        type: "button",
        text: t("wechatArticles.prevPage"),
        variant: "secondary",
        disabled: page === 1,
        onClick: { action: "prevPage" }
      },
      { type: "text", text: `${page} / ${totalPages}`, variant: "body", color: "muted" },
      {
        type: "button",
        text: t("wechatArticles.nextPage"),
        variant: "secondary",
        disabled: page === totalPages,
        onClick: { action: "nextPage" }
      },
    ],
  } : null

  const pageContent: A2UIColumnNode = {
    type: "column",
    gap: "2rem",
    className: "p-8",
    children: [
      {
        type: "column",
        gap: "0.5rem",
        children: [
          { type: "text", text: t("wechatArticles.title"), variant: "h1", weight: "bold" },
          { type: "text", text: t("wechatArticles.subtitle"), variant: "body", color: "muted" },
        ]
      },
      {
        type: "input",
        id: "search",
        name: "search",
        value: searchQuery,
        placeholder: t("wechatArticles.searchPlaceholder"),
        onChange: { action: "setSearch" }
      },
      buildArticleList(),
      ...(paginationNode ? [paginationNode] : [])
    ]
  }

  if (status === "loading") return null

  return (
    <DashboardShell>
      <A2UIRenderer node={pageContent} onAction={handleAction} />
    </DashboardShell>
  )
}
