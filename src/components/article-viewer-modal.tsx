"use client"

import { useState, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useI18n } from "@/contexts/i18n-context"

interface ArticleViewerModalProps {
  isOpen: boolean
  onClose: () => void
  markdown: string
  title?: string
}

type TabValue = "preview" | "source"

export function ArticleViewerModal({
  isOpen,
  onClose,
  markdown,
  title,
}: ArticleViewerModalProps) {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<TabValue>("preview")
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [markdown])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    },
    [onClose]
  )

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-background border-border flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg border shadow-xl">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-foreground text-lg font-semibold">
            {title ?? t("article.viewArticle")}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
            aria-label={t("common.close")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-border flex gap-1 border-b px-6 pt-2">
          <button
            onClick={() => setActiveTab("preview")}
            className={`rounded-t px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "preview"
                ? "bg-muted text-foreground border-border border-x border-t"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📖 {t("article.preview")}
          </button>
          <button
            onClick={() => setActiveTab("source")}
            className={`rounded-t px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "source"
                ? "bg-muted text-foreground border-border border-x border-t"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {"</>"} {t("article.source")}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === "preview" ? (
            <article className="prose prose-neutral dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {markdown}
              </ReactMarkdown>
            </article>
          ) : (
            <pre className="bg-muted text-foreground overflow-auto rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
              {markdown}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="border-border flex items-center justify-end gap-3 border-t px-6 py-4">
          <button
            onClick={handleCopy}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            {copied ? t("article.copied") : t("article.copyMarkdown")}
          </button>
          <button
            onClick={onClose}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  )
}
