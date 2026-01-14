"use client"

import DOMPurify from "isomorphic-dompurify"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"
import type { CSSProperties } from "react"

interface A2UIHtmlNode {
  type: "html"
  content: string
  style?: CSSProperties
  className?: string
}

// 安全的 HTML 标签白名单
const ALLOWED_TAGS = [
  "p", "div", "span", "strong", "em", "b", "i", "u",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "br", "hr",
  "a", "img", "blockquote", "pre", "code",
  "table", "thead", "tbody", "tr", "th", "td",
]

// 安全的属性白名单
const ALLOWED_ATTR = [
  "class", "style", "src", "alt", "href", "target", "rel",
  "width", "height", "title",
]

export function A2UIHtml({ node }: A2UIComponentProps<A2UIHtmlNode>) {
  const sanitizedHtml = DOMPurify.sanitize(node.content || "", {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  })

  return (
    <div
      className={node.className}
      style={node.style}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}
