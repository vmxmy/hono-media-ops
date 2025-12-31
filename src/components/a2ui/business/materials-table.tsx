"use client"

import type { A2UIMaterialsTableNode } from "@/lib/a2ui"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"
import { dispatchA2UIAction } from "@/lib/a2ui/registry"
import { MaterialsTable, type StyleAnalysis } from "@/components/materials-table"

export function A2UIMaterialsTable({
  node,
  onAction,
}: A2UIComponentProps<A2UIMaterialsTableNode>) {
  const data = (node.data ?? []) as StyleAnalysis[]

  return (
    <MaterialsTable
      data={data}
      onClone={(id) => dispatchA2UIAction(onAction, node.onClone, [id])}
      onDelete={(id) => dispatchA2UIAction(onAction, node.onDelete, [id])}
      onViewDetail={(analysis) => dispatchA2UIAction(onAction, node.onViewDetail, [analysis.id])}
    />
  )
}
