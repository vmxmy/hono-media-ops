"use client"

import { useCallback } from "react"
import type { WechatMediaInfoItem } from "@/server/db/schema"
import { copyHtmlToClipboard, type StylePreset } from "@/lib/wechat"
import { parseChapterMarkdown } from "@/lib/markdown"
import type { MediaDraftItem, ArticleViewerModalProps } from "./types"
import type { ArticleViewerState } from "./use-article-state"

interface UseActionsParams {
  state: ArticleViewerState
  onClose: () => void
  onUpdateMarkdown?: (markdown: string) => void
  onUpdateMediaInfo?: (wechatMediaInfo: unknown) => void
  chapters?: ArticleViewerModalProps["chapters"]
  title?: string
}

export function useArticleViewerActions({
  state,
  onClose,
  onUpdateMarkdown,
  onUpdateMediaInfo,
  chapters,
  title,
}: UseActionsParams) {
  const {
    setCopied,
    setHtmlCopied,
    setActiveTab,
    isEditing,
    setIsEditing,
    setMaterialCollapsed,
    mediaDraft,
    setMediaDraft,
    setChapterEdits,
    setDirtyChapterIds,
    setEditorMarkdown,
    setStylePreset,
    publishStatus,
    setPublishStatus,
    setPublishMessage,
    normalizedMedia,
    assembledMarkdown,
    wechatResult,
    wechatResultForPublish,
    publishMutation,
    locale,
  } = state

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
    [onClose, isEditing, onUpdateMediaInfo, assembledMarkdown, onUpdateMarkdown, chapters, wechatResult.html, wechatResultForPublish.html, mediaDraft, normalizedMedia, publishStatus, publishMutation, title, locale, setCopied, setHtmlCopied, setActiveTab, setIsEditing, setMaterialCollapsed, setMediaDraft, setChapterEdits, setDirtyChapterIds, setEditorMarkdown, setStylePreset, setPublishStatus, setPublishMessage]
  )

  return handleAction
}
