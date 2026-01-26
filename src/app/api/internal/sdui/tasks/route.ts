import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
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

type AuthProvider = () => Promise<{ user?: { id?: string } } | null>
type GetAllTasks = (options: { page: number; pageSize: number; search?: string; userId: string }) => Promise<{ tasks: TaskWithMaterial[] }>
type BuildNodes = (options: { tasks: TaskWithMaterial[]; search: string; compact: boolean; viewingTaskId?: string; locale: "en" | "zh-CN" }) => Promise<SduiTasksResponse> | SduiTasksResponse

let authProvider: AuthProvider = async () => {
  const authModule = await import("../../../../../lib/auth")
  return authModule.auth()
}

let getAllTasks: GetAllTasks = async (options) => {
  const taskServiceModule = await import("../../../../../server/services/task.service")
  return taskServiceModule.taskService.getAll(options)
}

let buildNodes: BuildNodes = async (options) => {
  const tasksBuilder = await import("../../../../../server/sdui/tasks-builder")
  return tasksBuilder.buildTasksSdui(options)
}

export function __setSduiDependencies(overrides: Partial<{
  authProvider: AuthProvider
  getAllTasks: GetAllTasks
  buildNodes: BuildNodes
}>) {
  if (overrides.authProvider) authProvider = overrides.authProvider
  if (overrides.getAllTasks) getAllTasks = overrides.getAllTasks
  if (overrides.buildNodes) buildNodes = overrides.buildNodes
}

export async function GET(request: NextRequest) {
  const session = await authProvider()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const page = Math.max(1, Number(params.get("page") ?? 1))
  const pageSize = Math.min(50, Math.max(1, Number(params.get("pageSize") ?? 20)))
  const search = params.get("search") ?? ""
  const compact = params.get("compact") === "true"
  const localeParam = params.get("locale")
  const locale = localeParam === "en" ? "en" : "zh-CN"
  const viewingTaskId = params.get("viewingTaskId") ?? undefined

  const result = await getAllTasks({
    page,
    pageSize,
    search: search || undefined,
    userId: session.user.id,
  })

  const sdui = await buildNodes({
    tasks: result.tasks,
    search,
    compact,
    viewingTaskId,
    locale,
  })

  return NextResponse.json(sdui)
}
