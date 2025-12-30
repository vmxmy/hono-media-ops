"use client"

import { useCallback, useMemo, useState } from "react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UINode } from "@/lib/a2ui"

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
  const [activeTab, setActiveTab] = useState(0)

  const handleAction = useCallback(
    (action: string, args?: unknown[]) => {
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
        case "tab": {
          const nextIndex = typeof args?.[0] === "number" ? (args[0] as number) : 0
          setActiveTab(nextIndex)
          break
        }
      }
    },
    [markdown, onClose]
  )

  const tabs = useMemo(() => {
    return [
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
    ]
  }, [markdown, t])

  const tabHeaderNode = useMemo<A2UINode>(() => {
    return {
      type: "row",
      align: "stretch",
      gap: "0.25rem",
      style: {
        borderBottom: "1px solid var(--ds-border)",
        paddingBottom: "0.25rem",
      },
      children: tabs.map((tab, index) => {
        const isActive = index === activeTab
        return {
          type: "button",
          text: tab.label,
          variant: "ghost",
          size: "sm",
          fullWidth: true,
          style: {
            flex: 1,
            borderRadius: 0,
            borderBottom: isActive ? "2px solid var(--ds-primary)" : "2px solid transparent",
            color: isActive ? "var(--ds-foreground)" : "var(--ds-muted-foreground)",
          },
          onClick: { action: "tab", args: [index] },
        }
      }),
    }
  }, [activeTab, tabs])

  const panelNode: A2UINode = {
    type: "card",
    hoverable: false,
    style: {
      flex: 1,
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
      padding: "0",
      overflow: "hidden",
    },
    children: [
      // Fixed header section
      {
        type: "container",
        style: {
          padding: "1rem 1rem 0 1rem",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        },
        children: [
          {
            type: "row",
            justify: "between",
            align: "center",
            gap: "0.5rem",
            children: [
              { type: "text", text: title ?? t("article.viewArticle"), variant: "h3", weight: "semibold" },
              { type: "button", text: t("common.close"), variant: "secondary", size: "sm", onClick: { action: "close" } },
            ],
          },
          tabHeaderNode,
        ],
      },
      // Scrollable content area
      {
        type: "container",
        style: {
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "1rem",
        },
        children: [(tabs[activeTab]?.content ?? { type: "text", text: "" }) as A2UINode],
      },
      // Fixed footer section
      {
        type: "container",
        style: {
          padding: "0.75rem 1rem",
          borderTop: "1px solid var(--ds-border)",
          flexShrink: 0,
        },
        children: [
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
            ],
          },
        ],
      },
    ],
  }

  if (!isOpen) return null

  return <A2UIRenderer node={panelNode} onAction={handleAction} />
}
