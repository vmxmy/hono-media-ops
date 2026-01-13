"use client"

import { useEffect, useMemo, useState } from "react"
import { useI18n } from "@/contexts/i18n-context"
import { assembleChapterMarkdown, type MediaLike } from "@/lib/markdown"
import {
  markdownToWechatHtmlSync,
  STYLE_PRESET_LABELS,
  type StylePreset,
} from "@/lib/wechat"
import { api } from "@/trpc/react"
import type { MediaDraftItem, WechatMediaInfoProp, ArticleViewerModalProps } from "./types"

export interface ArticleViewerState {
  copied: boolean
  setCopied: (value: boolean) => void
  htmlCopied: boolean
  setHtmlCopied: (value: boolean) => void
  activeTab: number
  setActiveTab: (value: number) => void
  isEditing: boolean
  setIsEditing: (value: boolean) => void
  materialCollapsed: boolean
  setMaterialCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void
  mediaDraft: MediaDraftItem[]
  setMediaDraft: (value: MediaDraftItem[] | ((prev: MediaDraftItem[]) => MediaDraftItem[])) => void
  chapterEdits: NonNullable<ArticleViewerModalProps["chapters"]>
  setChapterEdits: (value: NonNullable<ArticleViewerModalProps["chapters"]> | ((prev: NonNullable<ArticleViewerModalProps["chapters"]>) => NonNullable<ArticleViewerModalProps["chapters"]>)) => void
  dirtyChapterIds: Set<string>
  setDirtyChapterIds: (value: Set<string> | ((prev: Set<string>) => Set<string>)) => void
  editorMarkdown: string
  setEditorMarkdown: (value: string) => void
  stylePreset: StylePreset
  setStylePreset: (value: StylePreset) => void
  publishStatus: "idle" | "publishing" | "success" | "error"
  setPublishStatus: (value: "idle" | "publishing" | "success" | "error") => void
  publishMessage: string
  setPublishMessage: (value: string) => void
  // Computed values
  normalizedMedia: MediaDraftItem[]
  assembledMarkdown: string
  assembledMarkdownForWechat: string
  wechatResult: ReturnType<typeof markdownToWechatHtmlSync>
  wechatResultForPublish: ReturnType<typeof markdownToWechatHtmlSync>
  stylePresetOptions: Array<{ value: string; label: string }>
  // tRPC
  publishMutation: ReturnType<typeof api.export.publishToWechat.useMutation>
  locale: string
}

export function useArticleViewerState(
  markdown: string,
  chapters: ArticleViewerModalProps["chapters"],
  wechatMediaInfo: WechatMediaInfoProp,
  onUpdateChapter?: (chapterId: string, formattedContent: string) => void
): ArticleViewerState {
  const { locale } = useI18n()
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

  return {
    copied,
    setCopied,
    htmlCopied,
    setHtmlCopied,
    activeTab,
    setActiveTab,
    isEditing,
    setIsEditing,
    materialCollapsed,
    setMaterialCollapsed,
    mediaDraft,
    setMediaDraft,
    chapterEdits,
    setChapterEdits,
    dirtyChapterIds,
    setDirtyChapterIds,
    editorMarkdown,
    setEditorMarkdown,
    stylePreset,
    setStylePreset,
    publishStatus,
    setPublishStatus,
    publishMessage,
    setPublishMessage,
    normalizedMedia,
    assembledMarkdown,
    assembledMarkdownForWechat,
    wechatResult,
    wechatResultForPublish,
    stylePresetOptions,
    publishMutation,
    locale,
  }
}
