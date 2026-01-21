export const buildXhsImageJobMetadata = (inputContent: string, promptId: string) => ({
  image_prompt_id: promptId,
  input_content: inputContent,
})

export const buildCancelJobUpdate = (updatedAt: Date, errorMessage: string = "用户取消") => ({
  status: "cancelled",
  errorMessage,
  updatedAt,
})

export const getRetryInputFromMetadata = (metadata: unknown) => {
  if (!metadata || typeof metadata !== "object") return null
  const record = metadata as Record<string, unknown>
  const promptId = record.image_prompt_id
  const inputContent = record.input_content

  if (typeof promptId !== "string" || typeof inputContent !== "string") return null
  if (!promptId || !inputContent) return null

  return { promptId, inputContent }
}
