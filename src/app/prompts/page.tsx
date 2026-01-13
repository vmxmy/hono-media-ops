"use client"

import { useState, useCallback, useMemo } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UIAppShellNode, A2UIColumnNode, A2UICardNode, A2UINode, A2UIRowNode } from "@/lib/a2ui"
import { showConfirmToast } from "@/lib/a2ui"
import { buildNavItems } from "@/lib/navigation"

interface ImagePromptFormData {
  title: string
  prompt: string
  negativePrompt: string
  model: string
  ratio: string
  resolution: string
  category: string
  tags: string
  isPublic: boolean
}

const DEFAULT_FORM: ImagePromptFormData = {
  title: "",
  prompt: "",
  negativePrompt: "",
  model: "jimeng-4.5",
  ratio: "1:1",
  resolution: "2k",
  category: "general",
  tags: "",
  isPublic: false,
}

export default function ImagePromptsPage() {
  const { t } = useI18n()

  // Build options with i18n translations
  const MODEL_OPTIONS = useMemo(() => [
    { value: "jimeng-4.5", label: t("imagePrompts.model.jimeng45") },
    { value: "jimeng-4.0", label: t("imagePrompts.model.jimeng40") },
    { value: "jimeng-3.1", label: t("imagePrompts.model.jimeng31") },
    { value: "nanobanana", label: t("imagePrompts.model.nanobanana") },
  ], [t])

  const RATIO_OPTIONS = useMemo(() => [
    { value: "1:1", label: t("imagePrompts.ratio.square") },
    { value: "16:9", label: t("imagePrompts.ratio.landscape") },
    { value: "9:16", label: t("imagePrompts.ratio.portrait") },
    { value: "4:3", label: t("imagePrompts.ratio.4_3") },
    { value: "3:4", label: t("imagePrompts.ratio.3_4") },
    { value: "21:9", label: t("imagePrompts.ratio.ultrawide") },
  ], [t])

  const RESOLUTION_OPTIONS = useMemo(() => [
    { value: "1k", label: t("imagePrompts.resolution.1k") },
    { value: "2k", label: t("imagePrompts.resolution.2k") },
    { value: "4k", label: t("imagePrompts.resolution.4k") },
  ], [t])

  const CATEGORY_OPTIONS = useMemo(() => [
    { value: "general", label: t("imagePrompts.category.general") },
    { value: "cover", label: t("imagePrompts.category.cover") },
    { value: "portrait", label: t("imagePrompts.category.portrait") },
    { value: "landscape", label: t("imagePrompts.category.landscape") },
    { value: "product", label: t("imagePrompts.category.product") },
    { value: "abstract", label: t("imagePrompts.category.abstract") },
  ], [t])
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const mounted = status !== "loading"
  const navItems = buildNavItems(t)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<ImagePromptFormData>(DEFAULT_FORM)
  const [activePromptId, setActivePromptId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setEditingId(null)
    setFormData(DEFAULT_FORM)
  }, [])

  const utils = api.useUtils()
  const { data: promptsData, isLoading } = api.imagePrompts.getAll.useQuery(
    {
      page,
      pageSize: 20,
      category: categoryFilter || undefined,
      search: searchQuery || undefined,
    },
    { enabled: mounted }
  )

  const createMutation = api.imagePrompts.create.useMutation({
    onSuccess: () => {
      utils.imagePrompts.getAll.invalidate()
      resetForm()
    },
  })

  const updateMutation = api.imagePrompts.update.useMutation({
    onSuccess: () => {
      utils.imagePrompts.getAll.invalidate()
      resetForm()
    },
  })

  const deleteMutation = api.imagePrompts.delete.useMutation({
    onSuccess: () => {
      utils.imagePrompts.getAll.invalidate()
    },
  })

  const togglePublicMutation = api.imagePrompts.togglePublic.useMutation({
    onSuccess: () => {
      utils.imagePrompts.getAll.invalidate()
    },
  })

  const handleAction = useCallback(
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "navigate": {
          const href = args?.[0] as string
          if (href) router.push(href)
          break
        }
        case "logout":
          signOut({ callbackUrl: "/login" })
          break
        case "setTitle":
          setFormData((prev) => ({ ...prev, title: args?.[0] as string }))
          break
        case "setPrompt":
          setFormData((prev) => ({ ...prev, prompt: args?.[0] as string }))
          break
        case "setNegativePrompt":
          setFormData((prev) => ({ ...prev, negativePrompt: args?.[0] as string }))
          break
        case "setModel":
          setFormData((prev) => ({ ...prev, model: args?.[0] as string }))
          break
        case "setRatio":
          setFormData((prev) => ({ ...prev, ratio: args?.[0] as string }))
          break
        case "setResolution":
          setFormData((prev) => ({ ...prev, resolution: args?.[0] as string }))
          break
        case "setCategory":
          setFormData((prev) => ({ ...prev, category: args?.[0] as string }))
          break
        case "setTags":
          setFormData((prev) => ({ ...prev, tags: args?.[0] as string }))
          break
        case "setIsPublic":
          setFormData((prev) => ({ ...prev, isPublic: args?.[0] as boolean }))
          break
        case "submitForm": {
          const tags = formData.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)

          if (editingId) {
            updateMutation.mutate({
              id: editingId,
              title: formData.title,
              prompt: formData.prompt,
              negativePrompt: formData.negativePrompt || undefined,
              model: formData.model,
              ratio: formData.ratio,
              resolution: formData.resolution,
              category: formData.category,
              tags: tags.length > 0 ? tags : undefined,
              isPublic: formData.isPublic,
            })
          } else {
            createMutation.mutate({
              title: formData.title,
              prompt: formData.prompt,
              negativePrompt: formData.negativePrompt || undefined,
              model: formData.model,
              ratio: formData.ratio,
              resolution: formData.resolution,
              category: formData.category,
              tags: tags.length > 0 ? tags : undefined,
              isPublic: formData.isPublic,
            })
          }
          break
        }
        case "resetForm":
          setEditingId(null)
          setFormData(DEFAULT_FORM)
          break
        case "openDetail": {
          const id = args?.[0] as string
          setActivePromptId(id)
          break
        }
        case "closeDetail":
          setActivePromptId(null)
          break
        case "noop":
          break
        case "edit": {
          const id = args?.[0] as string
          const prompt = promptsData?.items.find((p) => p.id === id)
          if (prompt) {
            setEditingId(prompt.id)
            setActivePromptId(prompt.id)
            setFormData({
              title: prompt.title,
              prompt: prompt.prompt,
              negativePrompt: prompt.negativePrompt ?? "",
              model: prompt.model ?? "jimeng-4.5",
              ratio: prompt.ratio ?? "1:1",
              resolution: prompt.resolution ?? "2k",
              category: prompt.category ?? "general",
              tags: prompt.tags?.join(", ") ?? "",
              isPublic: prompt.isPublic === 1,
            })
          }
          break
        }
        case "delete": {
          const id = args?.[0] as string
          showConfirmToast(t("imagePrompts.deleteConfirm"), () => deleteMutation.mutate({ id }), {
            label: t("common.confirm"),
          })
          break
        }
        case "togglePublic": {
          const id = args?.[0] as string
          togglePublicMutation.mutate({ id })
          break
        }
        case "copy": {
          const id = args?.[0] as string
          const prompt = promptsData?.items.find((p) => p.id === id)
          if (prompt) {
            navigator.clipboard.writeText(prompt.prompt)
            setCopiedId(id)
            setTimeout(() => setCopiedId(null), 2000)
          }
          break
        }
        case "setCategoryFilter":
          setCategoryFilter(args?.[0] as string)
          setPage(1)
          break
        case "setSearchQuery":
          setSearchQuery(args?.[0] as string)
          setPage(1)
          break
        case "prevPage":
          setPage((p) => Math.max(1, p - 1))
          break
        case "nextPage":
          if (promptsData && page < Math.ceil(promptsData.total / promptsData.pageSize)) {
            setPage((p) => p + 1)
          }
          break
      }
    },
    [router, formData, editingId, promptsData, page, createMutation, updateMutation, deleteMutation, togglePublicMutation, t]
  )

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  // Build form card
  const formChildren: A2UINode[] = [
    {
      type: "form-field",
      label: t("imagePrompts.titleLabel"),
      required: true,
      children: [{ type: "input", id: "title", name: "title", value: formData.title, inputType: "text", autocomplete: "off", placeholder: t("imagePrompts.titlePlaceholder"), onChange: { action: "setTitle" } }],
    },
    {
      type: "form-field",
      label: t("imagePrompts.promptLabel"),
      required: true,
      children: [{ type: "textarea", id: "prompt", value: formData.prompt, rows: 4, placeholder: t("imagePrompts.promptPlaceholder"), onChange: { action: "setPrompt" } }],
    },
    {
      type: "form-field",
      label: t("imagePrompts.negativePromptLabel"),
      children: [{ type: "textarea", id: "negativePrompt", value: formData.negativePrompt, rows: 2, placeholder: t("imagePrompts.negativePromptPlaceholder"), onChange: { action: "setNegativePrompt" } }],
    },
    {
      type: "row",
      gap: "1rem",
      responsive: true,
      children: [
        {
          type: "form-field",
          label: t("imagePrompts.modelLabel"),
          className: "flex-1",
          children: [{ type: "select", id: "model", value: formData.model, options: MODEL_OPTIONS, onChange: { action: "setModel" } }],
        },
        {
          type: "form-field",
          label: t("imagePrompts.ratioLabel"),
          className: "flex-1",
          children: [{ type: "select", id: "ratio", value: formData.ratio, options: RATIO_OPTIONS, onChange: { action: "setRatio" } }],
        },
        {
          type: "form-field",
          label: t("imagePrompts.resolutionLabel"),
          className: "flex-1",
          children: [{ type: "select", id: "resolution", value: formData.resolution, options: RESOLUTION_OPTIONS, onChange: { action: "setResolution" } }],
        },
      ],
    },
    {
      type: "row",
      gap: "1rem",
      responsive: true,
      children: [
        {
          type: "form-field",
          label: t("imagePrompts.categoryLabel"),
          className: "flex-1",
          children: [{ type: "select", id: "category", value: formData.category, options: CATEGORY_OPTIONS, onChange: { action: "setCategory" } }],
        },
        {
          type: "form-field",
          label: t("imagePrompts.tagsLabel"),
          className: "flex-[2]",
          children: [{ type: "input", id: "tags", name: "tags", value: formData.tags, inputType: "text", autocomplete: "off", placeholder: t("imagePrompts.tagsPlaceholder"), onChange: { action: "setTags" } }],
        },
      ],
    },
    {
      type: "row",
      gap: "0.5rem",
      align: "center",
      children: [
        { type: "checkbox", id: "isPublic", checked: formData.isPublic, onChange: { action: "setIsPublic" } },
        { type: "text", text: `${t("imagePrompts.publicLabel")} (${t("imagePrompts.publicDescription")})`, variant: "body" },
      ],
    },
  ]

  const buttons: A2UINode[] = [
    { type: "button", text: editingId ? t("common.update") : t("common.create"), variant: "primary", buttonType: "submit", disabled: isSubmitting || !formData.title || !formData.prompt },
  ]
  if (editingId) {
    buttons.push({ type: "button", text: t("common.cancel"), variant: "secondary", onClick: { action: "resetForm" } })
  }
  formChildren.push({ type: "row", gap: "0.5rem", children: buttons })

  const formCard: A2UICardNode = {
    type: "card",
    hoverable: false,
    children: [
      {
        type: "form",
        id: "prompt-form",
        onSubmit: { action: "submitForm" },
        children: [
          {
            type: "column",
            gap: "1rem",
            children: [
              { type: "text", text: editingId ? t("imagePrompts.editTitle") : t("imagePrompts.createTitle"), variant: "h3" },
              { type: "column", gap: "1rem", children: formChildren },
            ],
          },
        ],
      },
    ],
  }

  // Build filter bar
  const filterBar: A2UIRowNode = {
    type: "row",
    gap: "1rem",
    responsive: true,
    align: "center",
    children: [
      { type: "input", id: "search", name: "search", value: searchQuery, inputType: "text", autocomplete: "off", placeholder: t("imagePrompts.searchPlaceholder"), className: "flex-1 min-w-[200px]", onChange: { action: "setSearchQuery" } },
      { type: "select", id: "categoryFilter", value: categoryFilter, options: [{ value: "", label: t("imagePrompts.allCategories") }, ...CATEGORY_OPTIONS], onChange: { action: "setCategoryFilter" } },
    ],
  }

  const buildDetailPanel = (): A2UINode | null => {
    if (!activePromptId || !promptsData) return null
    const prompt = promptsData.items.find((item) => item.id === activePromptId)
    if (!prompt) return null

    const tagBadges: A2UINode[] = prompt.tags?.map((tag) => ({
      type: "badge" as const,
      text: tag,
      color: "info" as const,
    })) ?? []

    return {
      type: "card",
      hoverable: false,
      className: "border border-primary/40 bg-primary/5",
      children: [
        {
          type: "column",
          gap: "0.75rem",
          children: [
            {
              type: "row",
              justify: "between",
              align: "center",
              children: [
                { type: "text", text: "详情", variant: "h4" },
                { type: "button", text: "关闭", variant: "ghost", size: "sm", onClick: { action: "closeDetail" } },
              ],
            } as A2UIRowNode,
            {
              type: "row",
              gap: "0.5rem",
              wrap: true,
              children: [
                { type: "badge", text: CATEGORY_OPTIONS.find((c) => c.value === prompt.category)?.label ?? prompt.category ?? t("imagePrompts.category.general"), color: "default" },
                { type: "badge", text: prompt.model ?? "jimeng-4.5", color: "default" },
                { type: "badge", text: `${prompt.ratio ?? "1:1"} / ${prompt.resolution ?? "2k"}`, color: "default" },
                prompt.isPublic === 1 ? { type: "badge", text: t("imagePrompts.publicLabel"), color: "success" } : null,
              ].filter(Boolean),
            } as A2UIRowNode,
            {
              type: "text",
              text: prompt.title,
              variant: "h4",
            },
            ...(prompt.previewUrl
              ? [{
                  type: "container" as const,
                  className: "rounded-md overflow-hidden",
                  children: [{
                    type: "image",
                    src: prompt.previewUrl,
                    alt: prompt.title,
                    className: "w-full max-h-[180px] object-cover",
                  }],
                }]
              : []),
            { type: "text", text: "正向提示词", variant: "caption", color: "muted" },
            { type: "text", text: prompt.prompt, variant: "body" },
            ...(prompt.negativePrompt
              ? [
                  { type: "text", text: "负向提示词", variant: "caption", color: "muted" },
                  { type: "text", text: prompt.negativePrompt, variant: "body" },
                ]
              : []),
            ...(tagBadges.length > 0
              ? [{
                  type: "row" as const,
                  gap: "0.25rem" as const,
                  wrap: true,
                  children: tagBadges,
                }]
              : []),
            {
              type: "row",
              gap: "0.75rem",
              wrap: true,
              children: [
                { type: "text", text: t("imagePrompts.usageCount", { count: prompt.useCount }), variant: "caption", color: "muted" },
                ...(prompt.rating ? [{ type: "text", text: `${"★".repeat(prompt.rating)}${"☆".repeat(5 - prompt.rating)}`, variant: "caption", color: "primary" }] : []),
              ],
            },
            {
              type: "row",
              gap: "0.5rem",
              wrap: true,
              children: [
                { type: "button", text: copiedId === prompt.id ? `✓ ${t("common.copied")}` : t("imagePrompts.copyPrompt"), variant: copiedId === prompt.id ? "secondary" : "ghost", size: "sm", disabled: copiedId === prompt.id, onClick: { action: "copy", args: [prompt.id] } },
                { type: "button", text: prompt.isPublic === 1 ? t("imagePrompts.makePrivate") : t("imagePrompts.makePublic"), variant: "ghost", size: "sm", onClick: { action: "togglePublic", args: [prompt.id] } },
                { type: "button", text: t("common.edit"), variant: "ghost", size: "sm", onClick: { action: "edit", args: [prompt.id] } },
                { type: "button", text: t("common.delete"), variant: "destructive", size: "sm", onClick: { action: "delete", args: [prompt.id] } },
              ],
            },
          ],
        } as A2UIColumnNode,
      ],
    }
  }

  // Build prompts list
  const buildPromptsList = (): A2UIColumnNode => {
    if (isLoading) {
      return { type: "column", children: [{ type: "text", text: t("common.loading"), color: "muted" }] }
    }

    if (!promptsData || promptsData.items.length === 0) {
      return {
        type: "column",
        children: [
          {
            type: "card",
            hoverable: false,
            className: "p-8 text-center",
            children: [{ type: "text", text: t("imagePrompts.noPrompts"), color: "muted" }],
          },
        ],
      }
    }

    const promptCards: A2UINode[] = promptsData.items.map((prompt) => {
      const isActive = activePromptId === prompt.id
      const metaBadges: A2UINode[] = [
        { type: "badge" as const, text: CATEGORY_OPTIONS.find((c) => c.value === prompt.category)?.label ?? prompt.category ?? t("imagePrompts.category.general"), color: "default" as const },
        { type: "badge" as const, text: prompt.model ?? "jimeng-4.5", color: "default" as const },
        { type: "badge" as const, text: `${prompt.ratio ?? "1:1"} / ${prompt.resolution ?? "2k"}`, color: "default" as const },
        ...(prompt.isPublic === 1 ? [{ type: "badge" as const, text: t("imagePrompts.publicLabel"), color: "success" as const }] : []),
      ]

      const cardContent: A2UINode[] = [
        {
          type: "row",
          justify: "between",
          align: "center",
          gap: "0.75rem",
          children: [
            {
              type: "row",
              gap: "0.75rem",
              align: "center",
              className: "min-w-0 flex-1",
              children: [
                ...(prompt.previewUrl
                  ? [{
                      type: "image" as const,
                      src: prompt.previewUrl,
                      alt: prompt.title,
                      className: "h-14 w-20 rounded-md object-cover",
                    }]
                  : []),
                {
                  type: "column",
                  gap: "0.25rem",
                  className: "min-w-0",
                  children: [
                    { type: "text", text: prompt.title, variant: "h4", className: "truncate" },
                    {
                      type: "row",
                      gap: "0.25rem",
                      wrap: true,
                      children: metaBadges,
                    } as A2UIRowNode,
                  ],
                },
              ],
            },
            {
              type: "row",
              gap: "0.25rem",
              children: [
                { type: "button", text: "查看", variant: "ghost", size: "sm", onClick: { action: "openDetail", args: [prompt.id] } },
                { type: "button", text: t("common.edit"), variant: "ghost", size: "sm", onClick: { action: "edit", args: [prompt.id] } },
              ],
            },
          ],
        } as A2UIRowNode,
        {
          type: "row",
          gap: "0.75rem",
          children: [
            { type: "text", text: t("imagePrompts.usageCount", { count: prompt.useCount }), variant: "caption", color: "muted" },
            ...(prompt.rating ? [{ type: "text" as const, text: `${"★".repeat(prompt.rating)}${"☆".repeat(5 - prompt.rating)}`, variant: "caption" as const, color: "primary" as const }] : []),
          ],
        },
      ]

      return {
        type: "card",
        id: `prompt-${prompt.id}`,
        hoverable: true,
        className: isActive ? "border border-primary/40 bg-primary/5" : undefined,
        onClick: { action: "openDetail", args: [prompt.id] },
        children: [{
          type: "column",
          gap: "0.5rem",
          children: cardContent,
        } as A2UIColumnNode],
      }
    })

    return { type: "column", gap: "0.75rem", children: promptCards }
  }

  // Build pagination
  const totalPages = promptsData ? Math.ceil(promptsData.total / promptsData.pageSize) : 0
  const pagination: A2UIRowNode | null =
    totalPages > 1
      ? {
          type: "row",
          justify: "center",
          align: "center",
          gap: "1rem",
          children: [
            { type: "button", text: t("imagePrompts.prevPage"), variant: "secondary", size: "sm", disabled: page <= 1, onClick: { action: "prevPage" } },
            { type: "text", text: `${page} / ${totalPages}`, variant: "body" },
            { type: "button", text: t("imagePrompts.nextPage"), variant: "secondary", size: "sm", disabled: page >= totalPages, onClick: { action: "nextPage" } },
          ],
        }
      : null

  const detailPanel = buildDetailPanel()

  const pageNode: A2UIColumnNode = {
    type: "column",
    gap: "1.5rem",
    children: [
      { type: "text", text: t("imagePrompts.title"), variant: "h2" },
      {
        type: "row",
        gap: "1.5rem",
        responsive: true,
        children: [
          { type: "column", gap: "0", className: "flex-1 min-w-0 max-w-[400px]", children: [formCard] },
          {
            type: "column",
            gap: "1rem",
            className: "flex-[2] min-w-0",
            children: [
              filterBar,
              ...(detailPanel ? [detailPanel] : []),
              buildPromptsList(),
              ...(pagination ? [pagination] : []),
              { type: "text", text: t("imagePrompts.totalRecords", { count: promptsData?.total ?? 0 }), variant: "caption", color: "muted", className: "text-center" },
            ],
          },
        ],
      },
    ],
  }

  if (!mounted) return null

  const appShellNode: A2UIAppShellNode = {
    type: "app-shell",
    brand: t("app.title"),
    logoSrc: "/logo.png",
    logoAlt: "Wonton",
    navItems,
    activePath: pathname,
    onNavigate: { action: "navigate" },
    onLogout: { action: "logout" },
    logoutLabel: t("auth.logout"),
    headerActions: [{ type: "theme-switcher" }],
    children: [pageNode],
  }

  return <A2UIRenderer node={appShellNode} onAction={handleAction} />
}
