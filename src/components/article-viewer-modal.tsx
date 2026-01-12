"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UINode } from "@/lib/a2ui"
import type { WechatMediaInfoItem } from "@/server/db/schema"
import { assembleChapterMarkdown, parseChapterMarkdown, type MediaLike } from "@/lib/markdown"
import {
  markdownToWechatHtmlSync,
  copyHtmlToClipboard,
  STYLE_PRESET_LABELS,
  type StylePreset,
} from "@/lib/wechat"
import { api } from "@/trpc/react"

type MediaDraftItem = WechatMediaInfoItem & {
  act_number?: number | string
  act_name?: string | null
}

// Helper to normalize media info to array
type WechatMediaInfoProp = WechatMediaInfoItem | WechatMediaInfoItem[] | null | undefined

interface ArticleViewerModalProps {
  isOpen: boolean
  onClose: () => void
  markdown: string
  title?: string
  executionId?: string
  wechatMediaInfo?: WechatMediaInfoProp
  chapters?: Array<{
    id: string
    actNumber: number
    actName: string | null
    formattedContent: string | null
  }>
  onUpdateResult?: (updates: { coverUrl?: string; wechatMediaId?: string }) => void
  onUpdateMarkdown?: (markdown: string) => void
  onUpdateChapter?: (chapterId: string, formattedContent: string) => void
  onUpdateMediaInfo?: (wechatMediaInfo: unknown) => void
}

export function ArticleViewerModal({
  isOpen,
  onClose,
  markdown,
  title,
  wechatMediaInfo,
  chapters,
  onUpdateMarkdown,
  onUpdateChapter,
  onUpdateMediaInfo,
}: ArticleViewerModalProps) {
  const { t, locale } = useI18n()
  const [copied, setCopied] = useState(false)
  const [htmlCopied, setHtmlCopied] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [materialCollapsed, setMaterialCollapsed] = useState(false)
  const [mediaDraft, setMediaDraft] = useState<MediaDraftItem[]>([])
  const [chapterEdits, setChapterEdits] = useState(chapters ?? [])
  const [dirtyChapterIds, setDirtyChapterIds] = useState<Set<string>>(new Set())
  const [editorMarkdown, setEditorMarkdown] = useState("")
  const [stylePreset, setStylePreset] = useState<StylePreset>("modern")
  const [publishStatus, setPublishStatus] = useState<"idle" | "publishing" | "success" | "error">("idle")
  const [publishMessage, setPublishMessage] = useState("")

  // tRPC mutation for publishing to WeChat
  const publishMutation = api.export.publishToWechat.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        setPublishStatus("success")
        setPublishMessage(locale === "zh-CN" ? "发布成功" : "Published successfully")
        setTimeout(() => setPublishStatus("idle"), 3000)
      } else {
        setPublishStatus("error")
        setPublishMessage(result.message ?? "Publish failed")
        setTimeout(() => setPublishStatus("idle"), 5000)
      }
    },
    onError: (error) => {
      setPublishStatus("error")
      setPublishMessage(error.message)
      setTimeout(() => setPublishStatus("idle"), 5000)
    },
  })

  const normalizedMedia: MediaDraftItem[] = useMemo(() => {
    if (Array.isArray(wechatMediaInfo)) return wechatMediaInfo as MediaDraftItem[]
    if (wechatMediaInfo) return [wechatMediaInfo as MediaDraftItem]
    return []
  }, [wechatMediaInfo])

  useEffect(() => {
    setMediaDraft(normalizedMedia)
  }, [normalizedMedia])

  useEffect(() => {
    if (chapters) {
      setChapterEdits(chapters)
      setDirtyChapterIds(new Set())
      setEditorMarkdown(assembleChapterMarkdown(chapters, { includeMarkers: true }))
    }
  }, [chapters])

  useEffect(() => {
    if (!onUpdateChapter) return
    if (dirtyChapterIds.size === 0) return

    const timer = setTimeout(() => {
      setDirtyChapterIds((prev) => {
        const next = new Set(prev)
        for (const chapter of chapterEdits) {
          if (!next.has(chapter.id)) continue
          onUpdateChapter(chapter.id, chapter.formattedContent ?? "")
          next.delete(chapter.id)
        }
        return next
      })
    }, 1500)

    return () => clearTimeout(timer)
  }, [dirtyChapterIds, chapterEdits, onUpdateChapter])

  // Assembled markdown for web preview (uses R2 URLs)
  const assembledMarkdown = useMemo(() => {
    if (chapterEdits.length > 0) {
      return assembleChapterMarkdown(chapterEdits, { media: wechatMediaInfo as MediaLike | MediaLike[] | null | undefined, mediaStrategy: "latest", imageUrlPreference: "r2" })
    }
    return markdown
  }, [chapterEdits, markdown, wechatMediaInfo])

  // Assembled markdown for WeChat publish (uses WeChat URLs)
  const assembledMarkdownForWechat = useMemo(() => {
    if (chapterEdits.length > 0) {
      return assembleChapterMarkdown(chapterEdits, { media: wechatMediaInfo as MediaLike | MediaLike[] | null | undefined, mediaStrategy: "latest", imageUrlPreference: "wechat" })
    }
    return markdown
  }, [chapterEdits, markdown, wechatMediaInfo])

  // Generate WeChat HTML for preview (uses R2 URLs)
  const wechatResult = useMemo(() => {
    return markdownToWechatHtmlSync(assembledMarkdown, { stylePreset })
  }, [assembledMarkdown, stylePreset])

  // Generate WeChat HTML for publish (uses WeChat URLs)
  const wechatResultForPublish = useMemo(() => {
    return markdownToWechatHtmlSync(assembledMarkdownForWechat, { stylePreset })
  }, [assembledMarkdownForWechat, stylePreset])

  // Style preset options
  const stylePresetOptions = useMemo(() => {
    return (["default", "elegant", "tech", "modern"] as StylePreset[]).map((preset) => ({
      value: preset,
      label: locale === "zh-CN" ? STYLE_PRESET_LABELS[preset].zh : STYLE_PRESET_LABELS[preset].en,
    }))
  }, [locale])

  const handleAction = useCallback(
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "copy":
          navigator.clipboard.writeText(assembledMarkdown).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          })
          break
        case "copyHtml":
          copyHtmlToClipboard(wechatResult.html).then((success) => {
            if (success) {
              setHtmlCopied(true)
              setTimeout(() => setHtmlCopied(false), 2000)
            }
          })
          break
        case "copyMediaId": {
          const mediaId = args?.[0] as string | undefined
          if (mediaId) {
            navigator.clipboard.writeText(mediaId).then(() => {
            })
          }
          break
        }
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
            // 取消编辑，恢复原数据
            setMediaDraft(normalizedMedia)
          }
          setIsEditing(!isEditing)
          break
        case "toggleMaterial":
          setMaterialCollapsed((prev) => !prev)
          break
        case "saveMedia":
          if (onUpdateMediaInfo) {
            onUpdateMediaInfo(mediaDraft)
          }
          setIsEditing(false)
          break
        case "editMediaField": {
          const [value, index, key] = args as [string, number, keyof WechatMediaInfoItem]
          setMediaDraft((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)))
          break
        }
        case "editMediaAct": {
          const [value, index, key] = args as [string, number, "act_number" | "act_name"]
          setMediaDraft((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)))
          break
        }
        case "addMediaItem": {
          setMediaDraft((prev) => [
            ...prev,
            { act_number: undefined, act_name: "", r2_url: "", wechat_media_url: "", media_id: "" } as MediaDraftItem,
          ])
          break
        }
        case "removeMediaItem": {
          const idx = args?.[0] as number
          setMediaDraft((prev) => prev.filter((_, i) => i !== idx))
          break
        }
        case "updateMarkdown": {
          const value = args?.[0] as string ?? ""
          setEditorMarkdown(value)
          if (chapters && chapters.length > 0) {
            const parsed = parseChapterMarkdown(value)
            if (parsed.length > 0) {
              setChapterEdits((prev) =>
                prev.map((chapter) => {
                  const match = parsed.find((item) => item.id === chapter.id)
                  return match ? { ...chapter, formattedContent: match.content } : chapter
                })
              )
              setDirtyChapterIds((prev) => {
                const next = new Set(prev)
                for (const item of parsed) {
                  next.add(item.id)
                }
                return next
              })
            }
          } else if (onUpdateMarkdown) {
            onUpdateMarkdown(value)
          }
          break
        }
        case "setStylePreset":
          setStylePreset(args?.[0] as StylePreset ?? "default")
          break
        case "publishToWechat": {
          if (publishStatus === "publishing") return
          const thumbMediaId = normalizedMedia.slice(-1)[0]?.media_id
          if (!thumbMediaId) {
            setPublishStatus("error")
            setPublishMessage(locale === "zh-CN" ? "缺少封面图 media_id，请先上传封面到微信" : "Missing cover image media_id")
            setTimeout(() => setPublishStatus("idle"), 5000)
            return
          }
          if (!wechatResultForPublish.html || wechatResultForPublish.html.trim().length === 0) {
            setPublishStatus("error")
            setPublishMessage(locale === "zh-CN" ? "文章内容为空" : "Article content is empty")
            setTimeout(() => setPublishStatus("idle"), 5000)
            return
          }
          // Generate clean digest: remove markdown syntax (images, links, headers, bold, etc.)
          const cleanDigest = assembledMarkdown
            .replace(/!\[[^\]]*\]\([^)]+\)/g, "") // remove images
            .replace(/\[[^\]]*\]\([^)]+\)/g, "") // remove links
            .replace(/^#{1,6}\s+/gm, "") // remove headers
            .replace(/\*\*([^*]+)\*\*/g, "$1") // remove bold
            .replace(/\*([^*]+)\*/g, "$1") // remove italic
            .replace(/`([^`]+)`/g, "$1") // remove inline code
            .replace(/\n+/g, " ") // replace newlines with space
            .replace(/\s+/g, " ") // collapse whitespace
            .trim()
            .slice(0, 120)
          setPublishStatus("publishing")
          publishMutation.mutate({
            title: title ?? "Untitled",
            html: wechatResultForPublish.html,
            thumbMediaId,
            author: "ziikoo",
            digest: cleanDigest,
          })
          break
        }
      }
    },
    [onClose, wechatMediaInfo, isEditing, onUpdateMediaInfo, assembledMarkdown, onUpdateMarkdown, chapters, chapterEdits, wechatResult.html, wechatResultForPublish.html, mediaDraft, normalizedMedia, publishStatus, publishMutation, title, locale]
  )

  const tabs = useMemo(() => {
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
      content: wechatResult.html,
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
  }, [markdown, t, normalizedMedia, title, chapterEdits, editorMarkdown, wechatResult.html])

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
              {
                type: "button",
                text: publishStatus === "publishing"
                  ? (locale === "zh-CN" ? "发布中..." : "Publishing...")
                  : publishStatus === "success"
                  ? (locale === "zh-CN" ? "✓ 已发布" : "✓ Published")
                  : publishStatus === "error"
                  ? (locale === "zh-CN" ? "发布失败" : "Failed")
                  : (locale === "zh-CN" ? "发布到公众号" : "Publish to WeChat"),
                variant: publishStatus === "success" ? "primary" : publishStatus === "error" ? "destructive" : "secondary",
                size: "sm",
                disabled: publishStatus === "publishing",
                onClick: { action: "publishToWechat" },
              },
              {
                type: "button",
                text: htmlCopied
                  ? (locale === "zh-CN" ? "✓ 已复制" : "✓ Copied")
                  : (locale === "zh-CN" ? "复制 HTML" : "Copy HTML"),
                variant: htmlCopied ? "primary" : "secondary",
                size: "sm",
                onClick: { action: "copyHtml" },
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

  // 样式选择栏（仅在预览 tab 显示）
  const buildStyleBar = (): A2UINode | null => {
    if (activeTab !== 0) return null

    return {
      type: "container",
      className: "px-4 py-2 shrink-0 border-b border-[var(--ds-border)] bg-[var(--ds-muted)]",
      children: [
        {
          type: "row",
          align: "center",
          gap: "0.75rem",
          wrap: true,
          children: [
            {
              type: "text",
              text: locale === "zh-CN" ? "样式模板:" : "Style:",
              variant: "caption",
              color: "muted"
            },
            {
              type: "select",
              id: "style-preset",
              value: stylePreset,
              options: stylePresetOptions,
              onChange: { action: "setStylePreset" },
            },
            { type: "text", text: "|", color: "muted" },
            {
              type: "text",
              text: locale === "zh-CN"
                ? `字数: ${wechatResult.wordCount}`
                : `Words: ${wechatResult.wordCount}`,
              variant: "caption",
              color: "muted"
            },
            {
              type: "text",
              text: locale === "zh-CN"
                ? `图片: ${wechatResult.images.length}`
                : `Images: ${wechatResult.images.length}`,
              variant: "caption",
              color: "muted"
            },
          ],
        },
      ],
    }
  }

  // 素材信息栏 - 显示/编辑模式
  const buildResultSection = (): A2UINode | null => {
    const mediaItems = normalizedMedia
    const latestItem = mediaItems
      .filter((item) => item && (item.r2_url || item.wechat_media_url))
      .sort((a, b) => String(a.uploaded_at || "").localeCompare(String(b.uploaded_at || "")))
      .slice(-1)[0]
    const hasCover = !!latestItem?.r2_url
    const hasMediaId = !!latestItem?.media_id

    const headerRow: A2UINode = {
      type: "row",
      align: "center",
      gap: "0.5rem",
      wrap: true,
      children: [
        { type: "text", text: "素材信息", variant: "caption", weight: "semibold" },
        ...(mediaItems.length === 0
          ? [{ type: "text" as const, text: "暂无素材", color: "muted" as const, variant: "caption" as const }]
          : []),
        { type: "text" as const, text: "|", color: "muted" as const },
        {
          type: "button",
          text: materialCollapsed ? "展开" : "收起",
          variant: "ghost",
          size: "sm",
          onClick: { action: "toggleMaterial" },
        },
        ...(mediaItems.length === 0 && !isEditing
          ? [{
              type: "button" as const,
              text: "添加",
              variant: "ghost" as const,
              size: "sm" as const,
              onClick: { action: "toggleEdit" },
            }]
          : []),
      ],
    }

    if (isEditing) {
      // 编辑模式：逐章编辑素材数组
      const editorRows: A2UINode[] = mediaDraft.map((item, index) => ({
        type: "column",
        key: `media-row-${index}`,
        className: "p-3 rounded-md border border-[var(--ds-border)] bg-[var(--ds-surface)]",
        gap: "0.5rem",
        children: [
          {
            type: "row",
            align: "center",
            gap: "0.5rem",
            children: [
              { type: "badge" as const, text: `第${item.act_number ?? "?"}幕`, color: "default" as const },
              { type: "text" as const, text: item.act_name ?? "", color: "muted" as const },
              { type: "button" as const, text: "删除", variant: "ghost", size: "sm", onClick: { action: "removeMediaItem", args: [index] } },
            ],
          },
          {
            type: "row",
            gap: "0.5rem",
            wrap: true,
            children: [
              {
                type: "input" as const,
                placeholder: "幕次",
                value: item.act_number != null ? String(item.act_number) : "",
                onChange: { action: "editMediaAct", args: [index, "act_number"] },
                className: "min-w-[120px]",
              },
              {
                type: "input" as const,
                placeholder: "章节标题",
                value: item.act_name ?? "",
                onChange: { action: "editMediaAct", args: [index, "act_name"] },
                className: "flex-1",
              },
            ],
          },
          {
            type: "input" as const,
            placeholder: "封面/插图 R2 URL",
            value: item.r2_url ?? "",
            onChange: { action: "editMediaField", args: [index, "r2_url"] },
          },
          {
            type: "input" as const,
            placeholder: "微信素材 URL",
            value: item.wechat_media_url ?? "",
            onChange: { action: "editMediaField", args: [index, "wechat_media_url"] },
          },
          {
            type: "input" as const,
            placeholder: "微信 Media ID",
            value: item.media_id ?? "",
            onChange: { action: "editMediaField", args: [index, "media_id"] },
          },
        ],
      }))

      return {
        type: "container",
        className: "p-4 shrink-0 border-b border-[var(--ds-border)] bg-[var(--ds-accent)]",
        children: [
          {
            type: "column",
            gap: "0.75rem",
            children: [
              { type: "text", text: "编辑素材信息（按章节）", variant: "caption", weight: "semibold" },
              ...editorRows,
              {
                type: "button",
                text: "新增素材",
                variant: "secondary",
                size: "sm",
                onClick: { action: "addMediaItem" },
              },
              {
                type: "row",
                gap: "0.5rem",
                justify: "end",
                children: [
                  { type: "button", text: "取消", variant: "ghost", size: "sm", onClick: { action: "toggleEdit" } },
                  { type: "button", text: "保存", variant: "primary", size: "sm", onClick: { action: "saveMedia" } },
                ],
              },
            ],
          },
        ],
      }
    }

    const grouped = mediaItems.reduce<Record<string, typeof mediaItems>>((acc, item) => {
      const actNumber = item.act_number ?? "未分配"
      acc[actNumber] = acc[actNumber] ?? []
      acc[actNumber].push(item)
      return acc
    }, {})

    const chapterRows: A2UINode[] = Object.entries(grouped).map(([act, items]) => {
      const first = items[0]
      const r2Href = first?.r2_url
      const wechatHref = first?.wechat_media_url
      return {
        type: "row",
        align: "center",
        gap: "0.5rem",
        wrap: true,
        children: [
          { type: "badge" as const, text: `第${act}幕`, color: "default" as const },
          { type: "text" as const, text: first?.act_name ?? "", color: "muted" as const },
          ...(r2Href
            ? [{ type: "link" as const, text: "R2", href: r2Href, variant: "primary" as const, external: true }]
            : []),
          ...(wechatHref
            ? [{ type: "link" as const, text: "微信", href: wechatHref, variant: "primary" as const, external: true }]
            : []),
          ...(first?.uploaded_at
            ? [{ type: "text" as const, text: String(first.uploaded_at).replace("T", " ").slice(0, 19), color: "muted" as const }]
            : []),
          ...(first?.media_id
            ? [{
                type: "button" as const,
                text: "复制 ID",
                variant: "ghost" as const,
                size: "sm" as const,
                onClick: { action: "copyMediaId", args: [first.media_id] },
              }]
            : []),
        ],
      } as A2UINode
    })

    // 显示模式
    const showDetails = !materialCollapsed && mediaItems.length > 0

    return {
      type: "container",
      className: "px-4 py-3 shrink-0 border-b border-[var(--ds-border)] bg-[var(--ds-accent)]",
      children: [
        {
          type: "column",
          gap: "0.75rem",
          children: [
            headerRow,
            ...(showDetails
              ? [
                  {
                    type: "row" as const,
                    align: "center" as const,
                    gap: "0.75rem" as const,
                    wrap: true,
                    children: [
                      ...(hasCover
                        ? [
                            { type: "badge" as const, text: "✅ 有封面", color: "success" as const },
                            { type: "link" as const, text: "📷 查看", href: latestItem?.r2_url, variant: "primary" as const, external: true },
                          ]
                        : [{ type: "badge" as const, text: "无封面", color: "default" as const }]),
                      ...(hasMediaId
                        ? [
                            { type: "text" as const, text: "|", color: "muted" as const },
                            { type: "badge" as const, text: "微信已上传", color: "success" as const },
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
                  } as A2UINode,
                  ...chapterRows,
                ]
              : []),
          ],
        },
      ],
    }
  }

  const resultSection = buildResultSection()
  const styleBar = buildStyleBar()

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
    children: [
      titleSection,
      ...(resultSection ? [resultSection] : []),
      tabSection,
      ...(styleBar ? [styleBar] : []),
      contentSection
    ],
  }

  if (!isOpen) return null

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0, flexDirection: "column" }}>
      <A2UIRenderer node={panelNode} onAction={handleAction} />
    </div>
  )
}
