import assert from "node:assert/strict"
import { xhsImageService } from "../../src/server/services/xhs-image.service"

assert.equal(typeof xhsImageService.cancelJob, "function")
assert.equal(typeof xhsImageService.retryJob, "function")
