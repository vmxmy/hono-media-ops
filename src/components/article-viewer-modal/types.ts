/**
 * Article Viewer Modal Types
 */

import type { WechatMediaInfoItem } from "@/server/db/schema"

export type MediaDraftItem = WechatMediaInfoItem & {
  act_number?: number | string
  act_name?: string | null
}

export type WechatMediaInfoProp = WechatMediaInfoItem | WechatMediaInfoItem[] | null | undefined

export interface ArticleViewerModalProps {
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

export type PublishStatus = "idle" | "publishing" | "success" | "error"
