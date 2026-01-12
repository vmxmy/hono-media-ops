"use client"

import type { A2UIArticleViewerModalNode } from "@/lib/a2ui"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"
import { dispatchA2UIAction } from "@/lib/a2ui/registry"
import { ArticleViewerModal } from "@/components/article-viewer-modal"

export function A2UIArticleViewerModal({
  node,
  onAction,
}: A2UIComponentProps<A2UIArticleViewerModalNode>) {
  if (!node.open) return null

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0, flexDirection: "column" }}>
      <ArticleViewerModal
        isOpen={node.open}
        onClose={() => dispatchA2UIAction(onAction, node.onClose)}
        markdown={node.markdown}
        title={node.title}
        executionId={node.executionId}
        wechatMediaInfo={node.wechatMediaInfo as { r2_url?: string; media_id?: string } | null | undefined}
        onUpdateResult={(updates) => dispatchA2UIAction(onAction, node.onUpdateResult, [updates])}
        onUpdateMarkdown={(markdown) => dispatchA2UIAction(onAction, node.onUpdateMarkdown, [markdown])}
      />
    </div>
  )
}
