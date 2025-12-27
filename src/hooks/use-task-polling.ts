"use client"

import { useMemo } from "react"
import { api } from "@/trpc/react"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@/server/api/root"

// 从 router 推断任务类型
type RouterOutput = inferRouterOutputs<AppRouter>
type TasksGetAllOutput = RouterOutput["tasks"]["getAll"]

interface UseTaskPollingOptions {
  /** 轮询间隔（毫秒），默认 3000ms */
  pollingInterval?: number
  /** 页码 */
  page?: number
  /** 每页数量 */
  pageSize?: number
  /** 是否启用 */
  enabled?: boolean
}

interface TaskPollingResult {
  /** 任务数据 */
  data: TasksGetAllOutput | undefined
  /** 是否正在加载 */
  isLoading: boolean
  /** 是否正在轮询 */
  isPolling: boolean
  /** 正在处理的任务数量 */
  processingCount: number
  /** 是否有正在处理的任务 */
  hasProcessingTasks: boolean
  /** 手动刷新 */
  refetch: () => void
  /** tRPC utils */
  invalidate: () => void
}

/**
 * 智能任务轮询 Hook
 *
 * 只在有 processing 状态的任务时才开启轮询，
 * 所有任务完成后自动停止轮询以节省资源。
 *
 * @example
 * ```tsx
 * const { data, isPolling, processingCount } = useTaskPolling({
 *   pollingInterval: 3000,
 *   page: 1,
 *   pageSize: 20,
 * })
 * ```
 */
export function useTaskPolling(options: UseTaskPollingOptions = {}): TaskPollingResult {
  const {
    pollingInterval = 3000,
    page = 1,
    pageSize = 20,
    enabled = true,
  } = options

  const utils = api.useUtils()

  // 计算是否有正在处理的任务
  const { data, isLoading, refetch, error, isFetching } = api.tasks.getAll.useQuery(
    { page, pageSize },
    {
      enabled,
      // 动态设置 refetchInterval
      // 使用函数形式，可以根据上次查询结果决定是否继续轮询
      refetchInterval: (query) => {
        const tasks = query.state.data?.tasks
        if (!tasks) return false

        // 检查是否有 processing 或 pending 状态的任务
        const hasActiveTasks = tasks.some(
          (task) => task.status === "processing" || task.status === "pending"
        )

        // 有活跃任务时开启轮询，否则停止
        return hasActiveTasks ? pollingInterval : false
      },
      // 窗口聚焦时刷新（用户切回页面时立即更新状态）
      refetchOnWindowFocus: true,
    }
  )

  // 计算派生状态
  const { processingCount, hasProcessingTasks, isPolling } = useMemo(() => {
    const tasks = data?.tasks ?? []

    const processing = tasks.filter(
      (task) => task.status === "processing" || task.status === "pending"
    )

    return {
      processingCount: processing.length,
      hasProcessingTasks: processing.length > 0,
      isPolling: processing.length > 0 && !isLoading,
    }
  }, [data?.tasks, isLoading])

  const invalidate = () => {
    utils.tasks.getAll.invalidate()
  }

  return {
    data,
    isLoading,
    isPolling,
    processingCount,
    hasProcessingTasks,
    refetch,
    invalidate,
  }
}
