/**
 * Tabs Node Builder
 */

import type { A2UINode } from "@/lib/a2ui"
import type { I18nKey } from "@/contexts/i18n-context"
import type { MediaDraftItem, ArticleViewerModalProps } from "../types"

interface TabsParams {
  markdown: string
  wechatHtml: string
  normalizedMedia: MediaDraftItem[]
  title?: string
  chapterEdits: NonNullable<ArticleViewerModalProps["chapters"]>
  editorMarkdown: string
  t: (key: I18nKey) => string
}

interface TabDefinition {
  label: string
  content: A2UINode
}

export function buildTabs({
  markdown,
  wechatHtml,
  normalizedMedia,
  title,
  chapterEdits,
  editorMarkdown,
  t,
}: TabsParams): TabDefinition[] {
  const coverCandidates = normalizedMedia
    .filter((item) => item && item.r2_url)
    .sort((a, b) => String(a.uploaded_at || "").localeCompare(String(b.uploaded_at || "")))
  const coverUrl = coverCandidates.slice(-1)[0]?.r2_url

  // Tab label with save status indicator
  const sourceTabLabel = `</> ${t("article.source")}`

  const chapterEditor: A2UINode = {
    type: "markdown-editor",
    id: "markdown-editor",
    value: editorMarkdown,
    preview: "live",
    height: "100%",
    className: "flex-1 min-h-0",
    onChange: { action: "updateMarkdown" },
  }

  // WeChat preview content - use dangerouslySetInnerHTML via html node
  const wechatPreviewChildren: A2UINode[] = []

  // Add cover image
  if (coverUrl) {
    wechatPreviewChildren.push({
      type: "container",
      className: "mb-6 rounded-lg overflow-hidden",
      children: [
        {
          type: "image",
          src: coverUrl,
          alt: title ?? "Cover",
          className: "w-full max-h-[300px] object-cover",
        },
      ],
    } as A2UINode)
  }

  // Add WeChat HTML preview
  wechatPreviewChildren.push({
    type: "html",
    content: wechatHtml,
    className: "prose prose-neutral dark:prose-invert max-w-none",
  } as A2UINode)

  return [
    {
      label: `📖 ${t("article.preview")}`,
      content: {
        type: "column",
        gap: "0",
        children: wechatPreviewChildren,
      } as A2UINode,
    },
    {
      label: sourceTabLabel,
      content: {
        type: "column",
        gap: "0.75rem",
        className: "flex-1 min-h-0",
        children: [chapterEdits.length > 0 ? chapterEditor : {
          type: "markdown-editor",
          id: "markdown-editor",
          value: markdown,
          preview: "live",
          height: "100%",
          className: "flex-1 min-h-0",
          onChange: { action: "updateMarkdown" },
        } as A2UINode],
      } as A2UINode,
    },
  ]
}

export function buildTabSection(tabs: TabDefinition[], activeTab: number): A2UINode {
  return {
    type: "container",
    className: "px-4 shrink-0 border-b border-[var(--ds-border)]",
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
            className: `flex-1 rounded-none -mb-px ${isActive ? "border-b-2 border-b-[var(--ds-primary)] text-[var(--ds-foreground)]" : "border-b-2 border-b-transparent text-[var(--ds-muted-foreground)]"}`,
            onClick: { action: "tab", args: [index] },
          }
        }),
      },
    ],
  }
}

export function buildContentSection(tabs: TabDefinition[], activeTab: number): A2UINode {
  const isSourceTab = activeTab === 1

  return isSourceTab
    ? {
        type: "container",
        className: "flex-1 min-h-0 flex flex-col p-4",
        children: [tabs[activeTab]?.content ?? { type: "text", text: "" }],
      }
    : {
        type: "scroll-area",
        className: "flex-1 min-h-0",
        children: [
          {
            type: "container",
            className: "p-4",
            children: [tabs[activeTab]?.content ?? { type: "text", text: "" }],
          },
        ],
      }
}
