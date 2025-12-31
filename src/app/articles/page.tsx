"use client"

import { useState, useCallback, useMemo } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer } from "@/components/a2ui"
import type { 
  A2UIAppShellNode, 
  A2UIColumnNode, 
  A2UINode 
} from "@/lib/a2ui"
import { buildNavItems } from "@/lib/navigation"
import { buildStandardCardNode } from "@/lib/a2ui/article-card"

export default function ArticlesPage() {
  const { t, locale } = useI18n()
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const mounted = status !== "loading"
  const logout = () => signOut({ callbackUrl: "/" })
  const navItems = buildNavItems(t)

  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const pageSize = 12 // Increased for grid layout

  // Simple debounce for search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setDebouncedSearch(value)
    setPage(1)
  }

  const { data, isLoading, error } = api.articles.getPublished.useQuery({
    page,
    pageSize,
    search: debouncedSearch || undefined,
  }, { enabled: mounted })

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
        case "viewArticle":
          router.push(`/articles/${args?.[0]}`)
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
        case "clearSearch":
          handleSearchChange("")
          break
      }
    },
    [router, logout, data, page, pageSize]
  )

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatReadingTime = (minutes: number) => {
    if (minutes <= 0) return t("articles.lessThanOneMinute")
    return t("articles.readingTime", { minutes })
  }

  const formatWordCount = (count?: number) => {
    if (!count || count <= 0) return t("articles.unknownWordCount")
    return t("articles.wordCount", { count: count.toLocaleString(locale) })
  }

  const formatPrimaryType = (value: string | null) => {
    if (!value) return null
    return value.replace(/_/g, " ").toUpperCase()
  }

  // Build header section
  const headerNode: A2UINode = {
    type: "column",
    gap: "1.5rem",
    style: { textAlign: "center", padding: "2rem 0" },
    children: [
      { type: "text", text: t("articles.title"), variant: "h1", weight: "bold" },
      { type: "text", text: t("articles.subtitle"), variant: "body", color: "muted" },
      // Search Bar
      {
        type: "row",
        justify: "center",
        children: [
          {
            type: "input",
            id: "search-articles",
            value: searchQuery,
            placeholder: t("articles.searchPlaceholder"),
            inputType: "text",
            style: { maxWidth: "500px", width: "100%" },
            onChange: { action: "setSearch" },
          },
        ],
      },
    ],
  }

  // Build article grid
  const buildArticleGrid = (): A2UINode => {
    if (isLoading) {
      const loadingCards: A2UINode[] = Array.from({ length: 3 }, (_, index) => ({
        type: "card",
        id: `article-loading-${index}`,
        hoverable: false,
        style: { padding: 0, overflow: "hidden" },
        children: [
          {
            type: "container",
            style: { height: "160px", backgroundColor: "var(--muted)" },
          },
          {
            type: "column",
            gap: "0.75rem",
            style: { padding: "1.25rem" },
            children: [
              { type: "container", style: { height: "18px", width: "70%", backgroundColor: "var(--muted)", borderRadius: "6px" } },
              { type: "container", style: { height: "12px", width: "90%", backgroundColor: "var(--muted)", borderRadius: "6px" } },
              { type: "container", style: { height: "12px", width: "80%", backgroundColor: "var(--muted)", borderRadius: "6px" } },
              { type: "container", style: { height: "12px", width: "55%", backgroundColor: "var(--muted)", borderRadius: "6px" } },
            ],
          },
        ],
      }))

      return { 
        type: "container",
        style: { display: "flex", flexDirection: "column", gap: "2rem" },
        children: loadingCards,
      }
    }

    if (error) {
      return {
        type: "alert",
        message: t("articles.loadError", { error: error.message }),
        variant: "error"
      }
    }

    const articles = data?.items ?? []

    if (articles.length === 0) {
      const hasSearch = searchQuery.trim().length > 0
      return {
        type: "card" as const,
        style: { padding: "3rem", textAlign: "center" as const },
        children: [
          {
            type: "column" as const,
            gap: "1rem",
            style: { alignItems: "center" },
            children: [
              { type: "text" as const, text: "📰", style: { fontSize: "3rem" } },
              { type: "text" as const, text: hasSearch ? t("articles.noSearchResults") : t("articles.noArticles"), variant: "h3" as const },
              { type: "text" as const, text: hasSearch ? t("articles.tryDifferentKeywords") : t("articles.moreContentComing"), color: "muted" as const },
              ...(hasSearch ? [{
                type: "button" as const,
                text: t("articles.clearSearch"),
                variant: "secondary" as const,
                onClick: { action: "clearSearch" },
              }] : []),
            ],
          },
        ],
      }
    }

    const articleCards: A2UINode[] = articles.map((article): A2UINode => {
      const coverNode: A2UINode = article.coverUrl
        ? {
            type: "image" as const,
            src: article.coverUrl,
            alt: article.topic,
            style: { width: "100%", height: "160px", objectFit: "cover" as const },
          }
        : {
            type: "container" as const,
            style: { width: "100%", height: "160px", backgroundColor: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" },
            children: [{ type: "text" as const, text: t("articles.noCover"), color: "muted" as const }],
          }

      const headerNodes: A2UINode[] = [
        { type: "text" as const, text: article.topic, variant: "h4" as const, weight: "semibold" as const },
        {
          type: "row" as const,
          align: "center" as const,
          gap: "0.5rem" as const,
          children: [
            { type: "text" as const, text: article.authorName, variant: "caption" as const, color: "muted" as const },
            { type: "text" as const, text: "·", variant: "caption" as const, color: "muted" as const },
            { type: "text" as const, text: formatReadingTime(article.readingTimeMinutes), variant: "caption" as const, color: "muted" as const },
            { type: "text" as const, text: "·", variant: "caption" as const, color: "muted" as const },
            { type: "text" as const, text: formatWordCount(article.articleWordCount), variant: "caption" as const, color: "muted" as const },
          ],
        },
      ]

      const bodyNodes: A2UINode[] = [
        {
          type: "text" as const,
          text: article.excerpt ?? "",
          variant: "body" as const,
          color: "muted" as const,
          style: {
            fontSize: "0.875rem",
            lineHeight: "1.5",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden"
          }
        },
      ]

      const footerNodes: A2UINode[] = [
        {
          type: "row" as const,
          justify: "between" as const,
          align: "center" as const,
          children: [
            {
              type: "row" as const,
              align: "center" as const,
              gap: "0.5rem" as const,
              children: [
                { type: "text" as const, text: formatDate(article.createdAt), variant: "caption" as const, color: "muted" as const },
                    ...(article.styleName
                      ? [{
                          type: "badge" as const,
                          text: article.styleName,
                          color: "default" as const,
                          style: { maxWidth: "10rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
                        }]
                      : []),
                    ...(formatPrimaryType(article.primaryType)
                      ? [{
                          type: "badge" as const,
                          text: formatPrimaryType(article.primaryType) ?? "",
                          color: "default" as const,
                          style: { maxWidth: "6rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
                        }]
                      : []),
              ],
            },
            {
              type: "button" as const,
              text: t("articles.readMore"),
              variant: "text" as const,
              size: "sm" as const,
              onClick: { action: "viewArticle", args: [article.id], stopPropagation: true },
            },
          ],
        },
      ]

      return buildStandardCardNode({
        id: `article-${article.id}`,
        hoverable: true,
        onClick: { action: "viewArticle", args: [article.id] },
        cover: coverNode,
        header: headerNodes,
        body: bodyNodes,
        footer: footerNodes,
        cardStyle: { height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 },
      })
    })

    return {
      type: "container",
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
        maxWidth: "800px",
        margin: "0 auto",
        width: "100%",
      },
      children: articleCards,
    }
  }

  // Build pagination
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)
  
  const paginationNode: A2UINode | null = totalPages > 1 ? {
    type: "row",
    justify: "center",
    align: "center",
    gap: "1rem",
    style: { marginTop: "2rem" },
    children: [
      {
        type: "button",
        text: t("articles.prevPage"),
        variant: "secondary",
        disabled: page === 1,
        onClick: { action: "prevPage" }
      },
      { type: "text", text: `${page} / ${totalPages}`, variant: "body", color: "muted" },
      {
        type: "button",
        text: t("articles.nextPage"),
        variant: "secondary",
        disabled: page === totalPages,
        onClick: { action: "nextPage" }
      },
    ],
  } : null

  // Main page content
  const pageContent: A2UIColumnNode = {
    type: "column",
    gap: "1rem",
    children: [
      headerNode,
      buildArticleGrid(),
      ...(paginationNode ? [paginationNode] : []),
    ],
  }

  if (!mounted) return null

  const appShellNode: A2UIAppShellNode = {
    type: "app-shell",
    brand: t("app.title"),
    logoSrc: "/logo.png",
    logoAlt: "Wonton",
    navItems: navItems, // Show nav items even for public users, or customize if needed
    activePath: pathname,
    onNavigate: { action: "navigate" },
    onLogout: { action: "logout" },
    logoutLabel: status === "authenticated" ? t("auth.logout") : t("articles.loginBackend"),
    headerActions: [{ type: "theme-switcher" }],
    children: [
      {
        type: "container",
        style: { maxWidth: "1200px", margin: "0 auto", width: "100%" },
        children: [pageContent]
      }
    ],
  }

  return <A2UIRenderer node={appShellNode} onAction={handleAction} />
}
