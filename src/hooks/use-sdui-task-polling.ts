"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { A2UINode } from "../lib/a2ui"

type SduiTasksMeta = {
  processingCount: number
  hasActiveTasks: boolean
}

type SduiTasksResponse = {
  nodes: A2UINode
  meta: SduiTasksMeta
}

type SduiTaskPollingOptions = {
  page: number
  pageSize: number
  search: string
  locale: "en" | "zh-CN"
  compact: boolean
  viewingTaskId?: string
  enabled: boolean
  pollingInterval?: number
}

export function buildSduiTasksQuery(options: {
  page: number
  pageSize: number
  search: string
  locale: "en" | "zh-CN"
  compact: boolean
  viewingTaskId?: string
}) {
  const params = new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize),
    search: options.search,
    locale: options.locale,
    compact: String(options.compact),
  })

  if (options.viewingTaskId) {
    params.set("viewingTaskId", options.viewingTaskId)
  }

  return params.toString()
}

export function useSduiTaskPolling(options: SduiTaskPollingOptions) {
  const {
    page,
    pageSize,
    search,
    locale,
    compact,
    viewingTaskId,
    enabled,
    pollingInterval = 3000,
  } = options

  const [data, setData] = useState<SduiTasksResponse | null>(null)
  const [error, setError] = useState<{ message: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const queryString = useMemo(() => buildSduiTasksQuery({
    page,
    pageSize,
    search,
    locale,
    compact,
    viewingTaskId,
  }), [page, pageSize, search, locale, compact, viewingTaskId])

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/internal/sdui/tasks?${queryString}`)
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Request failed: ${response.status}`)
      }
      const json = await response.json() as SduiTasksResponse
      setData(json)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError({ message })
    }
  }, [queryString])

  useEffect(() => {
    if (!enabled) return
    setIsLoading(true)
    fetchData().finally(() => setIsLoading(false))
  }, [enabled, fetchData])

  const hasActiveTasks = data?.meta.hasActiveTasks ?? false

  useEffect(() => {
    if (!enabled || !hasActiveTasks) return
    const timer = setInterval(fetchData, pollingInterval)
    return () => clearInterval(timer)
  }, [enabled, hasActiveTasks, pollingInterval, fetchData])

  const processingCount = data?.meta.processingCount ?? 0
  const isPolling = hasActiveTasks && !isLoading

  return {
    data,
    isLoading,
    isPolling,
    processingCount,
    error,
    refetch: fetchData,
  }
}
