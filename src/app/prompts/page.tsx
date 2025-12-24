"use client"

import { useState, useCallback } from "react"
import { api } from "@/trpc/react"
import { AppLayout } from "@/components/app-layout"
import { useI18n } from "@/contexts/i18n-context"
import { useAuth } from "@/hooks/use-auth"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UIColumnNode, A2UICardNode, A2UINode, A2UIRowNode } from "@/lib/a2ui"

interface PromptsFormData {
  name: string
  content: string
  category: string
  description: string
}

export default function PromptsPage() {
  const { t } = useI18n()
  const { mounted, logout } = useAuth()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<PromptsFormData>({
    name: "",
    content: "",
    category: "default",
    description: "",
  })

  const utils = api.useUtils()
  const { data: prompts, isLoading } = api.prompts.getAll.useQuery(undefined, {
    enabled: mounted,
  })

  const createMutation = api.prompts.create.useMutation({
    onSuccess: () => {
      utils.prompts.getAll.invalidate()
      resetForm()
    },
  })

  const updateMutation = api.prompts.update.useMutation({
    onSuccess: () => {
      utils.prompts.getAll.invalidate()
      resetForm()
    },
  })

  const deleteMutation = api.prompts.delete.useMutation({
    onSuccess: () => {
      utils.prompts.getAll.invalidate()
    },
  })

  const resetForm = () => {
    setEditingId(null)
    setFormData({ name: "", content: "", category: "default", description: "" })
  }

  const handleSubmit = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (id: string) => {
    const prompt = prompts?.find((p) => p.id === id)
    if (!prompt) return

    setEditingId(prompt.id)
    setFormData({
      name: prompt.name,
      content: prompt.content,
      category: prompt.category ?? "default",
      description: prompt.description ?? "",
    })
  }

  const handleDelete = (id: string) => {
    if (confirm(t("prompts.deleteConfirm"))) {
      deleteMutation.mutate({ id })
    }
  }

  const handleAction = useCallback(
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "setName":
          setFormData((prev) => ({ ...prev, name: args?.[0] as string }))
          break
        case "setCategory":
          setFormData((prev) => ({ ...prev, category: args?.[0] as string }))
          break
        case "setDescription":
          setFormData((prev) => ({ ...prev, description: args?.[0] as string }))
          break
        case "setContent":
          setFormData((prev) => ({ ...prev, content: args?.[0] as string }))
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
      }
    },
    [formData, editingId, prompts, handleSubmit]
  )

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  // Build form card
  const formChildren: A2UINode[] = [
    {
      type: "form-field",
      label: t("prompts.name"),
      required: true,
      children: [{ type: "input", id: "name", value: formData.name, inputType: "text", onChange: { action: "setName" } }],
    },
    {
      type: "form-field",
      label: t("prompts.category"),
      children: [{ type: "input", id: "category", value: formData.category, inputType: "text", onChange: { action: "setCategory" } }],
    },
    {
      type: "form-field",
      label: t("prompts.description"),
      children: [{ type: "input", id: "description", value: formData.description, inputType: "text", onChange: { action: "setDescription" } }],
    },
    {
      type: "form-field",
      label: t("prompts.content"),
      required: true,
      children: [{ type: "textarea", id: "content", value: formData.content, rows: 6, onChange: { action: "setContent" } }],
    },
  ]

  const buttons: A2UINode[] = [
    { type: "button", text: editingId ? t("common.update") : t("common.create"), variant: "primary", disabled: isSubmitting, onClick: { action: "submitForm" } },
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
          { type: "text", text: editingId ? t("prompts.editPrompt") : t("prompts.createPrompt"), variant: "h3" },
          { type: "form", onSubmit: { action: "submitForm" }, children: formChildren },
        ],
      },
    ],
  }

  // Build prompts list
  const buildPromptsList = (): A2UIColumnNode => {
    if (isLoading) {
      return { type: "column", children: [{ type: "text", text: t("common.loading"), color: "muted" }] }
    }

    if (!prompts || prompts.length === 0) {
      return {
        type: "column",
        children: [
          {
            type: "card",
            hoverable: false,
            style: { padding: "2rem", textAlign: "center" },
            children: [{ type: "text", text: t("prompts.noPrompts"), color: "muted" }],
          },
        ],
      }
    }

    const promptCards: A2UINode[] = prompts.map((prompt) => ({
      type: "card",
      id: `prompt-${prompt.id}`,
      hoverable: false,
      children: [
        {
          type: "row",
          justify: "between",
          align: "start",
          children: [
            {
              type: "column",
              gap: "0.5rem",
              style: { flex: 1 },
              children: [
                { type: "text", text: prompt.name, variant: "h4" },
                { type: "badge", text: prompt.category || "default", color: "default" },
                ...(prompt.description ? [{ type: "text" as const, text: prompt.description, variant: "body" as const, color: "muted" as const }] : []),
                { type: "text", text: prompt.content.length > 100 ? prompt.content.slice(0, 100) + "..." : prompt.content, variant: "body", color: "muted" },
              ],
            },
            {
              type: "row",
              gap: "0.5rem",
              children: [
                { type: "button", text: t("common.edit"), variant: "ghost", size: "sm", onClick: { action: "edit", args: [prompt.id] } },
                { type: "button", text: t("common.delete"), variant: "destructive", size: "sm", onClick: { action: "delete", args: [prompt.id] } },
              ],
            },
          ],
        } as A2UIRowNode,
      ],
    }))

    return { type: "column", gap: "0.75rem", children: promptCards }
  }

  const pageNode: A2UIColumnNode = {
    type: "column",
    gap: "2rem",
    children: [
      { type: "text", text: t("prompts.title"), variant: "h2" },
      {
        type: "row",
        gap: "2rem",
        style: { display: "grid", gridTemplateColumns: "1fr 1fr" },
        children: [
          formCard,
          { type: "column", gap: "1rem", children: [{ type: "text", text: t("prompts.title"), variant: "h3" }, buildPromptsList()] },
        ],
      },
    ],
  }

  if (!mounted) return null

  return (
    <AppLayout onLogout={logout}>
      <A2UIRenderer node={pageNode} onAction={handleAction} />
    </AppLayout>
  )
}
