import type { A2UIAction, A2UICardNode, A2UINode } from "@/lib/a2ui"

/**
 * Material Card Builder
 *
 * Creates elegant, consistent cards for displaying style analysis materials.
 * Follows a clear visual hierarchy:
 *
 * ┌─────────────────────────────────────────┐
 * │  [Status]                    [Actions]  │  ← Header zone
 * │                                         │
 * │  Title ↗                                │  ← Primary content
 * │  Style: xxx                             │  ← Secondary info
 * │                                         │
 * │  ┌─────┐ ┌─────┐ ┌─────┐               │  ← Metrics (optional)
 * │  │ 1.2k│ │ 45  │ │ 12% │               │
 * │  │words│ │para │ │ TTR │               │
 * │  └─────┘ └─────┘ └─────┘               │
 * │                                         │
 * │  [Type] [Archetype]        12/25 14:30 │  ← Footer zone
 * └─────────────────────────────────────────┘
 */

// ==================== Types ====================

export interface MaterialCardMetric {
  value: string | number
  label: string
  format?: "number" | "percent"
}

export interface MaterialCardBadge {
  text: string
  color?: "default" | "primary" | "success" | "warning" | "destructive" | "info" | "pending"
}

export interface MaterialCardAction {
  icon?: string
  text?: string
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline"
  action: A2UIAction
}

export interface MaterialCardConfig {
  id?: string

  // Content
  title: string
  titleHref?: string
  subtitle?: string
  status?: {
    text: string
    color: "success" | "warning" | "destructive" | "pending" | "info"
  }

  // Categorization
  badges?: MaterialCardBadge[]

  // Metrics (displayed as stat blocks)
  metrics?: MaterialCardMetric[]

  // Additional content (e.g., tabs, expanded details)
  extraContent?: A2UINode[]

  // Metadata
  timestamp?: string
  version?: string

  // Actions
  actions?: MaterialCardAction[]
  primaryAction?: MaterialCardAction
  headerAction?: MaterialCardAction // Single action in header area (e.g., expand button)

  // Interactions
  onClick?: A2UIAction
  selected?: boolean
  hoverable?: boolean

  // Layout
  compact?: boolean
}

// ==================== Spacing Constants ====================

const SPACING = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.25rem",
} as const

// ==================== Helper Functions ====================

function buildTitleNode(config: MaterialCardConfig): A2UINode {
  const titleStyle = {
    fontSize: config.compact ? "0.9375rem" : "1rem",
    fontWeight: 600,
    lineHeight: 1.4,
    wordBreak: "break-word" as const,
  }

  if (config.titleHref) {
    return {
      type: "link",
      text: config.title,
      href: config.titleHref,
      external: true,
      variant: "primary",
      style: titleStyle,
    }
  }

  return {
    type: "text",
    text: config.title,
    weight: "semibold",
    style: titleStyle,
  }
}

function buildStatusBadge(status: NonNullable<MaterialCardConfig["status"]>): A2UINode {
  return {
    type: "badge",
    text: status.text,
    color: status.color,
  }
}

function buildMetricBlock(metric: MaterialCardMetric): A2UINode {
  let displayValue = metric.value
  if (typeof metric.value === "number") {
    if (metric.format === "percent") {
      displayValue = `${(metric.value * 100).toFixed(1)}%`
    } else if (metric.value >= 1000) {
      displayValue = `${(metric.value / 1000).toFixed(1)}k`
    } else {
      displayValue = metric.value.toFixed(0)
    }
  }

  return {
    type: "column",
    gap: "0.125rem",
    style: {
      textAlign: "center",
      padding: `${SPACING.sm} ${SPACING.md}`,
      backgroundColor: "var(--muted)",
      borderRadius: "0.375rem",
      minWidth: "3.5rem",
    },
    children: [
      {
        type: "text",
        text: String(displayValue),
        weight: "semibold",
        style: { fontSize: "0.9375rem", lineHeight: 1.2 },
      },
      {
        type: "text",
        text: metric.label,
        variant: "caption",
        color: "muted",
        style: { fontSize: "0.6875rem" },
      },
    ],
  }
}

// Icon name to emoji mapping for icon-only buttons
const ICON_EMOJI: Record<string, string> = {
  copy: "📋",
  trash: "🗑️",
  edit: "✏️",
  refresh: "🔄",
  check: "✓",
  x: "✕",
  plus: "+",
  minus: "-",
}

function buildActionButton(action: MaterialCardAction, compact?: boolean): A2UINode {
  // Icon-only button - use emoji representation
  if (action.icon && !action.text) {
    const emoji = ICON_EMOJI[action.icon] ?? action.icon
    return {
      type: "button",
      text: emoji,
      variant: action.variant ?? "ghost",
      size: "sm",
      onClick: { ...action.action, stopPropagation: true },
      style: { padding: `${SPACING.xs} ${SPACING.sm}`, minWidth: "auto" },
    }
  }

  return {
    type: "button",
    text: action.text ?? "",
    variant: action.variant ?? "secondary",
    size: compact ? "sm" : "sm",
    onClick: { ...action.action, stopPropagation: true },
  }
}

// ==================== Main Builder ====================

export function buildMaterialCardNode(config: MaterialCardConfig): A2UICardNode {
  const children: A2UINode[] = []

  // ===== Header Zone: Status + Actions =====
  const headerLeft: A2UINode[] = []
  const headerRight: A2UINode[] = []

  if (config.status) {
    headerLeft.push(buildStatusBadge(config.status))
  }

  if (config.version) {
    headerLeft.push({
      type: "text",
      text: `v${config.version}`,
      variant: "caption",
      color: "muted",
      style: { fontSize: "0.6875rem" },
    })
  }

  if (config.actions?.length) {
    headerRight.push(
      ...config.actions.map((action) => buildActionButton(action, config.compact))
    )
  }

  if (headerLeft.length > 0 || headerRight.length > 0) {
    children.push({
      type: "row",
      justify: "between",
      align: "center",
      gap: SPACING.sm,
      children: [
        {
          type: "row",
          gap: SPACING.sm,
          align: "center",
          children: headerLeft.length > 0 ? headerLeft : [{ type: "spacer" }],
        },
        {
          type: "row",
          gap: SPACING.xs,
          align: "center",
          children: headerRight,
        },
      ],
    })
  }

  // ===== Primary Content: Title + Subtitle + Header Action =====
  const titleAndSubtitle: A2UINode[] = [buildTitleNode(config)]

  if (config.subtitle) {
    titleAndSubtitle.push({
      type: "text",
      text: config.subtitle,
      variant: "caption",
      color: "muted",
      style: { marginTop: SPACING.xs },
    })
  }

  const primaryContentChildren: A2UINode[] = [
    {
      type: "column",
      gap: "0",
      style: { flex: 1, minWidth: 0 },
      children: titleAndSubtitle,
    },
  ]

  // Add header action (e.g., expand button) next to title
  if (config.headerAction) {
    primaryContentChildren.push(buildActionButton(config.headerAction, config.compact))
  }

  children.push({
    type: "row",
    justify: "between",
    align: "start",
    gap: SPACING.md,
    style: { marginTop: headerLeft.length > 0 || headerRight.length > 0 ? SPACING.md : "0" },
    children: primaryContentChildren,
  })

  // ===== Metrics Zone =====
  if (config.metrics?.length) {
    children.push({
      type: "row",
      gap: SPACING.sm,
      wrap: true,
      style: { marginTop: SPACING.md },
      children: config.metrics.map((metric) => buildMetricBlock(metric)),
    })
  }

  // ===== Extra Content Zone (e.g., tabs) =====
  if (config.extraContent?.length) {
    children.push(...config.extraContent)
  }

  // ===== Footer Zone: Badges + Timestamp =====
  const footerLeft: A2UINode[] = []
  const footerRight: A2UINode[] = []

  if (config.badges?.length) {
    footerLeft.push({
      type: "row",
      gap: SPACING.xs,
      wrap: true,
      children: config.badges.map((badge) => ({
        type: "badge" as const,
        text: badge.text,
        color: badge.color ?? "default",
        style: { fontSize: "0.6875rem" },
      })),
    })
  }

  if (config.timestamp) {
    footerRight.push({
      type: "text",
      text: config.timestamp,
      variant: "caption",
      color: "muted",
      style: { fontSize: "0.6875rem", whiteSpace: "nowrap" },
    })
  }

  if (config.primaryAction) {
    footerRight.push(buildActionButton(config.primaryAction, config.compact))
  }

  if (footerLeft.length > 0 || footerRight.length > 0) {
    children.push({
      type: "row",
      justify: "between",
      align: "center",
      wrap: true,
      gap: SPACING.sm,
      style: { marginTop: SPACING.md },
      children: [
        footerLeft.length > 0
          ? { type: "row", gap: SPACING.sm, align: "center", children: footerLeft }
          : { type: "spacer" },
        footerRight.length > 0
          ? { type: "row", gap: SPACING.sm, align: "center", children: footerRight }
          : { type: "spacer" },
      ],
    })
  }

  // ===== Card Container =====
  const cardStyle: A2UICardNode["style"] = {
    padding: config.compact ? SPACING.md : SPACING.lg,
    ...(config.selected && {
      borderColor: "var(--primary)",
      borderWidth: "2px",
      backgroundColor: "color-mix(in srgb, var(--primary) 5%, transparent)",
    }),
  }

  return {
    type: "card",
    id: config.id,
    hoverable: config.hoverable ?? true,
    onClick: config.onClick,
    style: cardStyle,
    children: [
      {
        type: "column",
        gap: "0",
        children,
      },
    ],
  }
}

// ==================== Preset Configurations ====================

/**
 * Creates a material card for style analysis display
 */
export interface StyleAnalysisMaterial {
  id: string
  sourceTitle?: string | null
  sourceUrl?: string | null
  styleName?: string | null
  primaryType?: string | null
  archetype?: string | null
  status?: string | null
  version?: string | null
  wordCount?: number | null
  paraCount?: number | null
  avgSentLen?: number | null
  ttr?: number | null
  burstiness?: number | null
  createdAt?: Date | string
}

export interface BuildStyleAnalysisCardOptions {
  material: StyleAnalysisMaterial
  labels: {
    untitled: string
    styleName: string
    words: string
    paragraphs: string
    sentenceLength: string
    clone?: string
    delete?: string
    copyPrompt?: string
  }
  selected?: boolean
  compact?: boolean
  showMetrics?: boolean
  onClone?: A2UIAction
  onDelete?: A2UIAction
  onCopyPrompt?: A2UIAction
  onClick?: A2UIAction
}

export function buildStyleAnalysisCard(options: BuildStyleAnalysisCardOptions): A2UICardNode {
  const { material, labels, selected, compact, showMetrics = true } = options

  const title = material.sourceTitle || material.styleName || labels.untitled
  const subtitle =
    material.styleName && material.sourceTitle && material.styleName !== material.sourceTitle
      ? `${labels.styleName}: ${material.styleName}`
      : undefined

  // Build badges
  const badges: MaterialCardBadge[] = []
  if (material.primaryType) {
    badges.push({ text: material.primaryType.replace(/_/g, " ").toUpperCase(), color: "default" })
  }
  if (material.archetype) {
    badges.push({ text: material.archetype, color: "primary" })
  }

  // Build metrics
  const metrics: MaterialCardMetric[] = []
  if (showMetrics) {
    if (material.wordCount != null) {
      metrics.push({ value: material.wordCount, label: labels.words })
    }
    if (material.paraCount != null) {
      metrics.push({ value: material.paraCount, label: labels.paragraphs })
    }
    if (material.avgSentLen != null) {
      metrics.push({ value: material.avgSentLen, label: labels.sentenceLength })
    }
    if (material.ttr != null) {
      metrics.push({ value: material.ttr, label: "TTR", format: "percent" })
    }
  }

  // Build actions
  const actions: MaterialCardAction[] = []
  if (options.onCopyPrompt) {
    actions.push({ icon: "copy", action: options.onCopyPrompt, variant: "ghost" })
  }
  if (options.onDelete && labels.delete) {
    actions.push({ text: labels.delete, action: options.onDelete, variant: "destructive" })
  }

  // Status mapping
  let status: MaterialCardConfig["status"]
  if (material.status) {
    const statusMap: Record<string, MaterialCardConfig["status"]> = {
      SUCCESS: { text: material.status, color: "success" },
      FAILED: { text: material.status, color: "destructive" },
      PENDING: { text: material.status, color: "pending" },
    }
    status = statusMap[material.status] ?? { text: material.status, color: "info" }
  }

  // Timestamp
  const timestamp = material.createdAt
    ? new Date(material.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : undefined

  return buildMaterialCardNode({
    id: `material-${material.id}`,
    title,
    titleHref: material.sourceUrl ?? undefined,
    subtitle,
    status,
    version: material.version ?? undefined,
    badges,
    metrics: metrics.length > 0 ? metrics : undefined,
    timestamp,
    actions,
    primaryAction: options.onClone && labels.clone
      ? { text: labels.clone, action: options.onClone, variant: "primary" }
      : undefined,
    onClick: options.onClick,
    selected,
    hoverable: true,
    compact,
  })
}
