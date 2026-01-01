"use client"

import { useState, useCallback, useMemo } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UIAppShellNode, A2UIColumnNode, A2UICardNode, A2UINode, A2UIRowNode } from "@/lib/a2ui"
import { a2uiToast } from "@/lib/a2ui"
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
        case "edit": {
          const id = args?.[0] as string
          const prompt = promptsData?.items.find((p) => p.id === id)
          if (prompt) {
            setEditingId(prompt.id)
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
          a2uiToast.warning(t("imagePrompts.deleteConfirm"), {
            duration: 5000,
            action: {
              label: t("common.confirm"),
              onClick: () => deleteMutation.mutate({ id }),
            },
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
          style: { flex: 1 },
          children: [{ type: "select", id: "model", value: formData.model, options: MODEL_OPTIONS, onChange: { action: "setModel" } }],
        },
        {
          type: "form-field",
          label: t("imagePrompts.ratioLabel"),
          style: { flex: 1 },
          children: [{ type: "select", id: "ratio", value: formData.ratio, options: RATIO_OPTIONS, onChange: { action: "setRatio" } }],
        },
        {
          type: "form-field",
          label: t("imagePrompts.resolutionLabel"),
          style: { flex: 1 },
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
          style: { flex: 1 },
          children: [{ type: "select", id: "category", value: formData.category, options: CATEGORY_OPTIONS, onChange: { action: "setCategory" } }],
        },
        {
          type: "form-field",
          label: t("imagePrompts.tagsLabel"),
          style: { flex: 2 },
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
      { type: "input", id: "search", name: "search", value: searchQuery, inputType: "text", autocomplete: "off", placeholder: t("imagePrompts.searchPlaceholder"), style: { flex: 1, minWidth: "200px" }, onChange: { action: "setSearchQuery" } },
      { type: "select", id: "categoryFilter", value: categoryFilter, options: [{ value: "", label: t("imagePrompts.allCategories") }, ...CATEGORY_OPTIONS], onChange: { action: "setCategoryFilter" } },
    ],
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
            style: { padding: "2rem", textAlign: "center" },
            children: [{ type: "text", text: t("imagePrompts.noPrompts"), color: "muted" }],
          },
        ],
      }
    }

    const promptCards: A2UINode[] = promptsData.items.map((prompt) => {
      // Build tag badges
      const tagBadges: A2UINode[] = prompt.tags?.slice(0, 3).map((tag) => ({
        type: "badge" as const,
        text: tag,
        color: "info" as const,
      })) ?? []

      // Build card content
      const cardContent: A2UINode[] = [
        // Header row
        {
          type: "row",
          justify: "between",
          align: "start",
          gap: "0.5rem",
          children: [
            {
              type: "column",
              gap: "0.25rem",
              style: { flex: 1, minWidth: 0 },
              children: [
                { type: "text", text: prompt.title, variant: "h4" },
                {
                  type: "row",
                  gap: "0.5rem",
                  wrap: true,
                  children: [
                    { type: "badge", text: CATEGORY_OPTIONS.find((c) => c.value === prompt.category)?.label ?? prompt.category ?? t("imagePrompts.category.general"), color: "default" },
                    { type: "badge", text: prompt.model ?? "jimeng-4.5", color: "secondary" },
                    { type: "badge", text: `${prompt.ratio ?? "1:1"} / ${prompt.resolution ?? "2k"}`, color: "secondary" },
                    prompt.isPublic === 1 ? { type: "badge", text: t("imagePrompts.publicLabel"), color: "success" } : null,
                  ].filter(Boolean),
                },
              ],
            },
            {
              type: "row",
              gap: "0.25rem",
              children: [
                { type: "button", text: copiedId === prompt.id ? `✓ ${t("common.copied")}` : t("imagePrompts.copyPrompt"), variant: copiedId === prompt.id ? "secondary" : "ghost", size: "sm", disabled: copiedId === prompt.id, onClick: { action: "copy", args: [prompt.id] } },
                { type: "button", text: prompt.isPublic === 1 ? t("imagePrompts.makePrivate") : t("imagePrompts.makePublic"), variant: "ghost", size: "sm", onClick: { action: "togglePublic", args: [prompt.id] } },
                { type: "button", text: t("common.edit"), variant: "ghost", size: "sm", onClick: { action: "edit", args: [prompt.id] } },
                { type: "button", text: t("common.delete"), variant: "destructive", size: "sm", onClick: { action: "delete", args: [prompt.id] } },
              ],
            },
          ],
        } as A2UIRowNode,
      ]

      // Add preview image if available
      if (prompt.previewUrl) {
        cardContent.push({
          type: "container",
          style: { borderRadius: "0.375rem", overflow: "hidden", marginTop: "0.5rem" },
          children: [{
            type: "image",
            src: prompt.previewUrl,
            alt: prompt.title,
            style: { width: "100%", maxHeight: "150px", objectFit: "cover" },
          }],
        } as A2UINode)
      }

      // Add prompt content
      cardContent.push({
        type: "text",
        text: prompt.prompt.length > 120 ? prompt.prompt.slice(0, 120) + "..." : prompt.prompt,
        variant: "body",
        color: "muted",
        style: { fontSize: "0.875rem" },
      })

      // Add tags if available
      if (tagBadges.length > 0) {
        cardContent.push({
          type: "row",
          gap: "0.25rem",
          wrap: true,
          children: tagBadges,
        } as A2UIRowNode)
      }

      // Add stats row
      const statsChildren: A2UINode[] = [
        { type: "text", text: t("imagePrompts.usageCount", { count: prompt.useCount }), variant: "caption", color: "muted" },
      ]
      if ((prompt.rating ?? 0) > 0) {
        statsChildren.push({ type: "text", text: `${"★".repeat(prompt.rating!)}${"☆".repeat(5 - prompt.rating!)}`, variant: "caption", color: "primary" })
      }
      cardContent.push({
        type: "row",
        gap: "1rem",
        children: statsChildren,
      })

      return {
        type: "card",
        id: `prompt-${prompt.id}`,
        hoverable: true,
        children: [{
          type: "column",
          gap: "0.75rem",
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
          { type: "column", gap: "0", style: { flex: 1, minWidth: 0, maxWidth: "400px" }, children: [formCard] },
          {
            type: "column",
            gap: "1rem",
            style: { flex: 2, minWidth: 0 },
            children: [
              filterBar,
              buildPromptsList(),
              ...(pagination ? [pagination] : []),
              { type: "text", text: t("imagePrompts.totalRecords", { count: promptsData?.total ?? 0 }), variant: "caption", color: "muted", style: { textAlign: "center" } },
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
