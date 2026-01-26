import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  getXhsPublishStatusConfig,
  getXhsPublishMetaItems,
} from "../../src/lib/xhs-publish-status"

const published = getXhsPublishStatusConfig("published")
assert.equal(published.labelKey, "xhsImages.publishStatusPublished")
assert.equal(published.color, "success")

const fallback = getXhsPublishStatusConfig(undefined)
assert.equal(fallback.labelKey, "xhsImages.publishStatusNotPublished")
assert.equal(fallback.color, "default")

const items = getXhsPublishMetaItems({
  status: "failed",
  publishErrorMessage: "发布失败",
  publishedAt: new Date("2026-01-26T00:00:00Z"),
  xhsNoteId: "note-123",
  formatDate: (value) => value.toISOString().slice(0, 10),
})
assert.deepEqual(items, [
  { labelKey: "xhsImages.publishError", value: "发布失败", color: "destructive" },
  { labelKey: "xhsImages.publishedAt", value: "2026-01-26", color: "muted" },
  { labelKey: "xhsImages.xhsNoteId", value: "note-123", color: "muted" },
])

const zhCNPath = new URL("../../src/locales/zh-CN.json", import.meta.url)
const enPath = new URL("../../src/locales/en.json", import.meta.url)
const zhCNMessages = JSON.parse(readFileSync(zhCNPath, "utf8")) as Record<string, string>
const enMessages = JSON.parse(readFileSync(enPath, "utf8")) as Record<string, string>

const publishKeys = [
  "xhsImages.publishStatusNotPublished",
  "xhsImages.publishStatusPublishing",
  "xhsImages.publishStatusPublished",
  "xhsImages.publishStatusFailed",
  "xhsImages.publishedAt",
  "xhsImages.publishError",
  "xhsImages.xhsNoteId",
]

for (const key of publishKeys) {
  assert.ok(zhCNMessages[key], `Missing zh-CN key: ${key}`)
  assert.ok(enMessages[key], `Missing en key: ${key}`)
}
