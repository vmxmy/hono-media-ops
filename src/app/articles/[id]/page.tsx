"use client"

import { use, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer } from "@/components/a2ui"
import type { 
  A2UIAppShellNode, 
  A2UIColumnNode, 
  A2UINode, 
  A2UIRowNode 
} from "@/lib/a2ui"
import { buildNavItems } from "@/lib/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default function ArticleDetailPage({ params }: Props) {
  const { id } = use(params)
  const { t, locale } = useI18n()
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const mounted = status !== "loading"
  const logout = () => signOut({ callbackUrl: "/" })
  const navItems = buildNavItems(t)

  const { data: article, isLoading, error } = api.articles.getById.useQuery({ id })

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
        case "backToList":
          router.push("/articles")
          break
      }
    },
    [router, logout]
  )

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const estimateReadingTime = (markdown: string | null): number => {
    if (!markdown) return 0
    const charCount = markdown.replace(/\s/g, "").length
    return Math.ceil(charCount / 400)
  }

  // Build content
  const buildContent = (): A2UINode => {
    if (isLoading) {
      return {
        type: "container",
        style: { padding: "4rem", textAlign: "center" },
        children: [{ type: "text", text: t("articles.loadingArticle"), color: "muted" }]
      }
    }

    if (error) {
      return {
        type: "column",
        gap: "1rem",
        style: { padding: "2rem", alignItems: "center" },
        children: [
          { type: "alert", message: t("articles.loadError", { error: error.message }), variant: "error" },
          { type: "button", text: t("articles.backToList"), variant: "secondary", onClick: { action: "backToList" } },
        ],
      }
    }

    if (!article) {
      return {
        type: "column",
        gap: "1rem",
        style: { padding: "4rem", alignItems: "center", textAlign: "center" },
        children: [
          { type: "text", text: t("articles.articleNotFound"), color: "muted" },
          { type: "button", text: t("articles.backToList"), variant: "secondary", onClick: { action: "backToList" } },
        ],
      }
    }

    const readingTime = estimateReadingTime(article.articleMarkdown)

    return {
      type: "column",
      gap: "0", // Gap handled by internal padding/margins
      style: { maxWidth: "800px", margin: "0 auto", width: "100%", backgroundColor: "var(--background)" },
      children: [
        // Top Navigation
        {
          type: "row",
          style: { padding: "1rem 0" },
          children: [
            {
              type: "button",
              text: t("articles.backToList"),
              variant: "text",
              onClick: { action: "backToList" },
              style: { color: "var(--muted-foreground)" }
            }
          ],
        },
        
        // Article Header
        {
          type: "column",
          gap: "1.5rem",
          style: { padding: "2rem 0", borderBottom: "1px solid var(--border)" },
          children: [
            // Cover Image
            ...(article.coverUrl ? [{
              type: "image" as const,
              src: article.coverUrl,
              alt: article.topic,
              style: { width: "100%", borderRadius: "0.5rem", maxHeight: "400px", objectFit: "cover" as const }
            }] : []),
            // Title
            { type: "text", text: article.topic, variant: "h1", weight: "bold", style: { fontSize: "2.5rem", lineHeight: "1.2" } },
            // Meta
            {
              type: "row",
              gap: "1rem",
              wrap: true,
              align: "center",
              children: [
                { type: "text" as const, text: formatDate(article.createdAt), variant: "caption" as const, color: "muted" as const },
                { type: "text" as const, text: "·", color: "muted" as const },
                { type: "text" as const, text: t("articles.aboutMinutes", { minutes: readingTime }), variant: "caption" as const, color: "muted" as const },
                ...(article.keywords ? [
                  { type: "text" as const, text: "·", color: "muted" as const },
                  { type: "badge" as const, text: article.keywords, color: "default" as const }
                ] : []),
              ],
            },
          ],
        },

        // Article Body (Markdown)
        {
          type: "container",
          style: { padding: "2rem 0" },
          children: [
            { 
              type: "markdown", 
              content: article.articleMarkdown ?? "",
              style: { fontSize: "1.125rem", lineHeight: "1.8" }
            }
          ],
        },

        // Footer Navigation
        {
          type: "container",
          style: { padding: "2rem 0", borderTop: "1px solid var(--border)", marginTop: "2rem" },
          children: [
            {
              type: "button",
              text: t("articles.backToList"),
              variant: "text",
              onClick: { action: "backToList" },
              style: { color: "var(--muted-foreground)" }
            }
          ],
        },
      ],
    }
  }

  if (!mounted) return null

  const appShellNode: A2UIAppShellNode = {
    type: "app-shell",
    brand: t("app.title"),
    logoSrc: "/logo.png",
    logoAlt: "Wonton",
    navItems: navItems,
    activePath: "/articles", // Keep active context
    onNavigate: { action: "navigate" },
    onLogout: { action: "logout" },
    logoutLabel: status === "authenticated" ? t("auth.logout") : t("articles.loginBackend"),
    headerActions: [{ type: "theme-switcher" }],
    children: [
      {
        type: "container",
        style: { padding: "0 1rem" },
        children: [buildContent()]
      }
    ],
  }

  return <A2UIRenderer node={appShellNode} onAction={handleAction} />
}