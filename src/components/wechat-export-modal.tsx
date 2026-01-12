"use client"

/**
 * WeChat Export Modal
 *
 * Modal for previewing and exporting articles to WeChat Official Account format.
 */

import { useState, useCallback, useMemo } from "react"
import { useI18n } from "@/contexts/i18n-context"
import {
  markdownToWechatHtmlSync,
  copyHtmlToClipboard,
  STYLE_PRESET_LABELS,
  type StylePreset,
  type WechatHtmlResult,
} from "@/lib/wechat"

// ==================== Types ====================

interface WechatExportModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback to close the modal */
  onClose: () => void
  /** Markdown content to export */
  markdown: string
  /** Article title (optional) */
  title?: string
}

// ==================== Component ====================

export function WechatExportModal({
  isOpen,
  onClose,
  markdown,
  title,
}: WechatExportModalProps) {
  const { t, locale } = useI18n()
  const [stylePreset, setStylePreset] = useState<StylePreset>("default")
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(true)

  // Generate WeChat HTML
  const result = useMemo<WechatHtmlResult>(() => {
    return markdownToWechatHtmlSync(markdown, { stylePreset })
  }, [markdown, stylePreset])

  // Count external images that need upload
  const externalImageCount = useMemo(() => {
    return result.images.filter((img) => img.needsUpload).length
  }, [result.images])

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    const success = await copyHtmlToClipboard(result.html)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [result.html])

  // Get style preset label
  const getPresetLabel = useCallback(
    (preset: StylePreset) => {
      return locale === "zh-CN"
        ? STYLE_PRESET_LABELS[preset].zh
        : STYLE_PRESET_LABELS[preset].en
    },
    [locale]
  )

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold">
              {locale === "zh-CN" ? "导出到微信公众号" : "Export to WeChat"}
            </span>
            {title && (
              <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                - {title}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4 p-4 border-b bg-muted/30">
          {/* Style Preset Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">
              {locale === "zh-CN" ? "样式模板" : "Style"}:
            </label>
            <select
              value={stylePreset}
              onChange={(e) => setStylePreset(e.target.value as StylePreset)}
              className="px-3 py-1.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="default">{getPresetLabel("default")}</option>
              <option value="elegant">{getPresetLabel("elegant")}</option>
              <option value="tech">{getPresetLabel("tech")}</option>
              <option value="modern">{getPresetLabel("modern")}</option>
            </select>
          </div>

          {/* Toggle Preview/Source */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(true)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                showPreview
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {locale === "zh-CN" ? "预览" : "Preview"}
            </button>
            <button
              onClick={() => setShowPreview(false)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                !showPreview
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              HTML
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground ml-auto">
            <span>
              {locale === "zh-CN" ? `字数: ${result.wordCount}` : `Words: ${result.wordCount}`}
            </span>
            <span>
              {locale === "zh-CN"
                ? `图片: ${result.images.length}`
                : `Images: ${result.images.length}`}
            </span>
            {externalImageCount > 0 && (
              <span className="text-amber-600">
                {locale === "zh-CN"
                  ? `⚠️ ${externalImageCount} 张需手动上传`
                  : `⚠️ ${externalImageCount} need upload`}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {showPreview ? (
            /* HTML Preview */
            <div
              className="prose prose-neutral dark:prose-invert max-w-none bg-white text-black p-6 rounded-lg"
              dangerouslySetInnerHTML={{ __html: result.html }}
            />
          ) : (
            /* HTML Source */
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs font-mono">
              <code>{result.html}</code>
            </pre>
          )}
        </div>

        {/* Image List (if there are external images) */}
        {externalImageCount > 0 && (
          <div className="border-t p-4 bg-amber-50 dark:bg-amber-950/20">
            <div className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
              {locale === "zh-CN"
                ? "以下图片需要手动上传到微信素材库："
                : "These images need to be uploaded to WeChat manually:"}
            </div>
            <div className="flex flex-wrap gap-2">
              {result.images
                .filter((img) => img.needsUpload)
                .map((img, index) => (
                  <a
                    key={index}
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/50 rounded text-amber-700 dark:text-amber-300 hover:underline truncate max-w-[200px]"
                    title={img.url}
                  >
                    {img.alt ?? `Image ${index + 1}`}
                  </a>
                ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {locale === "zh-CN" ? "取消" : "Cancel"}
          </button>
          <button
            onClick={handleCopy}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              copied
                ? "bg-green-600 text-white"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {copied
              ? locale === "zh-CN"
                ? "✓ 已复制"
                : "✓ Copied"
              : locale === "zh-CN"
                ? "复制 HTML"
                : "Copy HTML"}
          </button>
        </div>
      </div>
    </div>
  )
}
