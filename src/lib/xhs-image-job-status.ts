export const XHS_IMAGE_JOB_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
] as const

export type XhsImageJobStatus = typeof XHS_IMAGE_JOB_STATUSES[number]

export const isXhsImageJobCancellable = (status: XhsImageJobStatus) =>
  status === "pending" || status === "processing"

export const isXhsImageJobRetryable = (status: XhsImageJobStatus) =>
  status === "failed" || status === "cancelled"

export const toggleXhsImageJobStatus = (
  current: XhsImageJobStatus[],
  target: XhsImageJobStatus
) => (current.includes(target)
  ? current.filter(status => status !== target)
  : [...current, target])
