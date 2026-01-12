/**
 * Unified Markdown engine configuration
 * Shared across reader, editor preview, and export pipelines.
 */
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import { remarkMark } from "remark-mark-highlight"
import remarkEmoji from "remark-emoji"
import remarkBreaks from "remark-breaks"
import remarkSmartypants from "remark-smartypants"
import { remarkSlider } from "./remark-slider"
import { remarkRuby } from "./remark-ruby"
import { remarkFootnotes } from "./remark-footnotes"
import rehypeSlug from "rehype-slug"
import rehypeHighlight from "rehype-highlight"
import rehypeKatex from "rehype-katex"
import rehypeRaw from "rehype-raw"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import { rehypeReviewHighlight } from "./rehype-review-highlight"
import { rehypePlantUML } from "./rehype-plantuml"
import type { PluggableList } from "unified"

/**
 * Extended sanitize schema that allows:
 * - KaTeX elements (math rendering)
 * - Code highlighting classes
 * - Standard HTML elements
 */
export const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    // KaTeX elements
    "math",
    "semantics",
    "mrow",
    "mi",
    "mo",
    "mn",
    "msup",
    "msub",
    "mfrac",
    "mover",
    "munder",
    "msqrt",
    "mroot",
    "mtable",
    "mtr",
    "mtd",
    "mtext",
    "annotation",
    // KaTeX wrapper elements
    "span",
    "div",
    // Review highlight element
    "mark",
    // Slider elements (WeChat compatible)
    "section",
    // Ruby annotation elements
    "ruby",
    "rt",
    "rp",
  ],
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "className", "class", "style"],
    span: [...(defaultSchema.attributes?.["span"] ?? []), "aria-hidden"],
    math: ["xmlns", "display"],
    annotation: ["encoding"],
    code: [...(defaultSchema.attributes?.["code"] ?? []), "className", "class"],
    pre: [...(defaultSchema.attributes?.["pre"] ?? []), "className", "class"],
    mark: ["data-review", "className", "class"],
    img: [...(defaultSchema.attributes?.["img"] ?? []), "loading", "alt", "src", "style", "title"],
    div: [...(defaultSchema.attributes?.["div"] ?? []), "data-plantuml-url", "className", "class", "style"],
    section: ["data-role", "className", "class", "style"],
  },
}

/**
 * Remark plugins for Markdown parsing
 */
export const remarkPlugins: PluggableList = [
  remarkGfm,
  remarkMath,
  remarkMark,
  remarkEmoji,
  remarkBreaks,
  remarkSmartypants,
  remarkSlider,
  remarkRuby,
  remarkFootnotes,
]

/**
 * Rehype plugins for HTML transformation
 * Order matters: raw → review → sanitize → plantuml → highlight → katex → slug
 */
export const rehypePlugins: PluggableList = [
  rehypeRaw,
  rehypeReviewHighlight,
  [rehypeSanitize, sanitizeSchema],
  rehypePlantUML,
  rehypeHighlight,
  rehypeKatex,
  rehypeSlug,
]

/**
 * Rehype plugins without raw HTML handling (for stricter renderers)
 */
export const rehypePluginsNoRaw: PluggableList = [
  rehypeReviewHighlight,
  rehypePlantUML,
  rehypeHighlight,
  rehypeKatex,
  rehypeSlug,
]
