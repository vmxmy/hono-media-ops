"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeSlug from "rehype-slug"
import type { A2UIMarkdownNode } from "@/lib/a2ui"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"

export function A2UIMarkdown({ node }: A2UIComponentProps<A2UIMarkdownNode>) {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none" style={node.style}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
        {node.content}
      </ReactMarkdown>
    </article>
  )
}
