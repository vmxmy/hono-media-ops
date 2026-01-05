/**
 * Rehype plugin to highlight REVIEW comments in Markdown
 * Transforms <!-- REVIEW: description --> into visible highlighted elements
 */
import type { Root, Element, Comment } from "hast"
import { visit } from "unist-util-visit"

interface ReviewHighlightOptions {
  /** CSS class for the review highlight container */
  className?: string
  /** Whether to show the review description */
  showDescription?: boolean
}

const defaultOptions: ReviewHighlightOptions = {
  className: "review-highlight",
  showDescription: true,
}

/**
 * Creates a highlighted review marker element
 */
function createReviewElement(description: string, options: ReviewHighlightOptions): Element {
  const children: Element[] = [
    {
      type: "element",
      tagName: "span",
      properties: { className: ["review-highlight-icon"] },
      children: [{ type: "text", value: "⚠️" }],
    },
  ]

  if (options.showDescription && description) {
    children.push({
      type: "element",
      tagName: "span",
      properties: { className: ["review-highlight-text"] },
      children: [{ type: "text", value: description }],
    })
  }

  return {
    type: "element",
    tagName: "mark",
    properties: {
      className: [options.className ?? "review-highlight"],
      "data-review": description,
    },
    children,
  }
}

/**
 * Rehype plugin that transforms <!-- REVIEW: description --> comments
 * into visible highlighted marker elements
 */
export function rehypeReviewHighlight(userOptions?: ReviewHighlightOptions) {
  const options = { ...defaultOptions, ...userOptions }

  return (tree: Root) => {
    const nodesToReplace: Array<{
      parent: Element | Root
      index: number
      newNode: Element
    }> = []

    // First pass: collect all comment nodes to replace
    visit(tree, "comment", (node: Comment, index, parent) => {
      if (index === undefined || !parent) return

      const commentValue = node.value.trim()
      const reviewMatch = commentValue.match(/^REVIEW:\s*(.*)$/i)

      if (reviewMatch) {
        const description = reviewMatch[1]?.trim() ?? ""
        nodesToReplace.push({
          parent: parent as Element | Root,
          index,
          newNode: createReviewElement(description, options),
        })
      }
    })

    // Second pass: replace nodes (reverse order to maintain indices)
    for (let i = nodesToReplace.length - 1; i >= 0; i--) {
      const { parent, index, newNode } = nodesToReplace[i]!
      if ("children" in parent) {
        parent.children.splice(index, 1, newNode)
      }
    }
  }
}

export default rehypeReviewHighlight
