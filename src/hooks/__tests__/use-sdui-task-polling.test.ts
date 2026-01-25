import test from "node:test"
import assert from "node:assert/strict"
import { buildSduiTasksQuery } from "../use-sdui-task-polling"

test("buildSduiTasksQuery includes expected parameters", () => {
  const query = buildSduiTasksQuery({
    page: 2,
    pageSize: 50,
    search: "keyword",
    locale: "en",
    compact: true,
    viewingTaskId: "task-1",
  })

  const params = new URLSearchParams(query)

  assert.equal(params.get("page"), "2")
  assert.equal(params.get("pageSize"), "50")
  assert.equal(params.get("search"), "keyword")
  assert.equal(params.get("locale"), "en")
  assert.equal(params.get("compact"), "true")
  assert.equal(params.get("viewingTaskId"), "task-1")
})
