import { eq, inArray } from "drizzle-orm"
import { xhsImageJobs } from "@/server/db/schema"
import type { XhsImageJobStatus } from "@/lib/xhs-image-job-status"

export const buildXhsJobStatusCondition = (
  status?: XhsImageJobStatus | XhsImageJobStatus[]
) => {
  if (!status) return undefined
  if (Array.isArray(status)) {
    if (status.length === 0) return undefined
    return inArray(xhsImageJobs.status, status)
  }

  return eq(xhsImageJobs.status, status)
}
