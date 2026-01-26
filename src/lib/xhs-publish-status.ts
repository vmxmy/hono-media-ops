export const XHS_PUBLISH_STATUSES = [
  "not_published",
  "publishing",
  "published",
  "failed",
] as const

export type XhsPublishStatus = typeof XHS_PUBLISH_STATUSES[number]

export type XhsPublishBadgeColor = "default" | "processing" | "success" | "destructive"

const PUBLISH_STATUS_CONFIG: Record<
  XhsPublishStatus,
  {
    labelKey:
      | "xhsImages.publishStatusNotPublished"
      | "xhsImages.publishStatusPublishing"
      | "xhsImages.publishStatusPublished"
      | "xhsImages.publishStatusFailed"
    color: XhsPublishBadgeColor
  }
> = {
  not_published: { labelKey: "xhsImages.publishStatusNotPublished", color: "default" },
  publishing: { labelKey: "xhsImages.publishStatusPublishing", color: "processing" },
  published: { labelKey: "xhsImages.publishStatusPublished", color: "success" },
  failed: { labelKey: "xhsImages.publishStatusFailed", color: "destructive" },
}

export const getXhsPublishStatusConfig = (status?: XhsPublishStatus | null) => {
  if (!status || !(status in PUBLISH_STATUS_CONFIG)) {
    return PUBLISH_STATUS_CONFIG.not_published
  }
  return PUBLISH_STATUS_CONFIG[status]
}

export type XhsPublishMetaColor = "muted" | "destructive"

export interface XhsPublishMetaItem {
  labelKey: "xhsImages.publishedAt" | "xhsImages.publishError" | "xhsImages.xhsNoteId"
  value: string
  color: XhsPublishMetaColor
}

export const getXhsPublishMetaItems = (input: {
  status?: XhsPublishStatus | null
  publishedAt?: Date | null
  xhsNoteId?: string | null
  publishErrorMessage?: string | null
  formatDate?: (value: Date) => string
}): XhsPublishMetaItem[] => {
  const formatDate = input.formatDate ?? ((value: Date) => value.toLocaleDateString())
  const items: XhsPublishMetaItem[] = []

  if (input.status === "failed" && input.publishErrorMessage) {
    items.push({
      labelKey: "xhsImages.publishError",
      value: input.publishErrorMessage,
      color: "destructive",
    })
  }

  if (input.publishedAt) {
    items.push({
      labelKey: "xhsImages.publishedAt",
      value: formatDate(input.publishedAt),
      color: "muted",
    })
  }

  if (input.xhsNoteId) {
    items.push({
      labelKey: "xhsImages.xhsNoteId",
      value: input.xhsNoteId,
      color: "muted",
    })
  }

  return items
}
