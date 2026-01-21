import assert from "node:assert/strict"
import {
  buildXhsImageJobMetadata,
  buildCancelJobUpdate,
  getRetryInputFromMetadata,
} from "../../src/server/services/xhs-image-metadata"

const metadata = buildXhsImageJobMetadata("测试内容", "prompt-1")
assert.equal(metadata.image_prompt_id, "prompt-1")
assert.equal(metadata.input_content, "测试内容")

assert.deepEqual(getRetryInputFromMetadata(metadata), {
  promptId: "prompt-1",
  inputContent: "测试内容",
})

const now = new Date("2026-01-01T00:00:00.000Z")
assert.deepEqual(buildCancelJobUpdate(now), {
  status: "cancelled",
  errorMessage: "用户取消",
  updatedAt: now,
})

assert.equal(getRetryInputFromMetadata({}), null)
