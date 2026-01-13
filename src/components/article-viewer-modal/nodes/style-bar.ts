/**
 * Style Bar Node Builder
 */

import type { A2UINode } from "@/lib/a2ui"
import type { StylePreset } from "@/lib/wechat"

interface StyleBarParams {
  activeTab: number
  locale: string
  stylePreset: StylePreset
  stylePresetOptions: Array<{ value: string; label: string }>
  wordCount: number
  imageCount: number
}

export function buildStyleBar({
  activeTab,
  locale,
  stylePreset,
  stylePresetOptions,
  wordCount,
  imageCount,
}: StyleBarParams): A2UINode | null {
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
              ? `字数: ${wordCount}`
              : `Words: ${wordCount}`,
            variant: "caption",
            color: "muted"
          },
          {
            type: "text",
            text: locale === "zh-CN"
              ? `图片: ${imageCount}`
              : `Images: ${imageCount}`,
            variant: "caption",
            color: "muted"
          },
        ],
      },
    ],
  }
}
