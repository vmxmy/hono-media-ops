"use client"

import type { MouseEvent } from "react"
import NextImage from "next/image"
import * as LucideIcons from "lucide-react"
import type {
  A2UIImageNode,
  A2UIIconNode,
  A2UIDividerNode,
  A2UILinkNode,
} from "@/lib/a2ui"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"

export function A2UIImage({ node }: A2UIComponentProps<A2UIImageNode>) {
  const isExternal = node.src.startsWith("http://") || node.src.startsWith("https://")

  if (node.style?.aspectRatio) {
    return (
      <div
        style={{
          position: "relative",
          width: node.width ?? "100%",
          aspectRatio: node.style.aspectRatio,
          overflow: "hidden",
        }}
        className="rounded-md"
      >
        <NextImage
          src={node.src}
          alt={node.alt ?? ""}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          style={{ objectFit: (node.style?.objectFit as "cover" | "contain") ?? "cover" }}
          unoptimized={isExternal}
        />
      </div>
    )
  }

  if (node.width && node.height) {
    const width = typeof node.width === "string" ? parseInt(node.width) : node.width
    const height = typeof node.height === "string" ? parseInt(node.height) : node.height

    if (!isNaN(width) && !isNaN(height)) {
      return (
        <NextImage
          src={node.src}
          alt={node.alt ?? ""}
          width={width}
          height={height}
          style={node.style}
          className="rounded-md"
          unoptimized={isExternal}
        />
      )
    }
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={node.src}
      alt={node.alt ?? ""}
      style={{ width: node.width, height: node.height, ...node.style }}
      className="rounded-md"
      loading="lazy"
    />
  )
}

const iconMap: Record<string, LucideIcons.LucideIcon> = {
  eye: LucideIcons.Eye,
  "eye-off": LucideIcons.EyeOff,
  search: LucideIcons.Search,
  check: LucideIcons.Check,
  x: LucideIcons.X,
  plus: LucideIcons.Plus,
  minus: LucideIcons.Minus,
  edit: LucideIcons.Pencil,
  trash: LucideIcons.Trash2,
  copy: LucideIcons.Copy,
  link: LucideIcons.Link,
  "external-link": LucideIcons.ExternalLink,
  chevron_up: LucideIcons.ChevronUp,
  chevron_down: LucideIcons.ChevronDown,
  chevron_left: LucideIcons.ChevronLeft,
  chevron_right: LucideIcons.ChevronRight,
  arrow_up: LucideIcons.ArrowUp,
  arrow_down: LucideIcons.ArrowDown,
  refresh: LucideIcons.RefreshCw,
  loading: LucideIcons.Loader2,
  info: LucideIcons.Info,
  warning: LucideIcons.AlertTriangle,
  error: LucideIcons.AlertCircle,
  success: LucideIcons.CheckCircle,
  file: LucideIcons.File,
  folder: LucideIcons.Folder,
  settings: LucideIcons.Settings,
  user: LucideIcons.User,
  logout: LucideIcons.LogOut,
  menu: LucideIcons.Menu,
  sparkles: LucideIcons.Sparkles,
}

export function A2UIIcon({ node }: A2UIComponentProps<A2UIIconNode>) {
  const IconComponent = iconMap[node.name.toLowerCase()]

  if (IconComponent) {
    return (
      <IconComponent
        size={node.size ?? 16}
        color={node.color}
        style={node.style}
        className="inline-flex items-center justify-center"
      />
    )
  }

  return (
    <span
      style={{
        fontSize: node.size ?? 16,
        color: node.color,
        ...node.style,
      }}
      className="inline-flex items-center justify-center"
    >
      {node.name}
    </span>
  )
}

export function A2UIDivider({ node }: A2UIComponentProps<A2UIDividerNode>) {
  const isVertical = node.orientation === "vertical"

  return (
    <div
      className={isVertical ? "border-l border-border mx-2 h-full" : "border-t border-border my-2"}
      style={node.style}
    />
  )
}

export function A2UILink({ node, onAction }: A2UIComponentProps<A2UILinkNode>) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (node.onClick?.stopPropagation) {
      e.stopPropagation()
    }
    if (node.onClick) {
      onAction(node.onClick.action, node.onClick.args)
    }
  }

  const className = [
    "text-sm font-medium text-primary hover:underline",
    node.external ? "inline-flex items-center gap-1" : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <a
      href={node.href}
      target={node.external ? "_blank" : undefined}
      rel={node.external ? "noopener noreferrer" : undefined}
      onClick={handleClick}
      className={className}
      style={node.style}
    >
      {node.text}
      {node.external && <span className="text-xs">↗</span>}
    </a>
  )
}
