"use client"

import { useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { DashboardShell } from "@/components/dashboard-shell"
import { A2UIRenderer } from "@/components/a2ui"
import type {
  A2UINode,
} from "@/lib/a2ui"
import { assembleChapterMarkdown, type MediaLike } from "@/lib/markdown"

interface ArticleClientProps {
  id: string
}

export function ArticleClient({ id }: ArticleClientProps) {
  const { t, locale } = useI18n()
  const { status } = useSession()

  const { data: article, isLoading, error } = api.articles.getById.useQuery({ id })
  const { data: chapters, isLoading: chaptersLoading } = api.chapters.getByTaskId.useQuery({ id })

  const assembledMarkdown = useMemo(() => {
    if (chapters && chapters.length > 0) {
      return assembleChapterMarkdown(chapters, { media: article?.wechatMediaInfo as MediaLike | MediaLike[] | null | undefined, mediaStrategy: "latest" })
    }
    return article?.articleMarkdown ?? ""
  }, [chapters, article?.articleMarkdown, article?.wechatMediaInfo])

  const handleAction = useCallback(
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "backToList":
          window.location.href = "/articles"
          break
      }
    },
    []
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
    if (isLoading || chaptersLoading) {
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

    const readingTime = estimateReadingTime(assembledMarkdown)

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
              content: assembledMarkdown,
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

  if (status === "loading") return null

  const contentNode: A2UINode = {
    type: "container",
    className: "px-4",
    children: [buildContent()]
  }

  return (
    <DashboardShell>
      <A2UIRenderer node={contentNode} onAction={handleAction} />
    </DashboardShell>
  )
}
