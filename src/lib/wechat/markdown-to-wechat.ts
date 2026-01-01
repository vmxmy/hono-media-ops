/**
 * Markdown to WeChat-Compatible HTML Converter
 *
 * Converts Markdown to HTML with inline styles for WeChat Official Account.
 * WeChat editor restrictions:
 * - No <style> tags (all styles must be inline)
 * - No JavaScript
 * - Limited CSS property support
 * - Images must be from WeChat CDN or whitelisted domains
 */

import { unified, type Plugin } from "unified"
import remarkParse from "remark-parse"
import remarkGfm from "remark-gfm"
import remarkRehype from "remark-rehype"
import rehypeStringify from "rehype-stringify"
import { visit } from "unist-util-visit"
import type { Element, Root } from "hast"
import { getStylePreset, type StylePreset, type WechatStyles } from "./styles"

// ==================== Types ====================

export interface WechatHtmlOptions {
  /** Style preset to use (default: "default") */
  stylePreset?: StylePreset
  /** Custom styles to override preset */
  customStyles?: Partial<WechatStyles>
  /** Whether to wrap output in <section> (default: true) */
  wrapInSection?: boolean
}

export interface WechatHtmlResult {
  /** WeChat-compatible HTML */
  html: string
  /** Extracted image URLs */
  images: Array<{
    url: string
    alt?: string
    /** Whether image needs to be re-uploaded to WeChat */
    needsUpload: boolean
  }>
  /** Word count */
  wordCount: number
}

// ==================== Constants ====================

/**
 * WeChat CDN domains - images from these domains don't need re-upload
 */
const WECHAT_CDN_DOMAINS = [
  "mmbiz.qpic.cn",
  "mmbiz.qlogo.cn",
  "wx.qlogo.cn",
]

/**
 * Map of HTML elements to style keys
 */
const ELEMENT_STYLE_MAP: Record<string, keyof WechatStyles> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  p: "p",
  strong: "strong",
  b: "strong",
  em: "em",
  i: "em",
  del: "del",
  s: "del",
  a: "a",
  ul: "ul",
  ol: "ol",
  li: "li",
  code: "code",
  pre: "pre",
  blockquote: "blockquote",
  table: "table",
  th: "th",
  td: "td",
  hr: "hr",
  img: "img",
}

// ==================== Functions ====================

/**
 * Check if an image URL is from WeChat CDN
 */
function isWechatCdnUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return WECHAT_CDN_DOMAINS.some((domain) => urlObj.hostname.includes(domain))
  } catch {
    return false
  }
}

/**
 * Count Chinese and English words
 */
function countWords(text: string): number {
  // Count Chinese characters
  const chineseCount = (text.match(/[\u4e00-\u9fff]/g) ?? []).length
  // Count English words
  const englishCount = (text.match(/[a-zA-Z]+/g) ?? []).length
  return chineseCount + englishCount
}

/**
 * Create a rehype plugin to inject inline styles
 */
function rehypeWechatStyles(styles: WechatStyles): Plugin<[], Root> {
  return () => (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      const tagName = node.tagName.toLowerCase()
      const styleKey = ELEMENT_STYLE_MAP[tagName]

      if (styleKey && styles[styleKey]) {
        // Get existing style
        const existingStyle =
          (node.properties?.style as string) ?? ""

        // Merge with preset style
        const newStyle = existingStyle
          ? `${styles[styleKey]}; ${existingStyle}`
          : styles[styleKey]

        // Set style property
        node.properties = node.properties ?? {}
        node.properties.style = newStyle
      }

      // Special handling for code inside pre
      if (tagName === "pre") {
        visit(node, "element", (child: Element) => {
          if (child.tagName === "code") {
            // Remove code styles inside pre (pre handles everything)
            child.properties = child.properties ?? {}
            child.properties.style = "background: none; padding: 0; border-radius: 0;"
          }
        })
      }
    })
  }
}

/**
 * Create a rehype plugin to extract images
 */
function rehypeExtractImages(images: WechatHtmlResult["images"]): Plugin<[], Root> {
  return () => (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "img") {
        const src = node.properties?.src as string | undefined
        const alt = node.properties?.alt as string | undefined

        if (src) {
          images.push({
            url: src,
            alt,
            needsUpload: !isWechatCdnUrl(src),
          })
        }
      }
    })
  }
}

/**
 * Create a rehype plugin to remove unwanted elements
 */
function rehypeSanitizeForWechat(): Plugin<[], Root> {
  return () => (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      // Remove script, style, iframe, object, embed elements
      if (["script", "style", "iframe", "object", "embed"].includes(node.tagName)) {
        if (parent && typeof index === "number") {
          (parent as Element).children.splice(index, 1)
        }
      }

      // Remove event handlers and javascript: URLs
      if (node.properties) {
        for (const key of Object.keys(node.properties)) {
          if (key.startsWith("on") || key === "onclick") {
            delete node.properties[key]
          }
        }

        // Sanitize href
        const href = node.properties.href as string | undefined
        if (href?.startsWith("javascript:")) {
          node.properties.href = "#"
        }
      }
    })
  }
}

/**
 * Convert Markdown to WeChat-compatible HTML
 *
 * @param markdown - Markdown content to convert
 * @param options - Conversion options
 * @returns WeChat HTML result with images and word count
 *
 * @example
 * ```ts
 * const result = await markdownToWechatHtml(`
 * # Hello World
 *
 * This is a paragraph with **bold** and *italic* text.
 * `, { stylePreset: "elegant" })
 *
 * console.log(result.html)
 * ```
 */
export async function markdownToWechatHtml(
  markdown: string,
  options?: WechatHtmlOptions
): Promise<WechatHtmlResult> {
  const stylePreset = options?.stylePreset ?? "default"
  const wrapInSection = options?.wrapInSection ?? true

  // Merge preset styles with custom overrides
  const styles: WechatStyles = {
    ...getStylePreset(stylePreset),
    ...options?.customStyles,
  }

  // Collect images during processing
  const images: WechatHtmlResult["images"] = []

  // Create unified processor
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSanitizeForWechat())
    .use(rehypeWechatStyles(styles))
    .use(rehypeExtractImages(images))
    .use(rehypeStringify)

  // Process markdown
  const file = await processor.process(markdown)
  let html = String(file)

  // Wrap in section with article styles
  if (wrapInSection) {
    html = `<section style="${styles.article}">${html}</section>`
  }

  // Count words
  const wordCount = countWords(markdown)

  return {
    html,
    images,
    wordCount,
  }
}

/**
 * Synchronous version for client-side use
 */
export function markdownToWechatHtmlSync(
  markdown: string,
  options?: WechatHtmlOptions
): WechatHtmlResult {
  const stylePreset = options?.stylePreset ?? "default"
  const wrapInSection = options?.wrapInSection ?? true

  const styles: WechatStyles = {
    ...getStylePreset(stylePreset),
    ...options?.customStyles,
  }

  const images: WechatHtmlResult["images"] = []

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSanitizeForWechat())
    .use(rehypeWechatStyles(styles))
    .use(rehypeExtractImages(images))
    .use(rehypeStringify)

  const file = processor.processSync(markdown)
  let html = String(file)

  if (wrapInSection) {
    html = `<section style="${styles.article}">${html}</section>`
  }

  const wordCount = countWords(markdown)

  return {
    html,
    images,
    wordCount,
  }
}

/**
 * Copy HTML to clipboard
 * Works in browser environment only
 */
export async function copyHtmlToClipboard(html: string): Promise<boolean> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false
  }

  try {
    const clipboard = navigator.clipboard
    if (!clipboard) {
      return false
    }

    // Try using Clipboard API with HTML MIME type
    if (typeof ClipboardItem !== "undefined" && "write" in clipboard) {
      const blob = new Blob([html], { type: "text/html" })
      const item = new ClipboardItem({
        "text/html": blob,
        "text/plain": new Blob([html], { type: "text/plain" }),
      })
      await clipboard.write([item])
      return true
    }

    // Fallback: copy as plain text
    await clipboard.writeText(html)
    return true
  } catch (error) {
    console.error("Failed to copy to clipboard:", error)
    return false
  }
}
