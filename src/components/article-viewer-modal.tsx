"use client"

import { useCallback, useMemo, useState } from "react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UINode } from "@/lib/a2ui"
import type { WechatMediaInfo } from "@/server/db/schema"

interface ArticleViewerModalProps {
  isOpen: boolean
  onClose: () => void
  markdown: string
  title?: string
  wechatMediaInfo?: WechatMediaInfo | null
}

export function ArticleViewerModal({
  isOpen,
  onClose,
  markdown,
  title,
  wechatMediaInfo,
}: ArticleViewerModalProps) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const [mediaIdCopied, setMediaIdCopied] = useState(false)
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
        case "copyMediaId":
          if (wechatMediaInfo?.media_id) {
            navigator.clipboard.writeText(wechatMediaInfo.media_id).then(() => {
              setMediaIdCopied(true)
              setTimeout(() => setMediaIdCopied(false), 2000)
            })
          }
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
    [markdown, onClose, wechatMediaInfo]
  )

  const tabs = useMemo(() => {
    return [
      {
        label: `📖 ${t("article.preview")}`,
        content: { type: "markdown", content: markdown } as A2UINode,
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
        } as A2UINode,
      },
    ]
  }, [markdown, t])

  // 第一段：标题栏
  const titleSection: A2UINode = {
    type: "container",
    style: {
      padding: "1rem",
      flexShrink: 0,
      borderBottom: "1px solid var(--ds-border)",
    },
    children: [
      {
        type: "row",
        justify: "between",
        align: "center",
        gap: "0.5rem",
        children: [
          { type: "text", text: title ?? t("article.viewArticle"), variant: "h3", weight: "semibold" },
          {
            type: "row",
            gap: "0.5rem",
            children: [
              {
                type: "button",
                text: copied ? t("article.copied") : t("article.copyMarkdown"),
                variant: "secondary",
                size: "sm",
                onClick: { action: "copy" },
              },
              { type: "button", text: t("common.close"), variant: "ghost", size: "sm", onClick: { action: "close" } },
            ],
          },
        ],
      },
    ],
  }

  // 微信素材信息栏（条件渲染）
  const wechatInfoSection: A2UINode | null = wechatMediaInfo
    ? {
        type: "container",
        style: {
          padding: "0.5rem 1rem",
          flexShrink: 0,
          borderBottom: "1px solid var(--ds-border)",
          backgroundColor: "var(--ds-accent)",
        },
        children: [
          {
            type: "row",
            align: "center",
            gap: "0.75rem",
            wrap: true,
            children: [
              { type: "badge", text: "✅ 微信已上传", color: "success" },
              {
                type: "link",
                text: "📷 查看素材",
                href: wechatMediaInfo.url,
                variant: "primary",
              },
              {
                type: "button",
                text: mediaIdCopied ? "已复制" : "复制 media_id",
                variant: "ghost",
                size: "sm",
                onClick: { action: "copyMediaId" },
              },
              ...(wechatMediaInfo.uploaded_at
                ? [
                    {
                      type: "text" as const,
                      text: `上传于 ${new Date(wechatMediaInfo.uploaded_at).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}`,
                      variant: "caption" as const,
                      color: "muted" as const,
                    },
                  ]
                : []),
            ],
          },
        ],
      }
    : null

  // 第二段：Tab 栏
  const tabSection: A2UINode = {
    type: "container",
    style: {
      padding: "0 1rem",
      flexShrink: 0,
      borderBottom: "1px solid var(--ds-border)",
    },
    children: [
      {
        type: "row",
        align: "stretch",
        gap: "0",
        children: tabs.map((tab, index) => {
          const isActive = index === activeTab
          return {
            type: "button",
            text: tab.label,
            variant: "ghost",
            size: "sm",
            style: {
              flex: 1,
              borderRadius: 0,
              borderBottom: isActive ? "2px solid var(--ds-primary)" : "2px solid transparent",
              color: isActive ? "var(--ds-foreground)" : "var(--ds-muted-foreground)",
              marginBottom: "-1px",
            },
            onClick: { action: "tab", args: [index] },
          }
        }),
      },
    ],
  }

  // 第三段：内容区（带滚动条）
  const contentSection: A2UINode = {
    type: "scroll-area",
    style: {
      flex: 1,
      minHeight: 0,
    },
    children: [
      {
        type: "container",
        style: {
          padding: "1rem",
        },
        children: [tabs[activeTab]?.content ?? { type: "text", text: "" }],
      },
    ],
  }

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
    children: [titleSection, ...(wechatInfoSection ? [wechatInfoSection] : []), tabSection, contentSection],
  }

  if (!isOpen) return null

  return <A2UIRenderer node={panelNode} onAction={handleAction} />
}
