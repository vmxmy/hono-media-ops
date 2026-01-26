import test from "node:test"
import assert from "node:assert/strict"
import { buildTasksSdui } from "../tasks-builder"
import type { TaskWithMaterial } from "../../services/task.service"

const makeTask = (overrides: Partial<TaskWithMaterial> = {}): TaskWithMaterial => ({
  id: "task-1",
  userId: "user-1",
  topic: "Test Topic",
  keywords: "alpha,beta",
  status: "completed",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-02T00:00:00Z"),
  deletedAt: null,
  totalWordCount: 1200,
  articleWordCount: 1100,
  articleTitle: "Test Title",
  articleSubtitle: null,
  coverPromptId: null,
  coverUrl: null,
  refMaterialId: null,
  currentChapter: null,
  totalChapters: null,
  refMaterial: null,
  ...overrides,
})

const flatten = (node: any): any[] => {
  if (!node) return []
  const children = Array.isArray(node.children) ? node.children : []
  return [node, ...children.flatMap((child: any) => flatten(child))]
}

test("buildTasksSdui builds cards with actions and metadata", () => {
  const coverUrl = "https://example.com/cover.png"
  const result = buildTasksSdui({
    tasks: [
      makeTask({
        coverUrl,
        refMaterial: {
          styleName: "Style",
          sourceTitle: "Source",
          sourceUrl: "https://example.com/source",
        },
      }),
    ],
    search: "",
    compact: false,
    viewingTaskId: undefined,
    locale: "en",
  })

  assert.equal(result.nodes.type, "column")
  assert.equal(result.meta.processingCount, 0)

  const nodes = flatten(result.nodes)
  const regenerate = nodes.find((node) => node?.onClick?.action === "regenerate")
  assert.ok(regenerate)
  assert.deepEqual(regenerate.onClick.args?.slice(0, 3), ["task-1", "Test Topic", "alpha,beta"])

  const coverImage = nodes.find((node) => node?.type === "image")
  assert.equal(coverImage?.src, coverUrl)

  const linkNode = nodes.find((node) => node?.type === "link")
  assert.equal(linkNode?.href, "https://example.com/source")

  const editable = nodes.filter((node) => node?.type === "editable-text")
  assert.ok(editable.length >= 1)
})

test("buildTasksSdui includes progress info and active meta", () => {
  const result = buildTasksSdui({
    tasks: [
      makeTask({
        id: "task-2",
        status: "processing",
        currentChapter: 1,
        totalChapters: 3,
      }),
    ],
    search: "",
    compact: false,
    viewingTaskId: undefined,
    locale: "en",
  })

  const nodes = flatten(result.nodes)
  const progress = nodes.find((node) => node?.type === "progress")
  assert.ok(progress)
  assert.equal(result.meta.processingCount, 1)
  assert.equal(result.meta.hasActiveTasks, true)
})

test("buildTasksSdui returns empty search state with clearSearch action", () => {
  const result = buildTasksSdui({
    tasks: [],
    search: "query",
    compact: false,
    viewingTaskId: undefined,
    locale: "en",
  })

  assert.equal(result.nodes.type, "card")
  const nodes = flatten(result.nodes)
  const clear = nodes.find((node) => node?.onClick?.action === "clearSearch")
  assert.ok(clear)
})
