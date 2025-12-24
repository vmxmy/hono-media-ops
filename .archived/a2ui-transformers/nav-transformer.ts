// Navigation A2UI Transformer
// Converts navigation state into A2UI declarative JSON format

import type { A2UINavNode, A2UINode } from "./generated/types"

export interface NavLink {
  text: string
  href?: string
  active?: boolean
  onClick?: { action: string; args?: unknown[] }
}

export interface NavTransformOptions {
  brand?: string
  links: NavLink[]
  rightContent?: A2UINode[]
}

export function createNavA2UI(options: NavTransformOptions): A2UINavNode {
  const { brand, links, rightContent } = options

  const children: A2UINode[] = []

  // Add navigation links
  links.forEach((link) => {
    children.push({
      type: "nav-link",
      text: link.text,
      href: link.href,
      active: link.active,
      onClick: link.onClick,
    })
  })

  // Add spacer before right content
  if (rightContent && rightContent.length > 0) {
    children.push({
      type: "spacer",
    })
    children.push(...rightContent)
  }

  return {
    type: "nav",
    brand,
    children,
  }
}
