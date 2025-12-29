"use client"

import { useState, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UIAppShellNode, A2UIColumnNode, A2UICardNode, A2UINode, A2UIRowNode } from "@/lib/a2ui"
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

const MODEL_OPTIONS = [
  { value: "jimeng-4.5", label: "Jimeng 4.5" },
  { value: "jimeng-4.0", label: "Jimeng 4.0" },
  { value: "jimeng-3.1", label: "Jimeng 3.1" },
  { value: "nanobanana", label: "Nanobanana" },
]

const RATIO_OPTIONS = [
  { value: "1:1", label: "1:1 (正方形)" },
  { value: "16:9", label: "16:9 (横屏)" },
  { value: "9:16", label: "9:16 (竖屏)" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
  { value: "21:9", label: "21:9 (超宽)" },
]

const RESOLUTION_OPTIONS = [
  { value: "1k", label: "1K" },
  { value: "2k", label: "2K" },
  { value: "4k", label: "4K" },
]

const CATEGORY_OPTIONS = [
  { value: "general", label: "通用" },
  { value: "cover", label: "封面" },
  { value: "portrait", label: "人物" },
  { value: "landscape", label: "风景" },
  { value: "product", label: "产品" },
  { value: "abstract", label: "抽象" },
]

export default function ImagePromptsPage() {
  const { t } = useI18n()
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const mounted = status !== "loading"
  const logout = () => signOut({ callbackUrl: "/" })
  const navItems = buildNavItems(t)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<ImagePromptFormData>(DEFAULT_FORM)
  const [page, setPage] = useState(1)
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")

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

  const duplicateMutation = api.imagePrompts.duplicate.useMutation({
    onSuccess: () => {
      utils.imagePrompts.getAll.invalidate()
    },
  })

  const togglePublicMutation = api.imagePrompts.togglePublic.useMutation({
    onSuccess: () => {
      utils.imagePrompts.getAll.invalidate()
    },
  })

  const resetForm = () => {
    setEditingId(null)
    setFormData(DEFAULT_FORM)
  }

  const handleSubmit = () => {
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
  }

  const handleEdit = (id: string) => {
    const prompt = promptsData?.items.find((p) => p.id === id)
    if (!prompt) return

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

  const handleDelete = (id: string) => {
    if (confirm("确定要删除这个提示词吗？")) {
      deleteMutation.mutate({ id })
    }
  }

  const handleDuplicate = (id: string) => {
    duplicateMutation.mutate({ id })
  }

  const handleTogglePublic = (id: string) => {
    togglePublicMutation.mutate({ id })
  }

  const handleAction = useCallback(
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "navigate": {
          const href = args?.[0] as string
          if (href) router.push(href)
          break
        }
        case "logout":
          logout()
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
        case "submitForm":
          handleSubmit()
          break
        case "resetForm":
          resetForm()
          break
        case "edit":
          handleEdit(args?.[0] as string)
          break
        case "delete":
          handleDelete(args?.[0] as string)
          break
        case "duplicate":
          handleDuplicate(args?.[0] as string)
          break
        case "togglePublic":
          handleTogglePublic(args?.[0] as string)
          break
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
    [router, logout, formData, editingId, promptsData, handleSubmit]
  )

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  // Build form card
  const formChildren: A2UINode[] = [
    {
      type: "form-field",
      label: "标题",
      required: true,
      children: [{ type: "input", id: "title", value: formData.title, inputType: "text", placeholder: "提示词标题", onChange: { action: "setTitle" } }],
    },
    {
      type: "form-field",
      label: "正向提示词",
      required: true,
      children: [{ type: "textarea", id: "prompt", value: formData.prompt, rows: 4, placeholder: "描述你想要生成的图片...", onChange: { action: "setPrompt" } }],
    },
    {
      type: "form-field",
      label: "负向提示词",
      children: [{ type: "textarea", id: "negativePrompt", value: formData.negativePrompt, rows: 2, placeholder: "不想出现的元素...", onChange: { action: "setNegativePrompt" } }],
    },
    {
      type: "row",
      gap: "1rem",
      responsive: true,
      children: [
        {
          type: "form-field",
          label: "模型",
          style: { flex: 1 },
          children: [{ type: "select", id: "model", value: formData.model, options: MODEL_OPTIONS, onChange: { action: "setModel" } }],
        },
        {
          type: "form-field",
          label: "比例",
          style: { flex: 1 },
          children: [{ type: "select", id: "ratio", value: formData.ratio, options: RATIO_OPTIONS, onChange: { action: "setRatio" } }],
        },
        {
          type: "form-field",
          label: "分辨率",
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
          label: "分类",
          style: { flex: 1 },
          children: [{ type: "select", id: "category", value: formData.category, options: CATEGORY_OPTIONS, onChange: { action: "setCategory" } }],
        },
        {
          type: "form-field",
          label: "标签",
          style: { flex: 2 },
          children: [{ type: "input", id: "tags", value: formData.tags, inputType: "text", placeholder: "用逗号分隔, 如: 科技, 未来感, 极简", onChange: { action: "setTags" } }],
        },
      ],
    },
    {
      type: "row",
      gap: "0.5rem",
      align: "center",
      children: [
        { type: "checkbox", id: "isPublic", checked: formData.isPublic, onChange: { action: "setIsPublic" } },
        { type: "text", text: "公开 (其他用户可见)", variant: "body" },
      ],
    },
  ]

  const buttons: A2UINode[] = [
    { type: "button", text: editingId ? t("common.update") : t("common.create"), variant: "primary", disabled: isSubmitting || !formData.title || !formData.prompt, onClick: { action: "submitForm" } },
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
        type: "column",
        gap: "1rem",
        children: [
          { type: "text", text: editingId ? "编辑提示词" : "创建提示词", variant: "h3" },
          { type: "form", onSubmit: { action: "submitForm" }, children: formChildren },
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
      { type: "input", id: "search", value: searchQuery, inputType: "text", placeholder: "搜索提示词...", style: { flex: 1, minWidth: "200px" }, onChange: { action: "setSearchQuery" } },
      { type: "select", id: "categoryFilter", value: categoryFilter, options: [{ value: "", label: "全部分类" }, ...CATEGORY_OPTIONS], onChange: { action: "setCategoryFilter" } },
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
            children: [{ type: "text", text: "暂无提示词", color: "muted" }],
          },
        ],
      }
    }

    const promptCards: A2UINode[] = promptsData.items.map((prompt) => ({
      type: "card",
      id: `prompt-${prompt.id}`,
      hoverable: true,
      children: [
        {
          type: "column",
          gap: "0.75rem",
          children: [
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
                        { type: "badge", text: CATEGORY_OPTIONS.find((c) => c.value === prompt.category)?.label ?? prompt.category ?? "通用", color: "default" },
                        { type: "badge", text: prompt.model ?? "jimeng-4.5", color: "secondary" },
                        { type: "badge", text: `${prompt.ratio ?? "1:1"} / ${prompt.resolution ?? "2k"}`, color: "secondary" },
                        prompt.isPublic === 1 ? { type: "badge", text: "公开", color: "success" } : null,
                      ].filter(Boolean),
                    },
                  ],
                },
                {
                  type: "row",
                  gap: "0.25rem",
                  children: [
                    { type: "button", text: "复制", variant: "ghost", size: "sm", onClick: { action: "duplicate", args: [prompt.id] } },
                    { type: "button", text: prompt.isPublic === 1 ? "私有" : "公开", variant: "ghost", size: "sm", onClick: { action: "togglePublic", args: [prompt.id] } },
                    { type: "button", text: t("common.edit"), variant: "ghost", size: "sm", onClick: { action: "edit", args: [prompt.id] } },
                    { type: "button", text: t("common.delete"), variant: "destructive", size: "sm", onClick: { action: "delete", args: [prompt.id] } },
                  ],
                },
              ],
            } as A2UIRowNode,
            // Prompt content
            {
              type: "text",
              text: prompt.prompt.length > 120 ? prompt.prompt.slice(0, 120) + "..." : prompt.prompt,
              variant: "body",
              color: "muted",
              style: { fontSize: "0.875rem" },
            },
            // Stats row
            {
              type: "row",
              gap: "1rem",
              children: [
                { type: "text", text: `使用 ${prompt.useCount} 次`, variant: "caption", color: "muted" },
                (prompt.rating ?? 0) > 0 ? { type: "text", text: `${"★".repeat(prompt.rating!)}${"☆".repeat(5 - prompt.rating!)}`, variant: "caption", color: "warning" } : null,
              ].filter(Boolean),
            },
          ],
        } as A2UIColumnNode,
      ],
    }))

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
            { type: "button", text: "上一页", variant: "secondary", size: "sm", disabled: page <= 1, onClick: { action: "prevPage" } },
            { type: "text", text: `${page} / ${totalPages}`, variant: "body" },
            { type: "button", text: "下一页", variant: "secondary", size: "sm", disabled: page >= totalPages, onClick: { action: "nextPage" } },
          ],
        }
      : null

  const pageNode: A2UIColumnNode = {
    type: "column",
    gap: "1.5rem",
    children: [
      { type: "text", text: "图片提示词库", variant: "h2" },
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
              { type: "text", text: `共 ${promptsData?.total ?? 0} 条记录`, variant: "caption", color: "muted", style: { textAlign: "center" } },
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
