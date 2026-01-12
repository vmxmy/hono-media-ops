/**
 * Remark plugin for footnotes with deduplication
 * Syntax:
 *   Reference: [^1], [^note]
 *   Definition: [^1]: Footnote text here
 *
 * Features:
 *   - Auto-incremented indices
 *   - Deduplication (same footnote ID referenced multiple times)
 *   - Linked references and definitions
 *   - WeChat compatible styling
 */
import { visit } from "unist-util-visit"
import type { Root, Text, Paragraph, Html, Parent } from "mdast"
import type { Plugin } from "unified"

interface FootnoteEntry {
  index: number
  text: string
}

// State for tracking footnotes within a document
interface FootnoteState {
  definitions: Map<string, FootnoteEntry>
  references: Map<string, number[]> // Track reference positions
}

/**
 * Parse footnote definition from paragraph text
 * Returns null if not a footnote definition
 */
function parseFootnoteDefinition(
  text: string
): { id: string; content: string } | null {
  const match = text.match(/^\[\^([^\]]+)\]:\s*(.*)$/)
  if (match) {
    return {
      id: match[1],
      content: match[2].trim(),
    }
  }
  return null
}

/**
 * Find and replace footnote references in text
 */
function processFootnoteReferences(
  text: string,
  state: FootnoteState
): string | null {
  const pattern = /\[\^([^\]]+)\]/g
  let hasMatches = false
  let lastIndex = 0
  let result = ""

  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    const fnId = match[1]
    const entry = state.definitions.get(fnId)

    if (entry) {
      hasMatches = true
      // Add text before match
      result += text.slice(lastIndex, match.index)
      // Add footnote reference
      result += `<sup class="footnote-ref"><a href="#fn-def-${fnId}" id="fn-ref-${fnId}">[${entry.index}]</a></sup>`
      lastIndex = match.index + match[0].length
    }
  }

  if (!hasMatches) return null

  // Add remaining text
  result += text.slice(lastIndex)
  return result
}

/**
 * Generate footnote definitions HTML block
 */
function generateFootnotesSection(state: FootnoteState): string {
  if (state.definitions.size === 0) return ""

  const entries = Array.from(state.definitions.entries())
    .sort((a, b) => a[1].index - b[1].index)
    .map(([id, entry]) => {
      return `<div class="footnote-item" id="fn-def-${id}">
  <span class="footnote-index">${entry.index}.</span>
  <span class="footnote-content">${entry.text}</span>
  <a href="#fn-ref-${id}" class="footnote-backref" title="返回引用">↩</a>
</div>`
    })
    .join("\n")

  return `<section class="footnotes-section" style="font-size: 14px; color: #666; margin-top: 2em; padding-top: 1em; border-top: 1px solid #eee;">
<div class="footnotes-title" style="font-weight: bold; margin-bottom: 0.5em;">脚注</div>
${entries}
</section>`
}

/**
 * First pass: collect all footnote definitions
 */
function collectDefinitions(tree: Root, state: FootnoteState): void {
  visit(tree, "paragraph", (node: Paragraph) => {
    if (node.children.length !== 1) return
    const child = node.children[0]
    if (child.type !== "text") return

    const def = parseFootnoteDefinition(child.value)
    if (def && !state.definitions.has(def.id)) {
      state.definitions.set(def.id, {
        index: state.definitions.size + 1,
        text: def.content,
      })
    }
  })
}

/**
 * Second pass: process references and remove definitions
 */
function processTree(tree: Root, state: FootnoteState): void {
  // Process text nodes for references
  visit(tree, "text", (node: Text, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return

    const processed = processFootnoteReferences(node.value, state)
    if (processed) {
      const htmlNode: Html = {
        type: "html",
        value: processed,
      }
      parent.children.splice(index, 1, htmlNode)
    }
  })

  // Remove definition paragraphs (they will be rendered at the end)
  visit(tree, "paragraph", (node: Paragraph, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return

    if (node.children.length !== 1) return
    const child = node.children[0]
    if (child.type !== "text") return

    const def = parseFootnoteDefinition(child.value)
    if (def && state.definitions.has(def.id)) {
      // Remove this paragraph
      parent.children.splice(index, 1)
      return index // Return index to handle splice correctly
    }
  })

  // Add footnotes section at the end
  if (state.definitions.size > 0) {
    const footnotesHtml: Html = {
      type: "html",
      value: generateFootnotesSection(state),
    }
    tree.children.push(footnotesHtml)
  }
}

/**
 * Remark plugin for footnotes
 */
export const remarkFootnotes: Plugin<[], Root> = () => {
  return (tree: Root) => {
    const state: FootnoteState = {
      definitions: new Map(),
      references: new Map(),
    }

    // First pass: collect definitions
    collectDefinitions(tree, state)

    // Second pass: process references and clean up
    processTree(tree, state)
  }
}

export default remarkFootnotes
