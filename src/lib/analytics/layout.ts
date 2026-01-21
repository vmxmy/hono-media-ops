import type { A2UICardNode, A2UIColumnNode, A2UIContainerNode, A2UINode } from "@/lib/a2ui"

export const ANALYTICS_LAYOUT = {
  cardMinWidth: "280px",
  sectionGap: "1.5rem",
  cardGap: "1rem",
  contentGap: "0.5rem",
  chartHeight: {
    card: 280,
    trend: 300,
    compact: 200,
    bar: 250,
    heatmap: 280,
    scatter: 300,
    gauge: 200,
    treemap: 280,
  },
} as const

const GRID_CLASS = {
  two: "grid gap-4 md:grid-cols-2",
  three: "grid gap-4 md:grid-cols-2 xl:grid-cols-3",
  four: "grid gap-4 md:grid-cols-2 xl:grid-cols-4",
} as const

export function analyticsHeader(title: string, subtitle?: string): A2UIColumnNode {
  const children: A2UINode[] = [
    { type: "text", text: title, variant: "h1", weight: "bold" },
  ]

  if (subtitle) {
    children.push({ type: "text", text: subtitle, variant: "caption", color: "muted" })
  }

  return {
    type: "column",
    gap: "0.25rem",
    className: "min-w-0",
    children,
  }
}

export function analyticsGrid(
  children: A2UINode[],
  columns: keyof typeof GRID_CLASS = "two"
): A2UIContainerNode {
  return {
    type: "container",
    className: GRID_CLASS[columns],
    children,
  }
}

export function analyticsCard(card: A2UICardNode): A2UICardNode {
  const className = ["min-w-0 h-full", card.className].filter(Boolean).join(" ")
  return {
    ...card,
    className,
  }
}
