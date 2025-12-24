import type { A2UIRowNode, A2UINode, A2UIColumnNode, A2UITextNode, A2UIButtonNode } from "./generated/types"

export interface DashboardHeaderOptions {
  title: string
  newTaskLabel: string
}

export function createDashboardHeaderA2UI(options: DashboardHeaderOptions): A2UIRowNode {
  const titleNode: A2UITextNode = {
    type: "text",
    text: options.title,
    variant: "h2",
    weight: "bold",
  }

  const buttonNode: A2UIButtonNode = {
    type: "button",
    text: options.newTaskLabel,
    variant: "primary",
    size: "md",
    onClick: { action: "newTask" },
  }

  return {
    type: "row",
    justify: "between",
    align: "center",
    style: { marginBottom: "1.5rem" },
    children: [titleNode, buttonNode],
  }
}

export interface DashboardPageOptions {
  header: DashboardHeaderOptions
  content: A2UINode
}

export function createDashboardPageA2UI(options: DashboardPageOptions): A2UIColumnNode {
  return {
    type: "column",
    gap: "0",
    children: [
      createDashboardHeaderA2UI(options.header),
      options.content,
    ],
  }
}
