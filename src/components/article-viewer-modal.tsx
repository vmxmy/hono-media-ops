"use client"

import { useCallback, useMemo, useState } from "react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UINode, A2UIModalNode } from "@/lib/a2ui"

interface ArticleViewerModalProps {
  isOpen: boolean
  onClose: () => void
  markdown: string
  title?: string
}

export function ArticleViewerModal({
  isOpen,
  onClose,
  markdown,
  title,
}: ArticleViewerModalProps) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  const handleAction = useCallback(
    (action: string) => {
      switch (action) {
        case "copy":
          navigator.clipboard.writeText(markdown).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          })
          break
        case "close":
          onClose()
          break
      }
    },
    [markdown, onClose]
  )

  const tabNode = useMemo<A2UINode>(() => {
    return {
      type: "tabs",
      tabs: [
        {
          label: `📖 ${t("article.preview")}`,
          content: { type: "markdown", content: markdown },
        },
        {
          label: `</> ${t("article.source")}`,
          content: {
            type: "container",
            style: {
              backgroundColor: "var(--ds-muted)",
              borderRadius: "0.5rem",
              padding: "1rem",
              fontFamily: "var(--ds-font-mono)",
              fontSize: "0.875rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            },
            children: [{ type: "text", text: markdown }],
          },
        },
      ],
    }
  }, [markdown, t])

  const modalNode: A2UIModalNode = {
    type: "modal",
    open: isOpen,
    title: title ?? t("article.viewArticle"),
    onClose: { action: "close" },
    style: { maxWidth: "64rem" },
    children: [
      {
        type: "column",
        gap: "1rem",
        children: [
          tabNode,
          {
            type: "row",
            justify: "end",
            gap: "0.5rem",
            children: [
              {
                type: "button",
                text: copied ? t("article.copied") : t("article.copyMarkdown"),
                variant: "primary",
                onClick: { action: "copy" },
              },
              {
                type: "button",
                text: t("common.close"),
                variant: "secondary",
                onClick: { action: "close" },
              },
            ],
          },
        ],
      },
    ],
  }

  if (!isOpen) return null

  return <A2UIRenderer node={modalNode} onAction={handleAction} />
}
