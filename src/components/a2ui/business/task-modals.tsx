"use client"

import type {
  A2UICreateTaskModalNode,
  A2UIReverseSubmitModalNode,
} from "@/lib/a2ui"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"
import { dispatchA2UIAction } from "@/lib/a2ui/registry"
import { CreateTaskModal } from "@/components/create-task-modal"
import { ReverseSubmitModal } from "@/components/reverse-submit-modal"

export function A2UICreateTaskModal({
  node,
  onAction,
}: A2UIComponentProps<A2UICreateTaskModalNode>) {
  if (!node.open) return null

  return (
    <CreateTaskModal
      isOpen={node.open}
      onClose={() => dispatchA2UIAction(onAction, node.onClose)}
      onSuccess={() => dispatchA2UIAction(onAction, node.onSuccess)}
      initialData={node.initialData as Record<string, string | undefined> | undefined}
      isRegenerate={node.isRegenerate}
    />
  )
}

export function A2UIReverseSubmitModal({
  node,
  onAction,
}: A2UIComponentProps<A2UIReverseSubmitModalNode>) {
  if (!node.open) return null

  return (
    <ReverseSubmitModal
      isOpen={node.open}
      onClose={() => dispatchA2UIAction(onAction, node.onClose)}
      onSuccess={() => dispatchA2UIAction(onAction, node.onSuccess)}
    />
  )
}
