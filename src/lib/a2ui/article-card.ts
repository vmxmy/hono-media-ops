import type { A2UIAction, A2UICardNode, A2UIColumnNode, A2UINode } from "@/lib/a2ui"

export type StandardCardConfig = {
  id?: string
  hoverable?: boolean
  onClick?: A2UIAction
  cover?: A2UINode | null
  header?: A2UINode[]
  body?: A2UINode[]
  footer?: A2UINode[]
  contentGap?: string
  contentPadding?: string
  contentStyle?: A2UIColumnNode["style"]
  cardStyle?: A2UICardNode["style"]
}

export function buildStandardCardNode(config: StandardCardConfig): A2UICardNode {
  const contentChildren: A2UINode[] = []

  if (config.header?.length) {
    contentChildren.push(...config.header)
  }

  if (config.body?.length) {
    contentChildren.push(...config.body)
  }

  if (config.footer?.length) {
    contentChildren.push({ type: "spacer", flex: true })
    contentChildren.push(...config.footer)
  }

  const contentNode: A2UIColumnNode = {
    type: "column",
    gap: config.contentGap ?? "0.75rem",
    style: {
      padding: config.contentPadding ?? "1.25rem",
      flex: 1,
      ...config.contentStyle,
    },
    children: contentChildren,
  }

  const children: A2UINode[] = []

  if (config.cover) {
    children.push(config.cover)
  }

  children.push(contentNode)

  return {
    type: "card",
    id: config.id,
    hoverable: config.hoverable,
    onClick: config.onClick,
    style: config.cardStyle,
    children,
  }
}
