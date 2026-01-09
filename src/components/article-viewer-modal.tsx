"use client"

import { useCallback, useMemo, useState } from "react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UINode } from "@/lib/a2ui"
import type { ExecutionResult } from "@/server/db/schema"
import { useAutoSave, getSaveStatusText, getSaveStatusClass } from "@/hooks/use-auto-save"
import { WechatExportModal } from "@/components/wechat-export-modal"

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
  const { t, locale } = useI18n()
  const [copied, setCopied] = useState(false)
  const [mediaIdCopied, setMediaIdCopied] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editCoverUrl, setEditCoverUrl] = useState(executionResult?.coverUrl ?? "")
  const [editMediaId, setEditMediaId] = useState(executionResult?.wechatMediaId ?? "")
  const [showExportModal, setShowExportModal] = useState(false)

  // Auto-save hook for markdown content
  const {
    value: editMarkdown,
    setValue: setEditMarkdown,
    saveStatus,
    hasUnsavedChanges,
    forceSave,
  } = useAutoSave({
    initialValue: markdown,
    debounceMs: 2000,
    enabled: !!onUpdateMarkdown,
    onSave: async (value) => {
      if (onUpdateMarkdown) {
        await Promise.resolve(onUpdateMarkdown(value))
      }
    },
  })

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
        case "forceSave":
          void forceSave()
          break
        case "exportWechat":
          setShowExportModal(true)
          break
      }
    },
    [onClose, executionResult, isEditing, editCoverUrl, editMediaId, onUpdateResult, setEditMarkdown, forceSave]
  )

  const tabs = useMemo(() => {
    const coverUrl = executionResult?.coverUrl
    const previewChildren: A2UINode[] = []

    // 添加封面图
    if (coverUrl) {
      previewChildren.push({
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

    // 添加 markdown 内容 (使用编辑后的内容)
    previewChildren.push({ type: "markdown", content: editMarkdown } as A2UINode)

    // Tab label with save status indicator
    const sourceTabLabel = hasUnsavedChanges
      ? `</> ${t("article.source")} *`
      : saveStatus === "saving"
        ? `</> ${t("article.source")} ⟳`
        : `</> ${t("article.source")}`

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
        label: sourceTabLabel,
        content: {
          type: "column",
          gap: "0",
          className: "flex-1 min-h-0",
          children: [
            {
              type: "markdown-editor",
              id: "markdown-editor",
              value: editMarkdown,
              preview: "live",
              height: "100%",
              className: "flex-1 min-h-0",
              onChange: { action: "updateMarkdown" },
            } as A2UINode,
          ],
        } as A2UINode,
      },
    ]
  }, [editMarkdown, t, executionResult?.coverUrl, title, hasUnsavedChanges, saveStatus])

  // Get save status text for display
  const saveStatusText = getSaveStatusText(saveStatus, hasUnsavedChanges, locale === "zh-CN" ? "zh-CN" : "en")
  const saveStatusClassName = getSaveStatusClass(saveStatus)

  // 第一段：标题栏
  const titleSection: A2UINode = {
    type: "container",
    className: "p-4 shrink-0 border-b border-[var(--ds-border)]",
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
            align: "center",
            children: [
              // Auto-save status indicator
              ...(saveStatusText && onUpdateMarkdown ? [{
                type: "text" as const,
                text: saveStatusText,
                variant: "caption" as const,
                className: saveStatus === "saving" ? "text-[var(--ds-warning)]" :
                         saveStatus === "saved" ? "text-[var(--ds-success)]" :
                         saveStatus === "error" ? "text-[var(--ds-destructive)]" :
                         "text-[var(--ds-muted-foreground)]",
              }] : []),
              {
                type: "button",
                text: locale === "zh-CN" ? "导出微信" : "Export WeChat",
                variant: "secondary",
                size: "sm",
                onClick: { action: "exportWechat" },
              },
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
        className: "px-4 py-2 shrink-0 border-b border-[var(--ds-border)] bg-[var(--ds-muted)]",
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
        className: "p-4 shrink-0 border-b border-[var(--ds-border)] bg-[var(--ds-accent)]",
        children: [
          {
            type: "column",
            gap: "0.75rem",
            children: [
              { type: "text", text: "编辑素材信息", variant: "caption", weight: "semibold" },
              {
                type: "input",
                id: "cover-url",
                name: "cover-url",
                placeholder: "封面图 URL",
                value: editCoverUrl,
                autocomplete: "off",
                onChange: { action: "updateCoverUrl" },
              },
              {
                type: "input",
                id: "media-id",
                name: "media-id",
                placeholder: "微信 Media ID",
                value: editMediaId,
                autocomplete: "off",
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
      className: "px-4 py-2 shrink-0 border-b border-[var(--ds-border)] bg-[var(--ds-accent)]",
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

  // 第三段：内容区（带滚动条）
  // 源码 tab 使用自己的滚动，预览 tab 使用外层滚动
  const isSourceTab = activeTab === 1
  const contentSection: A2UINode = isSourceTab
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

  const panelNode: A2UINode = {
    type: "card",
    hoverable: false,
    className: "flex-1 min-h-0 flex flex-col p-0 overflow-hidden",
    children: [titleSection, ...(resultSection ? [resultSection] : []), tabSection, contentSection],
  }

  if (!isOpen) return null

  return (
    <>
      <div style={{ display: "flex", flex: 1, minHeight: 0, flexDirection: "column" }}>
        <A2UIRenderer node={panelNode} onAction={handleAction} />
      </div>

      {/* WeChat Export Modal */}
      <WechatExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        markdown={editMarkdown}
        title={title}
      />
    </>
  )
}
