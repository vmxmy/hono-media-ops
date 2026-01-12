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

    // Get cover URL from wechatMediaInfo
    const coverUrl = execution.wechatMediaInfo?.r2_url

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
    const coverUrl = execution.wechatMediaInfo?.r2_url

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
}

export type ExportService = typeof exportService
