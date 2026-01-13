"use client"

import { useMemo } from "react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UINode } from "@/lib/a2ui"
import type { ArticleViewerModalProps } from "./types"
import { useArticleViewerState } from "./use-article-state"
import { useArticleViewerActions } from "./use-actions"
import {
  buildTitleSection,
  buildStyleBar,
  buildResultSection,
  buildTabs,
  buildTabSection,
  buildContentSection,
} from "./nodes"

export type { ArticleViewerModalProps } from "./types"

export function ArticleViewerModal({
  isOpen,
  onClose,
  markdown,
  title,
  wechatMediaInfo,
  chapters,
  onUpdateMarkdown,
  onUpdateChapter,
  onUpdateMediaInfo,
}: ArticleViewerModalProps) {
  const { t } = useI18n()

  const state = useArticleViewerState(
    markdown,
    chapters,
    wechatMediaInfo,
    onUpdateChapter
  )

  const handleAction = useArticleViewerActions({
    state,
    onClose,
    onUpdateMarkdown,
    onUpdateMediaInfo,
    chapters,
    title,
  })

  const tabs = useMemo(() => buildTabs({
    markdown,
    wechatHtml: state.wechatResult.html,
    normalizedMedia: state.normalizedMedia,
    title,
    chapterEdits: state.chapterEdits,
    editorMarkdown: state.editorMarkdown,
    t,
  }), [markdown, state.wechatResult.html, state.normalizedMedia, title, state.chapterEdits, state.editorMarkdown, t])

  const titleSection = useMemo(() => buildTitleSection({
    title,
    viewArticleLabel: t("article.viewArticle"),
    publishStatus: state.publishStatus,
    locale: state.locale,
    htmlCopied: state.htmlCopied,
    copied: state.copied,
    copiedLabel: t("article.copied"),
    copyMarkdownLabel: t("article.copyMarkdown"),
    closeLabel: t("common.close"),
  }), [title, t, state.publishStatus, state.locale, state.htmlCopied, state.copied])

  const styleBar = useMemo(() => buildStyleBar({
    activeTab: state.activeTab,
    locale: state.locale,
    stylePreset: state.stylePreset,
    stylePresetOptions: state.stylePresetOptions,
    wordCount: state.wechatResult.wordCount,
    imageCount: state.wechatResult.images.length,
  }), [state.activeTab, state.locale, state.stylePreset, state.stylePresetOptions, state.wechatResult.wordCount, state.wechatResult.images.length])

  const resultSection = useMemo(() => buildResultSection({
    normalizedMedia: state.normalizedMedia,
    isEditing: state.isEditing,
    materialCollapsed: state.materialCollapsed,
    mediaDraft: state.mediaDraft,
  }), [state.normalizedMedia, state.isEditing, state.materialCollapsed, state.mediaDraft])

  const tabSection = useMemo(() => buildTabSection(tabs, state.activeTab), [tabs, state.activeTab])

  const contentSection = useMemo(() => buildContentSection(tabs, state.activeTab), [tabs, state.activeTab])

  const panelNode: A2UINode = useMemo(() => ({
    type: "card",
    hoverable: false,
    className: "flex-1 min-h-0 flex flex-col p-0 overflow-hidden",
    children: [
      titleSection,
      ...(resultSection ? [resultSection] : []),
      tabSection,
      ...(styleBar ? [styleBar] : []),
      contentSection
    ],
  }), [titleSection, resultSection, tabSection, styleBar, contentSection])

  if (!isOpen) return null

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0, flexDirection: "column" }}>
      <A2UIRenderer node={panelNode} onAction={handleAction} />
    </div>
  )
}
