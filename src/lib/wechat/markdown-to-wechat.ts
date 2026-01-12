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
import remarkRehype from "remark-rehype"
import rehypeStringify from "rehype-stringify"
import { visit } from "unist-util-visit"
import type { Element, Root } from "hast"
import { getStylePreset, type StylePreset, type WechatStyles } from "./styles"
import { remarkPlugins, rehypePluginsNoRaw } from "@/lib/markdown/engine"
import { KATEX_INLINE_RULES } from "@/lib/markdown/katex-inline-styles"

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
  mark: "mark",
  sup: "sup",
  sub: "sub",
  kbd: "kbd",
  table: "table",
  th: "th",
  td: "td",
  hr: "hr",
  img: "img",
}

/**
 * Callout configuration (GitHub Flavored Markdown style)
 */
const CALLOUT_CONFIG: Record<string, { icon: string; color: string; bgColor: string; borderColor: string }> = {
  NOTE: { icon: "ℹ️", color: "#1f2937", bgColor: "#f3f4f6", borderColor: "#d1d5db" },
  TIP: { icon: "💡", color: "#166534", bgColor: "#dcfce7", borderColor: "#86efac" },
  IMPORTANT: { icon: "✨", color: "#4338ca", bgColor: "#e0e7ff", borderColor: "#a5b4fc" },
  WARNING: { icon: "⚠️", color: "#9a3412", bgColor: "#ffedd5", borderColor: "#fdba74" },
  CAUTION: { icon: "🛑", color: "#991b1b", bgColor: "#fee2e2", borderColor: "#fca5a5" },
}

const CALLOUT_ALIASES: Record<string, string> = {
  INFO: "NOTE",
  SUCCESS: "TIP",
  DANGER: "CAUTION",
  ERROR: "CAUTION",
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
 * Create a rehype plugin to process callouts (admonitions)
 */
function rehypeWechatCallouts(styles: WechatStyles): Plugin<[], Root> {
  return () => (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "blockquote" || !parent || typeof index !== "number") return

      // Check first child paragraph
      const firstChild = node.children.find((c) => c.type === "element" && c.tagName === "p") as Element
      if (!firstChild || !firstChild.children || firstChild.children.length === 0) return

      // Check for [!TYPE] text node
      const firstTextNode = firstChild.children[0]
      if (firstTextNode.type !== "text" || !firstTextNode.value.trim().startsWith("[!")) return

      const match = firstTextNode.value.match(/^\[!([A-Z]+)\]/)
      if (!match) return

      const type = match[1]
      const configType = CALLOUT_ALIASES[type] || (CALLOUT_CONFIG[type] ? type : "NOTE")
      const config = CALLOUT_CONFIG[configType]

      // Remove the [!TYPE] marker
      firstTextNode.value = firstTextNode.value.replace(/^\[![A-Z]+\]\s*/, "")

      // Transform blockquote to div with callout styles
      node.tagName = "div"

      // Apply base style + color overrides
      const baseStyle = styles.callout || ""
      
      // Override colors if specific config exists, otherwise use base style
      // We explicitly set these to ensure the look matches the type
      const colorStyle = `background-color: ${config.bgColor}; border-color: ${config.borderColor}; color: ${config.color};`
      
      // If the style preset relies on border-left, we might need to adjust it
      // For simplicity, we append specific colors to the base style
      const existingStyle = (node.properties?.style as string) ?? ""
      node.properties = node.properties ?? {}
      node.properties.style = `${existingStyle} ${baseStyle}; ${colorStyle}`.replace(/;;/g, ";")

      // Insert icon at the beginning of the first paragraph
      firstChild.children.unshift({
        type: "text",
        value: `${config.icon} `
      })
    })
  }
}

/**
 * Create a rehype plugin to add image captions from alt text
 */
function rehypeWechatCaptions(styles: WechatStyles): Plugin<[], Root> {
  return () => (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "img" || !parent || typeof index !== "number") return

      const alt = node.properties?.alt as string
      if (!alt) return

      // Only add caption if style is defined
      if (!styles.figcaption) return

      // Create caption node
      const caption: Element = {
        type: "element",
        tagName: "span",
        properties: {
          style: styles.figcaption,
        },
        children: [{ type: "text", value: alt }],
      }

      // If inside paragraph, insert after image
      if ((parent as Element).tagName === "p") {
        // Insert <br> and caption after image
        parent.children.splice(index + 1, 0, 
          { type: "element", tagName: "br", properties: {}, children: [] },
          caption
        )
        // Skip visiting the new nodes
        return index + 3
      }
    })
  }
}

/**
 * Create a rehype plugin to inject inline styles
 */
function rehypeWechatStyles(styles: WechatStyles): Plugin<[], Root> {
  return () => (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      const tagName = node.tagName.toLowerCase()
      const styleKey = tagName === "mark" ? "mark" : ELEMENT_STYLE_MAP[tagName]

      if (styleKey && styles[styleKey]) {
        if (tagName === "mark") {
          node.tagName = "span"
        }

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
 * Create a rehype plugin to add KaTeX inline styles for WeChat
 */
function rehypeInlineKatexStyles(): Plugin<[], Root> {
  return () => (tree: Root) => {
    const getClassList = (node: Element): string[] => {
      const className = node.properties?.className ?? node.properties?.class
      if (Array.isArray(className)) return className.map(String)
      if (typeof className === "string") return className.split(/\s+/).filter(Boolean)
      return []
    }

    const applyRules = (node: Element, inKatex: boolean) => {
      const classList = getClassList(node)
      const isKatexRoot = classList.includes("katex") || classList.includes("katex-display")
      const nextInKatex = inKatex || isKatexRoot

      if (nextInKatex) {
        const matchedStyles: string[] = []
        for (const rule of KATEX_INLINE_RULES) {
          if (rule.requiresKatex && !nextInKatex) continue
          if (rule.tag && rule.tag !== node.tagName) continue
          if (rule.classes.length > 0 && !rule.classes.every((c) => classList.includes(c))) {
            continue
          }
          matchedStyles.push(rule.style)
        }

        if (matchedStyles.length > 0) {
          node.properties = node.properties ?? {}
          const existingStyle = (node.properties.style as string) ?? ""
          const inlineStyle = matchedStyles.join("; ")
          node.properties.style = existingStyle
            ? `${inlineStyle}; ${existingStyle}`
            : inlineStyle
        }
      }

      if (node.children) {
        for (const child of node.children) {
          if (child.type === "element") {
            applyRules(child, nextInKatex)
          }
        }
      }
    }

    for (const child of tree.children) {
      if (child.type === "element") {
        applyRules(child, false)
      }
    }
  }
}

/**
 * Create a rehype plugin to normalize GFM elements for WeChat
 */
function rehypeWechatGfm(styles: WechatStyles): Plugin<[], Root> {
  return () => (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (!parent || typeof index !== "number") return
      if (node.tagName !== "input") return

      const type = node.properties?.type as string | undefined
      if (type !== "checkbox") return

      const checked = Boolean(node.properties?.checked)
      const label = checked ? "☑" : "☐"

      const checkboxNode: Element = {
        type: "element",
        tagName: "span",
        properties: {
          style: styles.checkbox,
        },
        children: [{ type: "text", value: `${label} ` }],
      }

      parent.children.splice(index, 1, checkboxNode)
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
    .use(remarkPlugins as any)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSanitizeForWechat())
    .use(rehypePluginsNoRaw as any)
    .use(rehypeInlineKatexStyles())
    .use(rehypeWechatGfm(styles))
    .use(rehypeWechatCallouts(styles))
    .use(rehypeWechatCaptions(styles))
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
    .use(remarkPlugins as any)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSanitizeForWechat())
    .use(rehypePluginsNoRaw as any)
    .use(rehypeInlineKatexStyles())
    .use(rehypeWechatGfm(styles))
    .use(rehypeWechatCallouts(styles))
    .use(rehypeWechatCaptions(styles))
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
