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
  const logout = () => signOut({ callbackUrl: "/login" })
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
        className: "p-16 text-center",
        children: [{ type: "text", text: t("articles.loadingArticle"), color: "muted" }]
      }
    }

    if (error) {
      return {
        type: "column",
        gap: "1rem",
        className: "p-8 items-center",
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
        className: "p-16 items-center text-center",
        children: [
          { type: "text", text: t("articles.articleNotFound"), color: "muted" },
          { type: "button", text: t("articles.backToList"), variant: "secondary", onClick: { action: "backToList" } },
        ],
      }
    }

    const readingTime = estimateReadingTime(article.articleMarkdown)

    const displayTitle = article.articleTitle || article.topic;

    return {
      type: "column",
      gap: "0", // Gap handled by internal padding/margins
      className: "max-w-3xl mx-auto w-full bg-background",
      children: [
        // Top Navigation
        {
          type: "row",
          className: "py-4",
          children: [
            {
              type: "button",
              text: t("articles.backToList"),
              variant: "text",
              onClick: { action: "backToList" },
              className: "text-muted-foreground"
            }
          ],
        },
        
        // Article Header
        {
          type: "column",
          gap: "1.5rem",
          className: "py-8 border-b border-border",
          children: [
            // Cover Image
            ...(article.coverUrl ? [{
              type: "image" as const,
              src: article.coverUrl,
              alt: displayTitle,
              className: "w-full rounded-lg max-h-96 object-cover"
            }] : []),
            // Title
            {
              type: "text",
              text: displayTitle,
              variant: "h1",
              weight: "bold",
              className: "text-4xl leading-tight"
            },
            // Subtitle
            ...(article.articleSubtitle ? [{
              type: "text" as const,
              text: article.articleSubtitle,
              variant: "h4" as const,
              color: "muted" as const,
              className: "text-2xl font-normal -mt-2"
            }] : []),
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
              ],
            },
          ],
        },

        // Article Body (Markdown)
        {
          type: "container",
          className: "py-8",
          children: [
            {
              type: "markdown",
              content: article.articleMarkdown ?? "",
              className: "text-lg leading-relaxed"
            }
          ],
        },

        // Footer Navigation
        {
          type: "container",
          className: "py-8 border-t border-border mt-8",
          children: [
            {
              type: "button",
              text: t("articles.backToList"),
              variant: "text",
              onClick: { action: "backToList" },
              className: "text-muted-foreground"
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
        className: "px-4",
        children: [buildContent()]
      }
    ],
  }

  return <A2UIRenderer node={appShellNode} onAction={handleAction} />
}