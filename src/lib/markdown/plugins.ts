/**
 * Unified Markdown plugin configuration
 * Shared between A2UIMarkdown and A2UIMarkdownEditor preview
 */
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeSlug from "rehype-slug"
import rehypeHighlight from "rehype-highlight"
import rehypeKatex from "rehype-katex"
import rehypeRaw from "rehype-raw"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import type { PluggableList } from "unified"

/**
 * Extended sanitize schema that allows:
 * - KaTeX elements (math rendering)
 * - Code highlighting classes
 * - Standard HTML elements
 */
const sanitizeSchema = {
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
  ],
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "className", "class", "style"],
    span: [...(defaultSchema.attributes?.["span"] ?? []), "aria-hidden"],
    math: ["xmlns", "display"],
    annotation: ["encoding"],
    code: [...(defaultSchema.attributes?.["code"] ?? []), "className", "class"],
    pre: [...(defaultSchema.attributes?.["pre"] ?? []), "className", "class"],
  },
}

/**
 * Remark plugins for Markdown parsing
 */
export const remarkPlugins: PluggableList = [remarkGfm, remarkMath]

/**
 * Rehype plugins for HTML transformation
 * Order matters: raw → sanitize → highlight → katex → slug
 */
export const rehypePlugins: PluggableList = [
  rehypeRaw,
  [rehypeSanitize, sanitizeSchema],
  rehypeHighlight,
  rehypeKatex,
  rehypeSlug,
]
