import assert from "node:assert/strict"
import {
  XHS_IMAGE_JOB_STATUSES,
  isXhsImageJobCancellable,
  isXhsImageJobRetryable,
  toggleXhsImageJobStatus,
} from "../../src/lib/xhs-image-job-status"

assert.ok(XHS_IMAGE_JOB_STATUSES.includes("cancelled"))
assert.equal(isXhsImageJobCancellable("pending"), true)
assert.equal(isXhsImageJobCancellable("processing"), true)
assert.equal(isXhsImageJobCancellable("failed"), false)
assert.equal(isXhsImageJobRetryable("failed"), true)
assert.equal(isXhsImageJobRetryable("cancelled"), true)
assert.deepEqual(toggleXhsImageJobStatus([], "pending"), ["pending"])
assert.deepEqual(toggleXhsImageJobStatus(["pending"], "pending"), [])
