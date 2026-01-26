import type { A2UINode } from "../../../../../lib/a2ui"
import type { TaskWithMaterial } from "../../../../../server/services/task.service"

type SduiTasksMeta = {
  processingCount: number
  hasActiveTasks: boolean
}

type SduiTasksResponse = {
  nodes: A2UINode
  meta: SduiTasksMeta
}

export type AuthProvider = () => Promise<{ user?: { id?: string } } | null>
export type GetAllTasks = (options: { page: number; pageSize: number; search?: string; userId: string }) => Promise<{ tasks: TaskWithMaterial[] }>
export type BuildNodes = (options: { tasks: TaskWithMaterial[]; search: string; compact: boolean; viewingTaskId?: string; locale: "en" | "zh-CN" }) => Promise<SduiTasksResponse> | SduiTasksResponse

export let authProvider: AuthProvider = async () => {
  const authModule = await import("../../../../../lib/auth")
  return authModule.auth()
}

export let getAllTasks: GetAllTasks = async (options) => {
  const taskServiceModule = await import("../../../../../server/services/task.service")
  return taskServiceModule.taskService.getAll(options)
}

export let buildNodes: BuildNodes = async (options) => {
  const tasksBuilder = await import("../../../../../server/sdui/tasks-builder")
  return tasksBuilder.buildTasksSdui(options)
}

export function setSduiDependencies(overrides: Partial<{
  authProvider: AuthProvider
  getAllTasks: GetAllTasks
  buildNodes: BuildNodes
}>) {
  if (overrides.authProvider) authProvider = overrides.authProvider
  if (overrides.getAllTasks) getAllTasks = overrides.getAllTasks
  if (overrides.buildNodes) buildNodes = overrides.buildNodes
}
