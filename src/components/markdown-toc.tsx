"use client"

/**
 * Markdown Table of Contents Component
 *
 * Displays a navigable tree of headings extracted from Markdown content.
 * Features: click to scroll, active heading highlight, collapsible sections.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { extractToc, type TocItem } from "@/lib/markdown/extract-toc"
import { cn } from "@/lib/utils"

// ==================== Types ====================

export interface MarkdownTocProps {
  /** Markdown content to extract TOC from */
  markdown: string
  /** Currently active heading ID (for highlight) */
  activeId?: string
  /** Callback when a heading is clicked */
  onNavigate?: (id: string) => void
  /** Maximum heading depth to show (default: 3) */
  maxDepth?: number
  /** Whether sections are collapsible (default: true) */
  collapsible?: boolean
  /** CSS class for the container */
  className?: string
  /** Locale for labels */
  locale?: "en" | "zh-CN"
}

interface TocTreeItemProps {
  item: TocItem
  activeId?: string
  onNavigate?: (id: string) => void
  collapsible: boolean
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
  depth: number
}

// ==================== Constants ====================

const LABELS = {
  en: {
    tableOfContents: "Table of Contents",
    noHeadings: "No headings found",
  },
  "zh-CN": {
    tableOfContents: "目录",
    noHeadings: "暂无标题",
  },
}

// ==================== Components ====================

function TocTreeItem({
  item,
  activeId,
  onNavigate,
  collapsible,
  expandedIds,
  onToggleExpand,
  depth,
}: TocTreeItemProps) {
  const hasChildren = item.children.length > 0
  const isExpanded = expandedIds.has(item.id)
  const isActive = activeId === item.id

  // Indent based on heading level (not depth in tree)
  const paddingLeft = `${(item.level - 1) * 0.75}rem`

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      onNavigate?.(item.id)
    },
    [item.id, onNavigate]
  )

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onToggleExpand(item.id)
    },
    [item.id, onToggleExpand]
  )

  return (
    <li className="list-none">
      <div
        className={cn(
          "group flex items-center gap-1 py-1 text-sm cursor-pointer rounded transition-colors",
          "hover:bg-muted/50",
          isActive && "bg-muted text-foreground font-medium",
          !isActive && "text-muted-foreground"
        )}
        style={{ paddingLeft }}
      >
        {/* Expand/Collapse toggle for items with children */}
        {collapsible && hasChildren && (
          <button
            onClick={handleToggle}
            className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <svg
              className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-90")}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Spacer for items without children when collapsible */}
        {collapsible && !hasChildren && <span className="w-4" />}

        {/* Heading text */}
        <a
          href={`#${item.id}`}
          onClick={handleClick}
          className={cn(
            "flex-1 truncate py-0.5 px-1 rounded transition-colors",
            "hover:text-foreground"
          )}
          title={item.text}
        >
          {item.text}
        </a>
      </div>

      {/* Children */}
      {hasChildren && (!collapsible || isExpanded) && (
        <ul className="mt-0.5">
          {item.children.map((child) => (
            <TocTreeItem
              key={child.id}
              item={child}
              activeId={activeId}
              onNavigate={onNavigate}
              collapsible={collapsible}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export function MarkdownToc({
  markdown,
  activeId,
  onNavigate,
  maxDepth = 3,
  collapsible = true,
  className,
  locale = "en",
}: MarkdownTocProps) {
  const labels = LABELS[locale]

  // Extract TOC from markdown
  const tocItems = useMemo(() => extractToc(markdown, { maxDepth }), [markdown, maxDepth])

  // Track expanded items
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Initially expand all items
    const ids = new Set<string>()
    function addAllIds(items: TocItem[]) {
      for (const item of items) {
        ids.add(item.id)
        if (item.children.length > 0) {
          addAllIds(item.children)
        }
      }
    }
    addAllIds(tocItems)
    return ids
  })

  // Update expanded IDs when TOC changes
  useEffect(() => {
    const ids = new Set<string>()
    function addAllIds(items: TocItem[]) {
      for (const item of items) {
        ids.add(item.id)
        if (item.children.length > 0) {
          addAllIds(item.children)
        }
      }
    }
    addAllIds(tocItems)
    setExpandedIds(ids)
  }, [tocItems])

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Scroll active item into view
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeId && containerRef.current) {
      const activeElement = containerRef.current.querySelector(`[href="#${activeId}"]`)
      if (activeElement) {
        activeElement.scrollIntoView({ block: "nearest", behavior: "smooth" })
      }
    }
  }, [activeId])

  if (tocItems.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground p-4", className)}>
        {labels.noHeadings}
      </div>
    )
  }

  return (
    <nav
      ref={containerRef}
      className={cn("text-sm", className)}
      aria-label={labels.tableOfContents}
    >
      <div className="font-medium text-foreground mb-3 px-2">{labels.tableOfContents}</div>
      <ul className="space-y-0.5">
        {tocItems.map((item) => (
          <TocTreeItem
            key={item.id}
            item={item}
            activeId={activeId}
            onNavigate={onNavigate}
            collapsible={collapsible}
            expandedIds={expandedIds}
            onToggleExpand={handleToggleExpand}
            depth={0}
          />
        ))}
      </ul>
    </nav>
  )
}

// ==================== Hook for Active Heading ====================

export interface UseActiveHeadingOptions {
  /** Heading IDs to track */
  headingIds: string[]
  /** Root element to observe (default: document) */
  rootElement?: HTMLElement | null
  /** Offset from top (default: 100) */
  topOffset?: number
}

/**
 * Hook to track the currently visible heading
 */
export function useActiveHeading(options: UseActiveHeadingOptions): string | undefined {
  const { headingIds, rootElement, topOffset = 100 } = options
  const [activeId, setActiveId] = useState<string | undefined>()

  useEffect(() => {
    if (typeof window === "undefined" || headingIds.length === 0) return

    const root = rootElement ?? document

    const handleScroll = () => {
      // Find the first heading that's below the top offset
      for (const id of headingIds) {
        const element = root instanceof Document
          ? document.getElementById(id)
          : (root as HTMLElement).querySelector(`#${id}`)

        if (element) {
          const rect = element.getBoundingClientRect()
          if (rect.top >= topOffset) {
            // This heading is below the offset, so the previous one is active
            const index = headingIds.indexOf(id)
            if (index > 0) {
              setActiveId(headingIds[index - 1])
            } else {
              setActiveId(id)
            }
            return
          }
        }
      }

      // All headings are above the offset, so the last one is active
      if (headingIds.length > 0) {
        setActiveId(headingIds[headingIds.length - 1])
      }
    }

    // Initial check
    handleScroll()

    // Add scroll listener
    const scrollTarget = rootElement ?? window
    scrollTarget.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll)
    }
  }, [headingIds, rootElement, topOffset])

  return activeId
}
