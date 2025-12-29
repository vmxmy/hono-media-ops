"use client"

import { useState, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { useI18n } from "@/contexts/i18n-context"

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
  styleIdentityData: StyleIdentityData | null
  status: "PENDING" | "SUCCESS" | "FAILED"
  updatedAt: Date | null
}

interface MaterialsTableProps {
  data: StyleAnalysis[]
  onClone: (id: string) => void
  onDelete: (id: string) => void
  onViewDetail: (analysis: StyleAnalysis) => void
}

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

export function MaterialsTable({ data, onClone, onDelete, onViewDetail }: MaterialsTableProps) {
  const { t } = useI18n()
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = useMemo<ColumnDef<StyleAnalysis>[]>(
    () => [
      {
        accessorKey: "sourceTitle",
        header: () => t("reverse.colTitle"),
        cell: ({ row }) => {
          const title = row.original.styleName || row.original.sourceTitle || t("reverse.untitled")
          return (
            <button
              onClick={() => onViewDetail(row.original)}
              className="max-w-[200px] truncate text-left font-medium text-foreground hover:text-primary hover:underline"
              title={title}
            >
              {title}
            </button>
          )
        },
      },
      {
        accessorKey: "primaryType",
        header: () => t("reverse.colType"),
        cell: ({ getValue }) => {
          const value = getValue() as string | null
          if (!value) return <span className="text-muted-foreground">-</span>
          return (
            <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs">
              {value}
            </span>
          )
        },
      },
      {
        id: "archetype",
        accessorFn: (row) => row.styleIdentityData?.archetype,
        header: () => t("reverse.colArchetype"),
        cell: ({ getValue }) => {
          const value = getValue() as string | undefined
          if (!value) return <span className="text-muted-foreground">-</span>
          return (
            <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {value}
            </span>
          )
        },
      },
      {
        accessorKey: "wordCount",
        header: () => t("reverse.colWordCount"),
        cell: ({ getValue }) => {
          const value = getValue() as number | null
          if (value == null) return <span className="text-muted-foreground">-</span>
          return <span className="tabular-nums">{value.toLocaleString()}</span>
        },
      },
      {
        accessorKey: "metricsTtr",
        header: () => t("reverse.colTtr"),
        cell: ({ getValue }) => {
          const value = getValue() as number | null
          if (value == null) return <span className="text-muted-foreground">-</span>
          return <span className="tabular-nums">{(value * 100).toFixed(1)}%</span>
        },
      },
      {
        accessorKey: "updatedAt",
        header: () => t("reverse.colUpdated"),
        cell: ({ getValue }) => {
          const value = getValue() as Date | null
          return (
            <span className="text-muted-foreground">
              {formatRelativeTime(value)}
            </span>
          )
        },
      },
      {
        id: "actions",
        header: () => t("reverse.colActions"),
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onClone(row.original.id)}
              className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              title={t("reverse.cloneToTask")}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(row.original.id)}
              className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title={t("common.delete")}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ),
      },
    ],
    [t, onClone, onDelete, onViewDetail]
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-card p-8">
        <p className="text-muted-foreground">{t("reverse.noLogs")}</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full">
        <thead className="bg-muted/50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  style={{ width: header.id === "sourceTitle" ? "auto" : undefined }}
                >
                  {header.isPlaceholder ? null : (
                    <button
                      className={`flex items-center gap-1 ${
                        header.column.getCanSort() ? "cursor-pointer select-none hover:text-foreground" : ""
                      }`}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: " ↑",
                        desc: " ↓",
                      }[header.column.getIsSorted() as string] ?? null}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="transition-colors hover:bg-accent/50"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 text-sm">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
