/**
 * Remark plugin for horizontal sliding images
 * Syntax: <![alt1](url1),![alt2](url2),![alt3](url3)>
 *
 * Outputs WeChat-compatible HTML with inline styles for scrollable image gallery
 */
import { visit } from "unist-util-visit"
import type { Root, Paragraph, Html } from "mdast"
import type { Plugin } from "unified"

export interface SliderOptions {
  /**
   * Hint text for sliding
   * @default '<<< 左右滑动看更多 >>>'
   */
  hintText?: string
  /**
   * Whether to show the hint text
   * @default true
   */
  showHint?: boolean
}

/**
 * Parse slider syntax and extract images
 */
function parseSliderSyntax(text: string): Array<{ src: string; alt: string }> | null {
  // Match: <![alt1](url1),![alt2](url2)>
  const rule = /^<(!\[.*?\]\(.*?\)(?:,!\[.*?\]\(.*?\))*)>$/
  const match = text.match(rule)

  if (!match) return null

  const content = match[1]
  const imageMatches = content.match(/!\[(.*?)\]\((.*?)\)/g) ?? []

  if (imageMatches.length === 0) return null

  return imageMatches.map((img: string) => {
    const altMatch = img.match(/!\[(.*?)\]/)
    const srcMatch = img.match(/\]\((.*?)\)/)
    return {
      alt: altMatch?.[1] ?? "",
      src: srcMatch?.[1] ?? "",
    }
  })
}

/**
 * Generate WeChat-compatible slider HTML
 */
function generateSliderHtml(
  images: Array<{ src: string; alt: string }>,
  options: Required<SliderOptions>
): string {
  const imageHtml = images
    .map(
      (img) => `<section style="display: inline-block; width: 100%; margin-right: 0; vertical-align: top;">
  <img src="${img.src}" alt="${img.alt}" title="${img.alt}" style="width: 100%; height: auto; border-radius: 4px; vertical-align: top;"/>
  <p style="margin-top: 5px; font-size: 14px; color: #666; text-align: center; white-space: normal;">${img.alt}</p>
</section>`
    )
    .join("")

  const hintHtml = options.showHint
    ? `<p style="font-size: 14px; color: #999; text-align: center; margin-top: 5px;">${options.hintText}</p>`
    : ""

  return `<section class="slider-container" style="box-sizing: border-box; font-size: 16px;">
  <section data-role="outer" style="font-family: 微软雅黑; font-size: 16px;">
    <section data-role="paragraph" style="margin: 0px auto; box-sizing: border-box; width: 100%;">
      <section style="margin: 0px auto; text-align: center;">
        <section style="display: inline-block; width: 100%;">
          <section style="overflow-x: scroll; -webkit-overflow-scrolling: touch; white-space: nowrap; width: 100%; text-align: center;">
            ${imageHtml}
          </section>
        </section>
      </section>
    </section>
  </section>
  ${hintHtml}
</section>`
}

/**
 * Check if a paragraph node contains only slider syntax
 */
function isSliderParagraph(node: Paragraph): string | null {
  if (node.children.length !== 1) return null

  const child = node.children[0]
  if (child.type !== "text") return null

  const text = child.value.trim()
  if (!text.startsWith("<![") || !text.endsWith(">")) return null

  return text
}

/**
 * Remark plugin for slider images
 */
export const remarkSlider: Plugin<[SliderOptions?], Root> = (options = {}) => {
  const resolvedOptions: Required<SliderOptions> = {
    hintText: options.hintText ?? "<<< 左右滑动看更多 >>>",
    showHint: options.showHint ?? true,
  }

  return (tree: Root) => {
    visit(tree, "paragraph", (node, index, parent) => {
      if (!parent || index === undefined) return

      const text = isSliderParagraph(node)
      if (!text) return

      const images = parseSliderSyntax(text)
      if (!images || images.length === 0) return

      const html = generateSliderHtml(images, resolvedOptions)

      // Replace paragraph with HTML node
      const htmlNode: Html = {
        type: "html",
        value: html,
      }

      parent.children.splice(index, 1, htmlNode)
    })
  }
}

export default remarkSlider
