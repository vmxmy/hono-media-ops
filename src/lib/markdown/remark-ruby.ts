/**
 * Remark plugin for ruby (phonetic annotation) markup
 * Syntax:
 *   1. [文字]{注音}
 *   2. [文字]^(注音)
 *
 * Separators supported in annotations:
 *   - ・ (middle dot)
 *   - ． (fullwidth period)
 *   - 。 (Chinese period)
 *   - - (hyphen)
 *
 * Examples:
 *   [東京]{とう・きょう} → 東京 with とうきょう annotation split per character
 *   [漢字]^(かんじ) → 漢字 with かんじ annotation
 */
import { visit } from "unist-util-visit"
import type { Root, Text, Html, Parent } from "mdast"
import type { Plugin } from "unified"

// Regex patterns for ruby syntax
const RUBY_PATTERN_1 = /\[([^\]]+)\]\{([^}]+)\}/g // [文字]{注音}
const RUBY_PATTERN_2 = /\[([^\]]+)\]\^\(([^)]+)\)/g // [文字]^(注音)
const SEPARATOR_REGEX = /[・．。-]/g

interface RubyMatch {
  full: string
  text: string
  ruby: string
  format: "basic" | "basic-hat"
  index: number
}

/**
 * Find all ruby matches in text
 */
function findRubyMatches(text: string): RubyMatch[] {
  const matches: RubyMatch[] = []

  // Pattern 1: [文字]{注音}
  let match: RegExpExecArray | null
  const pattern1 = new RegExp(RUBY_PATTERN_1.source, "g")
  while ((match = pattern1.exec(text)) !== null) {
    matches.push({
      full: match[0],
      text: match[1].trim(),
      ruby: match[2].trim(),
      format: "basic",
      index: match.index,
    })
  }

  // Pattern 2: [文字]^(注音)
  const pattern2 = new RegExp(RUBY_PATTERN_2.source, "g")
  while ((match = pattern2.exec(text)) !== null) {
    matches.push({
      full: match[0],
      text: match[1].trim(),
      ruby: match[2].trim(),
      format: "basic-hat",
      index: match.index,
    })
  }

  // Sort by index to process in order
  return matches.sort((a, b) => a.index - b.index)
}

/**
 * Generate ruby HTML for a single match
 */
function generateRubyHtml(rubyMatch: RubyMatch): string {
  const { text, ruby, format } = rubyMatch

  // Check for separators in ruby text
  const hasSeparators = SEPARATOR_REGEX.test(ruby)

  if (hasSeparators) {
    // Reset lastIndex since we reuse the regex
    SEPARATOR_REGEX.lastIndex = 0

    const rubyParts = ruby.split(SEPARATOR_REGEX).filter((part) => part.trim() !== "")
    const textChars = [...text] // Use spread to handle Unicode correctly

    const result: string[] = []

    if (textChars.length >= rubyParts.length) {
      // Characters >= ruby parts: distribute chars to ruby parts
      let currentIndex = 0

      for (let i = 0; i < rubyParts.length; i++) {
        const rubyPart = rubyParts[i]
        const remainingChars = textChars.length - currentIndex
        const remainingParts = rubyParts.length - i

        // Calculate how many characters this part should cover
        let charCount = 1
        if (remainingParts === 1) {
          // Last part gets all remaining characters
          charCount = remainingChars
        }

        const currentText = textChars.slice(currentIndex, currentIndex + charCount).join("")

        result.push(
          `<ruby>${currentText}<rp>(</rp><rt>${rubyPart}</rt><rp>)</rp></ruby>`
        )

        currentIndex += charCount
      }

      // Handle remaining characters without ruby
      if (currentIndex < textChars.length) {
        result.push(textChars.slice(currentIndex).join(""))
      }
    } else {
      // Characters < ruby parts: one ruby per character
      for (let i = 0; i < textChars.length; i++) {
        const char = textChars[i]
        const rubyPart = rubyParts[i] ?? ""

        if (rubyPart) {
          result.push(
            `<ruby>${char}<rp>(</rp><rt>${rubyPart}</rt><rp>)</rp></ruby>`
          )
        } else {
          result.push(char)
        }
      }
    }

    return result.join("")
  }

  // Simple case: no separators
  return `<ruby>${text}<rp>(</rp><rt>${ruby}</rt><rp>)</rp></ruby>`
}

/**
 * Process text and replace ruby syntax with HTML
 */
function processText(text: string): string | null {
  const matches = findRubyMatches(text)

  if (matches.length === 0) return null

  let result = ""
  let lastIndex = 0

  for (const match of matches) {
    // Add text before this match
    if (match.index > lastIndex) {
      result += text.slice(lastIndex, match.index)
    }

    // Add ruby HTML
    result += generateRubyHtml(match)

    lastIndex = match.index + match.full.length
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    result += text.slice(lastIndex)
  }

  return result
}

/**
 * Remark plugin for ruby annotations
 */
export const remarkRuby: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent: Parent | undefined) => {
      if (!parent || index === undefined) return

      const processed = processText(node.value)
      if (!processed) return

      // Replace text node with HTML node
      const htmlNode: Html = {
        type: "html",
        value: processed,
      }

      parent.children.splice(index, 1, htmlNode)
    })
  }
}

export default remarkRuby
