"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UINode } from "@/lib/a2ui"
import type { ExecutionResult } from "@/server/db/schema"

interface ArticleViewerModalProps {
  isOpen: boolean
  onClose: () => void
  markdown: string
  title?: string
  executionId?: string
  executionResult?: ExecutionResult | null
  onUpdateResult?: (result: ExecutionResult) => void
  onUpdateMarkdown?: (markdown: string) => void
}

export function ArticleViewerModal({
  isOpen,
  onClose,
  markdown,
  title,
  executionId,
  executionResult,
  onUpdateResult,
  onUpdateMarkdown,
}: ArticleViewerModalProps) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const [mediaIdCopied, setMediaIdCopied] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editCoverUrl, setEditCoverUrl] = useState(executionResult?.coverUrl ?? "")
  const [editMediaId, setEditMediaId] = useState(executionResult?.wechatMediaId ?? "")
  const [editMarkdown, setEditMarkdown] = useState(markdown)

  // Sync editMarkdown when markdown prop changes
  useEffect(() => {
    setEditMarkdown(markdown)
  }, [markdown])

  const handleAction = useCallback(
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "copy":
          navigator.clipboard.writeText(editMarkdown).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          })
          break
        case "copyMediaId":
          if (executionResult?.wechatMediaId) {
            navigator.clipboard.writeText(executionResult.wechatMediaId).then(() => {
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
        case "toggleEdit":
          if (isEditing) {
            // Cancel editing, reset values
            setEditCoverUrl(executionResult?.coverUrl ?? "")
            setEditMediaId(executionResult?.wechatMediaId ?? "")
          }
          setIsEditing(!isEditing)
          break
        case "saveResult":
          if (onUpdateResult) {
            onUpdateResult({
              ...executionResult,
              coverUrl: editCoverUrl || undefined,
              wechatMediaId: editMediaId || undefined,
            })
          }
          setIsEditing(false)
          break
        case "updateCoverUrl":
          setEditCoverUrl(args?.[0] as string ?? "")
          break
        case "updateMediaId":
          setEditMediaId(args?.[0] as string ?? "")
          break
        case "updateMarkdown":
          setEditMarkdown(args?.[0] as string ?? "")
          break
        case "saveMarkdown":
          if (onUpdateMarkdown) {
            onUpdateMarkdown(editMarkdown)
          }
          break
      }
    },
    [onClose, executionResult, isEditing, editCoverUrl, editMediaId, onUpdateResult, editMarkdown, onUpdateMarkdown]
  )

  const tabs = useMemo(() => {
    const coverUrl = executionResult?.coverUrl
    const previewChildren: A2UINode[] = []

    // 添加封面图
    if (coverUrl) {
      previewChildren.push({
        type: "container",
        style: {
          marginBottom: "1.5rem",
          borderRadius: "0.5rem",
          overflow: "hidden",
        },
        children: [
          {
            type: "image",
            src: coverUrl,
            alt: title ?? "Cover",
            style: {
              width: "100%",
              maxHeight: "300px",
              objectFit: "cover",
            },
          },
        ],
      } as A2UINode)
    }

    // 添加 markdown 内容 (使用编辑后的内容)
    previewChildren.push({ type: "markdown", content: editMarkdown } as A2UINode)

    // 判断内容是否有修改
    const hasChanges = editMarkdown !== markdown

    return [
      {
        label: `📖 ${t("article.preview")}`,
        content: {
          type: "column",
          gap: "0",
          children: previewChildren,
        } as A2UINode,
      },
      {
        label: `</> ${t("article.source")}${hasChanges ? " *" : ""}`,
        content: {
          type: "column",
          gap: "0.75rem",
          children: [
            {
              type: "textarea",
              id: "markdown-editor",
              value: editMarkdown,
              rows: 20,
              style: {
                fontFamily: "var(--ds-font-mono)",
                fontSize: "0.875rem",
                lineHeight: "1.5",
              },
              onChange: { action: "updateMarkdown" },
            } as A2UINode,
            ...(onUpdateMarkdown ? [{
              type: "row",
              justify: "end",
              gap: "0.5rem",
              children: [
                {
                  type: "button",
                  text: t("common.save"),
                  variant: "primary",
                  size: "sm",
                  disabled: !hasChanges,
                  onClick: { action: "saveMarkdown" },
                },
              ],
            } as A2UINode] : []),
          ],
        } as A2UINode,
      },
    ]
  }, [editMarkdown, markdown, t, executionResult?.coverUrl, title, onUpdateMarkdown])

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

  // 素材信息栏 - 显示/编辑模式
  const buildResultSection = (): A2UINode | null => {
    const hasCover = !!executionResult?.coverUrl
    const hasMediaId = !!executionResult?.wechatMediaId

    if (!hasCover && !hasMediaId && !isEditing) {
      // 无数据时显示添加按钮
      return {
        type: "container",
        style: {
          padding: "0.5rem 1rem",
          flexShrink: 0,
          borderBottom: "1px solid var(--ds-border)",
          backgroundColor: "var(--ds-muted)",
        },
        children: [
          {
            type: "row",
            align: "center",
            gap: "0.5rem",
            children: [
              { type: "text", text: "暂无素材信息", color: "muted", variant: "caption" },
              {
                type: "button",
                text: "添加",
                variant: "ghost",
                size: "sm",
                onClick: { action: "toggleEdit" },
              },
            ],
          },
        ],
      }
    }

    if (isEditing) {
      // 编辑模式
      return {
        type: "container",
        style: {
          padding: "1rem",
          flexShrink: 0,
          borderBottom: "1px solid var(--ds-border)",
          backgroundColor: "var(--ds-accent)",
        },
        children: [
          {
            type: "column",
            gap: "0.75rem",
            children: [
              { type: "text", text: "编辑素材信息", variant: "caption", weight: "semibold" },
              {
                type: "input",
                placeholder: "封面图 URL",
                value: editCoverUrl,
                onChange: { action: "updateCoverUrl" },
              },
              {
                type: "input",
                placeholder: "微信 Media ID",
                value: editMediaId,
                onChange: { action: "updateMediaId" },
              },
              {
                type: "row",
                gap: "0.5rem",
                justify: "end",
                children: [
                  { type: "button", text: "取消", variant: "ghost", size: "sm", onClick: { action: "toggleEdit" } },
                  { type: "button", text: "保存", variant: "primary", size: "sm", onClick: { action: "saveResult" } },
                ],
              },
            ],
          },
        ],
      }
    }

    // 显示模式
    return {
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
            ...(hasCover
              ? [
                  { type: "badge" as const, text: "✅ 有封面", color: "success" as const },
                  { type: "link" as const, text: "📷 查看", href: executionResult.coverUrl, variant: "primary" as const, external: true },
                ]
              : [{ type: "badge" as const, text: "无封面", color: "default" as const }]),
            ...(hasMediaId
              ? [
                  { type: "text" as const, text: "|", color: "muted" as const },
                  { type: "badge" as const, text: "微信已上传", color: "success" as const },
                  {
                    type: "button" as const,
                    text: mediaIdCopied ? "已复制" : "复制 ID",
                    variant: "ghost" as const,
                    size: "sm" as const,
                    onClick: { action: "copyMediaId" },
                  },
                ]
              : []),
            {
              type: "button",
              text: "编辑",
              variant: "ghost",
              size: "sm",
              onClick: { action: "toggleEdit" },
            },
          ],
        },
      ],
    }
  }

  const resultSection = buildResultSection()

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
    children: [titleSection, ...(resultSection ? [resultSection] : []), tabSection, contentSection],
  }

  if (!isOpen) return null

  return <A2UIRenderer node={panelNode} onAction={handleAction} />
}
