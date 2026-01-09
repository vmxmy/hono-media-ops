"use client"

import { useMemo, useState } from "react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UINode } from "@/lib/a2ui"

// StyleIdentityData for extracting archetype
interface StyleIdentityData {
  archetype?: string
  style_name?: string
}

// StyleAnalysis type - subset of full schema type for table display
export interface StyleAnalysis {
  id: string
  sourceTitle: string | null
  styleName: string | null
  primaryType: string | null
  wordCount: number | null
  metricsTtr: number | null
  metricsBurstiness: number | null
  styleIdentity: StyleIdentityData | null
  status: "PENDING" | "SUCCESS" | "FAILED"
  updatedAt: Date | null
}

interface MaterialsTableProps {
  data: StyleAnalysis[]
  onClone: (id: string) => void
  onDelete: (id: string) => void
  onViewDetail: (analysis: StyleAnalysis) => void
}

type SortKey = "sourceTitle" | "primaryType" | "archetype" | "wordCount" | "metricsTtr" | "updatedAt"

// Format relative time
function formatRelativeTime(date: Date | null): string {
  if (!date) return "-"
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "刚刚"
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  return new Date(date).toLocaleDateString()
}

function getSortValue(row: StyleAnalysis, key: SortKey): string | number {
  switch (key) {
    case "sourceTitle":
      return (row.styleName || row.sourceTitle || "").toLowerCase()
    case "primaryType":
      return (row.primaryType || "").toLowerCase()
    case "archetype":
      return (row.styleIdentity?.archetype || "").toLowerCase()
    case "wordCount":
      return row.wordCount ?? -1
    case "metricsTtr":
      return row.metricsTtr ?? -1
    case "updatedAt":
      return row.updatedAt ? new Date(row.updatedAt).getTime() : -1
  }
}

export function MaterialsTable({ data, onClone, onDelete, onViewDetail }: MaterialsTableProps) {
  const { t } = useI18n()
  const [sorting, setSorting] = useState<{ key: SortKey; direction: "asc" | "desc" } | null>(null)

  const sortedData = useMemo(() => {
    if (!sorting) return data
    const next = [...data]
    next.sort((a, b) => {
      const aVal = getSortValue(a, sorting.key)
      const bVal = getSortValue(b, sorting.key)
      if (aVal < bVal) return sorting.direction === "asc" ? -1 : 1
      if (aVal > bVal) return sorting.direction === "asc" ? 1 : -1
      return 0
    })
    return next
  }, [data, sorting])

  const gridTemplate =
    "minmax(160px, 2fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(80px, 0.8fr) minmax(80px, 0.8fr) minmax(120px, 1fr) minmax(140px, 1fr)"

  const handleAction = (action: string, args?: unknown[]) => {
    switch (action) {
      case "sort": {
        const key = args?.[0] as SortKey
        if (!key) return
        setSorting((prev) => {
          if (!prev || prev.key !== key) return { key, direction: "asc" }
          return { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        })
        break
      }
      case "view":
        {
          const target = data.find((item) => item.id === args?.[0])
          if (target) onViewDetail(target)
        }
        break
      case "clone":
        onClone(args?.[0] as string)
        break
      case "delete":
        onDelete(args?.[0] as string)
        break
    }
  }

  if (data.length === 0) {
    const emptyNode: A2UINode = {
      type: "card",
      hoverable: false,
      className: "p-8 text-center",
      children: [{ type: "text", text: t("reverse.noLogs"), color: "muted" }],
    }
    return <A2UIRenderer node={emptyNode} />
  }

  const headerLabels: Array<{ key?: SortKey; label: string }> = [
    { key: "sourceTitle", label: t("reverse.colTitle") },
    { key: "primaryType", label: t("reverse.colType") },
    { key: "archetype", label: t("reverse.colArchetype") },
    { key: "wordCount", label: t("reverse.colWordCount") },
    { key: "metricsTtr", label: t("reverse.colTtr") },
    { key: "updatedAt", label: t("reverse.colUpdated") },
    { label: t("reverse.colActions") },
  ]

  const headerNode: A2UINode = {
    type: "container",
    className: "grid gap-2 px-4 py-3 bg-[var(--ds-muted)] border-b border-[var(--ds-border)]",
    style: {
      gridTemplateColumns: gridTemplate,
    },
    children: headerLabels.map((col, idx) => {
      if (!col.key) {
        return { type: "text", text: col.label, variant: "caption", color: "muted", weight: "medium" } as A2UINode
      }
      const isActive = sorting?.key === col.key
      const arrow = isActive ? (sorting?.direction === "asc" ? " ↑" : " ↓") : ""
      return {
        type: "link",
        text: `${col.label}${arrow}`,
        variant: isActive ? "primary" : "muted",
        onClick: { action: "sort", args: [col.key] },
        className: "text-xs font-semibold uppercase tracking-wider",
      } as A2UINode
    }),
  }

  const rows: A2UINode[] = sortedData.map((row) => {
    const title = row.styleName || row.sourceTitle || t("reverse.untitled")
    const archetype = row.styleIdentity?.archetype
    const metricsTtr = row.metricsTtr
    return {
      type: "container",
      className: "grid gap-2 px-4 py-3 items-center border-b border-[var(--ds-border)]",
      style: {
        gridTemplateColumns: gridTemplate,
      },
      children: [
        {
          type: "link",
          text: title,
          variant: "default",
          onClick: { action: "view", args: [row.id] },
          className: "overflow-hidden text-ellipsis whitespace-nowrap",
        },
        row.primaryType
          ? { type: "badge", text: row.primaryType, color: "default" }
          : { type: "text", text: "-", color: "muted" },
        archetype
          ? { type: "badge", text: archetype, color: "primary" }
          : { type: "text", text: "-", color: "muted" },
        row.wordCount != null
          ? { type: "text", text: row.wordCount.toLocaleString(), variant: "body" }
          : { type: "text", text: "-", color: "muted" },
        metricsTtr != null
          ? { type: "text", text: `${(metricsTtr * 100).toFixed(1)}%`, variant: "body" }
          : { type: "text", text: "-", color: "muted" },
        { type: "text", text: formatRelativeTime(row.updatedAt), color: "muted" },
        {
          type: "row",
          gap: "0.5rem",
          children: [
            {
              type: "button",
              text: "复制",
              size: "sm",
              variant: "secondary",
              onClick: { action: "clone", args: [row.id] },
            },
            {
              type: "button",
              text: "删除",
              size: "sm",
              variant: "destructive",
              onClick: { action: "delete", args: [row.id] },
            },
          ],
        },
      ],
    }
  })

  const tableNode: A2UINode = {
    type: "container",
    className: "border border-[var(--ds-border)] rounded-xl overflow-hidden bg-[var(--ds-card)]",
    children: [headerNode, ...rows],
  }

  return <A2UIRenderer node={tableNode} onAction={handleAction} />
}
