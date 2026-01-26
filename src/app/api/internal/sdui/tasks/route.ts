import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { authProvider, getAllTasks, buildNodes } from "./dependencies"

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
