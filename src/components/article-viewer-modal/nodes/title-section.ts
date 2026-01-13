/**
 * Title Section Node Builder
 */

import type { A2UINode } from "@/lib/a2ui"
import type { PublishStatus } from "../types"

interface TitleSectionParams {
  title?: string
  viewArticleLabel: string
  publishStatus: PublishStatus
  locale: string
  htmlCopied: boolean
  copied: boolean
  copiedLabel: string
  copyMarkdownLabel: string
  closeLabel: string
}

export function buildTitleSection({
  title,
  viewArticleLabel,
  publishStatus,
  locale,
  htmlCopied,
  copied,
  copiedLabel,
  copyMarkdownLabel,
  closeLabel,
}: TitleSectionParams): A2UINode {
  return {
    type: "container",
    className: "p-4 shrink-0 border-b border-[var(--ds-border)]",
    children: [
      {
        type: "row",
        justify: "between",
        align: "center",
        gap: "0.5rem",
        children: [
          { type: "text", text: title ?? viewArticleLabel, variant: "h3", weight: "semibold" },
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
                text: copied ? copiedLabel : copyMarkdownLabel,
                variant: "secondary",
                size: "sm",
                onClick: { action: "copy" },
              },
              { type: "button", text: closeLabel, variant: "ghost", size: "sm", onClick: { action: "close" } },
            ],
          },
        ],
      },
    ],
  }
}
