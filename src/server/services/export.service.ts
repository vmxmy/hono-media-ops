/**
 * Export Service
 *
 * Handles exporting articles to various formats (WeChat, Markdown file, etc.)
 */

import { eq } from "drizzle-orm"
import { db } from "@/server/db"
import { taskExecutions } from "@/server/db/schema"
import { markdownToWechatHtml, type StylePreset, type WechatHtmlResult } from "@/lib/wechat"
import { chapterService } from "./chapter.service"
import { assembleChapterMarkdown } from "@/lib/markdown"
import { env } from "@/env"

// ==================== Types ====================

export interface WechatExportOptions {
  stylePreset?: StylePreset
}

export interface WechatExportResult extends WechatHtmlResult {
  /** Article title (from task topic) */
  title?: string
  /** Cover image URL */
  coverUrl?: string
}

export interface MarkdownExportResult {
  /** Markdown content */
  content: string
  /** Suggested filename */
  filename: string
  /** Article title */
  title?: string
}

export interface WechatPublishOptions {
  /** Article title */
  title: string
  /** HTML content */
  html: string
  /** Cover image thumb_media_id (already uploaded to WeChat) */
  thumbMediaId?: string
  /** Article author */
  author?: string
  /** Article digest/summary */
  digest?: string
}

export interface WechatPublishResult {
  success: boolean
  message?: string
  publishId?: string
}

// ==================== Service ====================

export const exportService = {
  /**
   * Export article to WeChat-compatible HTML
   */
  async toWechat(
    executionId: string,
    options?: WechatExportOptions
  ): Promise<WechatExportResult> {
    const [execution] = await db
      .select()
      .from(taskExecutions)
      .where(eq(taskExecutions.id, executionId))
      .limit(1)
    if (!execution) throw new Error(`Execution not found: ${executionId}`)

    // Assemble markdown from chapters as single source of truth
    const chapters = await chapterService.getByExecutionId(executionId)
    const markdown = chapters.length > 0
      ? assembleChapterMarkdown(chapters)
      : execution.articleMarkdown
    if (!markdown) throw new Error("No article content found in execution")

    // Convert markdown to WeChat HTML
    const result = await markdownToWechatHtml(markdown, {
      stylePreset: options?.stylePreset ?? "default",
    })

    // Get cover URL from wechatMediaInfo (handle both single item and array)
    const mediaInfo = execution.wechatMediaInfo
    const mediaItems = Array.isArray(mediaInfo) ? mediaInfo : mediaInfo ? [mediaInfo] : []
    const coverUrl = mediaItems.slice(-1)[0]?.r2_url

    return {
      ...result,
      title: undefined, // Would need to join with tasks table to get topic
      coverUrl,
    }
  },

  /**
   * Export article as Markdown file
   */
  async toMarkdown(executionId: string): Promise<MarkdownExportResult> {
    const [execution] = await db
      .select()
      .from(taskExecutions)
      .where(eq(taskExecutions.id, executionId))
      .limit(1)
    if (!execution) throw new Error(`Execution not found: ${executionId}`)

    const chapters = await chapterService.getByExecutionId(executionId)
    const markdown = chapters.length > 0
      ? assembleChapterMarkdown(chapters)
      : execution.articleMarkdown
    if (!markdown) throw new Error("No article content found in execution")

    // Generate filename from execution ID and timestamp
    const timestamp = new Date().toISOString().slice(0, 10)
    const filename = `article-${timestamp}-${executionId.slice(0, 8)}.md`

    return {
      content: markdown,
      filename,
      title: undefined,
    }
  },

  /**
   * Get export options/capabilities for an execution
   */
  async getExportInfo(executionId: string): Promise<{
    hasContent: boolean
    hasCover: boolean
    wordCount: number
    imageCount: number
  }> {
    const [execution] = await db
      .select()
      .from(taskExecutions)
      .where(eq(taskExecutions.id, executionId))
      .limit(1)

    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`)
    }

    const chapters = await chapterService.getByExecutionId(executionId)
    const markdown = chapters.length > 0
      ? assembleChapterMarkdown(chapters)
      : (execution.articleMarkdown ?? "")
    const mediaInfo = execution.wechatMediaInfo
    const mediaItemsForCover = Array.isArray(mediaInfo) ? mediaInfo : mediaInfo ? [mediaInfo] : []
    const coverUrl = mediaItemsForCover.slice(-1)[0]?.r2_url

    // Count images in markdown
    const imageMatches = markdown.match(/!\[[^\]]*\]\([^)]+\)/g) ?? []

    // Count words (Chinese + English)
    const chineseCount = (markdown.match(/[\u4e00-\u9fff]/g) ?? []).length
    const englishCount = (markdown.match(/[a-zA-Z]+/g) ?? []).length

    return {
      hasContent: markdown.length > 0,
      hasCover: !!coverUrl,
      wordCount: chineseCount + englishCount,
      imageCount: imageMatches.length,
    }
  },

  /**
   * Publish article to WeChat Official Account via n8n webhook
   */
  async publishToWechat(options: WechatPublishOptions): Promise<WechatPublishResult> {
    const webhookUrl = env.N8N_WECHAT_PUBLISH_URL
    if (!webhookUrl) {
      throw new Error("N8N_WECHAT_PUBLISH_URL not configured")
    }

    // Construct WeChat article format
    const articles = [
      {
        title: options.title,
        author: options.author ?? "",
        digest: options.digest ?? "",
        content: options.html,
        thumb_media_id: options.thumbMediaId ?? "",
        // WeChat article options
        need_open_comment: 0,
        only_fans_can_comment: 0,
      },
    ]

    // Validate required fields
    if (!options.title || options.title.trim().length === 0) {
      return { success: false, message: "Title is required" }
    }
    if (!options.html || options.html.trim().length === 0) {
      return { success: false, message: "HTML content is required" }
    }
    if (!options.thumbMediaId || options.thumbMediaId.trim().length === 0) {
      return { success: false, message: "thumb_media_id is required (cover image must be uploaded to WeChat first)" }
    }

    // Log request details for debugging
    console.log("[publishToWechat] Request:", {
      title: options.title,
      author: options.author,
      digest: options.digest?.slice(0, 50) + "...",
      thumbMediaId: options.thumbMediaId,
      htmlLength: options.html.length,
      htmlPreview: options.html.slice(0, 200) + "...",
    })

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articles }),
      })

      const responseText = await response.text()
      console.log("[publishToWechat] Response:", response.status, responseText)

      if (!response.ok) {
        return {
          success: false,
          message: `Webhook failed: ${response.status} ${responseText}`,
        }
      }

      let result
      try {
        result = JSON.parse(responseText)
      } catch {
        result = { raw: responseText }
      }

      return {
        success: true,
        message: "Article published successfully",
        publishId: result.publish_id ?? result.publishId,
      }
    } catch (error) {
      return {
        success: false,
        message: `Publish failed: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },
}

export type ExportService = typeof exportService
