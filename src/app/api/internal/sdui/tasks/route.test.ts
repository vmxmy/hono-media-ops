import test from "node:test"
import assert from "node:assert/strict"
import { NextRequest } from "next/server"
import type { A2UINode } from "../../../../../lib/a2ui"

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/testdb"

const importDeps = async () => {
  const route = await import("./route")

  return {
    GET: route.GET,
    setDeps: route.__setSduiDependencies,
  }
}

test("GET returns 401 when unauthorized", async () => {
  const { GET, setDeps } = await importDeps()
  setDeps({
    authProvider: async () => null,
  })
  const request = new NextRequest("http://localhost:3000/api/internal/sdui/tasks")
  const response = await GET(request)

  assert.equal(response.status, 401)
})

test("GET returns nodes when authorized", async () => {
  const { GET, setDeps } = await importDeps()
  const sduiResponse = {
    nodes: { type: "column", children: [] } as A2UINode,
    meta: { processingCount: 0, hasActiveTasks: false },
  }
  setDeps({
    authProvider: async () => ({ user: { id: "user-1" } }),
    getAllTasks: async () => ({
      tasks: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    }),
    buildNodes: () => sduiResponse,
  })

  const request = new NextRequest("http://localhost:3000/api/internal/sdui/tasks?page=1&pageSize=20&search=&locale=en&compact=false")
  const response = await GET(request)
  const json = await response.json()

  assert.deepEqual(json, sduiResponse)
})
