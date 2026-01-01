/**
 * Table of Contents Extraction
 *
 * Extracts headings from Markdown content and builds a tree structure.
 * Uses the same slug algorithm as rehype-slug for ID generation.
 */

// ==================== Types ====================

export interface TocItem {
  /** Unique ID (slug) for the heading */
  id: string
  /** Heading text content */
  text: string
  /** Heading level (1-6) */
  level: number
  /** Child headings */
  children: TocItem[]
}

export interface ExtractTocOptions {
  /** Maximum heading depth to include (default: 3, meaning H1-H3) */
  maxDepth?: number
  /** Minimum heading level to include (default: 1) */
  minLevel?: number
}

// ==================== Constants ====================

const DEFAULT_MAX_DEPTH = 3
const DEFAULT_MIN_LEVEL = 1

// Heading regex: matches # through ###### at start of line
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/gm

// ==================== Functions ====================

/**
 * Generate a slug from heading text
 * Matches the behavior of rehype-slug
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Remove special characters except Chinese, alphanumeric, spaces, and hyphens
    .replace(/[^\w\u4e00-\u9fff\s-]/g, "")
    // Replace spaces with hyphens
    .replace(/\s+/g, "-")
    // Remove consecutive hyphens
    .replace(/-+/g, "-")
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, "")
}

/**
 * Extract headings from Markdown text
 */
function extractHeadings(
  markdown: string,
  options?: ExtractTocOptions
): Array<{ id: string; text: string; level: number }> {
  const maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH
  const minLevel = options?.minLevel ?? DEFAULT_MIN_LEVEL

  const headings: Array<{ id: string; text: string; level: number }> = []
  const slugCounts = new Map<string, number>()

  // Reset regex lastIndex
  HEADING_REGEX.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = HEADING_REGEX.exec(markdown)) !== null) {
    const [, hashes, rawText] = match
    if (!hashes || !rawText) continue

    const level = hashes.length

    // Filter by level range
    if (level < minLevel || level > maxDepth) continue

    // Clean up text (remove inline code, links, emphasis markers)
    const text = rawText
      .replace(/`[^`]+`/g, (m) => m.slice(1, -1)) // inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
      .replace(/[*_]+([^*_]+)[*_]+/g, "$1") // bold/italic
      .trim()

    // Generate unique slug
    let slug = generateSlug(text)
    const count = slugCounts.get(slug) ?? 0
    if (count > 0) {
      slug = `${slug}-${count}`
    }
    slugCounts.set(slug, count + 1)

    headings.push({ id: slug, text, level })
  }

  return headings
}

/**
 * Build a tree structure from flat headings
 */
function buildTree(headings: Array<{ id: string; text: string; level: number }>): TocItem[] {
  const root: TocItem[] = []
  const stack: { item: TocItem; level: number }[] = []

  for (const heading of headings) {
    const item: TocItem = {
      id: heading.id,
      text: heading.text,
      level: heading.level,
      children: [],
    }

    // Pop stack until we find a parent with lower level
    while (stack.length > 0 && stack[stack.length - 1]!.level >= heading.level) {
      stack.pop()
    }

    if (stack.length === 0) {
      // No parent, add to root
      root.push(item)
    } else {
      // Add as child of last item in stack
      stack[stack.length - 1]!.item.children.push(item)
    }

    // Push current item to stack
    stack.push({ item, level: heading.level })
  }

  return root
}

/**
 * Extract table of contents from Markdown content
 *
 * @param markdown - The Markdown content to extract TOC from
 * @param options - Extraction options
 * @returns Tree structure of headings
 *
 * @example
 * ```ts
 * const toc = extractToc(`
 * # Title
 * ## Section 1
 * ### Subsection 1.1
 * ## Section 2
 * `)
 *
 * // Result:
 * // [
 * //   {
 * //     id: "title",
 * //     text: "Title",
 * //     level: 1,
 * //     children: [
 * //       { id: "section-1", text: "Section 1", level: 2, children: [...] },
 * //       { id: "section-2", text: "Section 2", level: 2, children: [] }
 * //     ]
 * //   }
 * // ]
 * ```
 */
export function extractToc(markdown: string, options?: ExtractTocOptions): TocItem[] {
  const headings = extractHeadings(markdown, options)
  return buildTree(headings)
}

/**
 * Flatten TOC tree to a list
 */
export function flattenToc(items: TocItem[]): TocItem[] {
  const result: TocItem[] = []

  function traverse(items: TocItem[]) {
    for (const item of items) {
      result.push(item)
      if (item.children.length > 0) {
        traverse(item.children)
      }
    }
  }

  traverse(items)
  return result
}

/**
 * Get heading count by level
 */
export function countHeadingsByLevel(items: TocItem[]): Map<number, number> {
  const counts = new Map<number, number>()
  const flat = flattenToc(items)

  for (const item of flat) {
    counts.set(item.level, (counts.get(item.level) ?? 0) + 1)
  }

  return counts
}
