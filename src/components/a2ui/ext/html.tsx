"use client"

import type { A2UIComponentProps } from "@/lib/a2ui/registry"
import type { CSSProperties } from "react"

interface A2UIHtmlNode {
  type: "html"
  content: string
  style?: CSSProperties
  className?: string
}

export function A2UIHtml({ node }: A2UIComponentProps<A2UIHtmlNode>) {
  return (
    <div
      className={node.className}
      style={node.style}
      dangerouslySetInnerHTML={{ __html: node.content || "" }}
    />
  )
}
