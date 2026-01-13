/**
 * Result Section (Material Info) Node Builder
 */

import type { A2UINode } from "@/lib/a2ui"
import type { MediaDraftItem } from "../types"

interface ResultSectionParams {
  normalizedMedia: MediaDraftItem[]
  isEditing: boolean
  materialCollapsed: boolean
  mediaDraft: MediaDraftItem[]
}

export function buildResultSection({
  normalizedMedia,
  isEditing,
  materialCollapsed,
  mediaDraft,
}: ResultSectionParams): A2UINode | null {
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
