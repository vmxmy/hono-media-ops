"use client"

import type { A2UITextNode } from "@/lib/a2ui"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"

export function A2UIText({ node }: A2UIComponentProps<A2UITextNode>) {
  const variantClasses = {
    h1: "text-3xl font-bold",
    h2: "text-2xl font-bold",
    h3: "text-lg font-semibold",
    h4: "text-base font-semibold",
    body: "text-sm",
    caption: "text-xs",
    label: "text-sm font-medium",
  }

  const colorClasses = {
    foreground: "text-foreground",
    muted: "text-muted-foreground",
    primary: "text-primary",
    destructive: "text-destructive",
    success: "text-success",
  }

  const weightClasses = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  }

  const className = [
    variantClasses[node.variant ?? "body"],
    colorClasses[node.color ?? "foreground"],
    node.weight ? weightClasses[node.weight] : "",
  ]
    .filter(Boolean)
    .join(" ")

  const Tag =
    node.variant === "h1"
      ? "h1"
      : node.variant === "h2"
        ? "h2"
        : node.variant === "h3"
          ? "h3"
          : node.variant === "h4"
            ? "h4"
            : "span"

  return (
    <Tag className={className} style={node.style}>
      {node.text}
    </Tag>
  )
}
