"use client"

import { useMemo } from "react"
import { markdownToWechatHtmlSync, type StylePreset } from "@/lib/wechat"
import type { A2UIMarkdownNode } from "@/lib/a2ui"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"

export function A2UIMarkdown({ node }: A2UIComponentProps<A2UIMarkdownNode>) {
  // Use 'modern' as the default preview style since it looks the best
  const preset: StylePreset = "modern"

  const { html } = useMemo(() => {
    try {
      return markdownToWechatHtmlSync(node.content || "", {
        stylePreset: preset,
        // We don't need to wrap in section here as the container handles layout,
        // but wrapping ensures the 'article' global styles (font-family, line-height) are applied.
        wrapInSection: true, 
      })
    } catch (e) {
      console.error("Markdown rendering error:", e)
      return { html: "<p>Error rendering content</p>", images: [], wordCount: 0 }
    }
  }, [node.content, preset])

  return (
    // We enforce a white background and specific width constraints to simulate WeChat
    // The 'not-prose' class ensures Tailwind typography doesn't interfere if it's applied on a parent
    <div 
      className="a2ui-markdown-preview not-prose bg-white text-black overflow-hidden rounded-md shadow-sm"
      style={{
        ...node.style,
        // Ensure the preview area has adequate padding similar to a phone screen
        padding: "20px",
      }}
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
