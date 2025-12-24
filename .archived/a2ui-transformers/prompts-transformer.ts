// Prompts Page A2UI Transformer
// Converts prompts state into A2UI declarative JSON format

import type { A2UINode, A2UIColumnNode, A2UICardNode, A2UIRowNode } from "./generated/types"

export interface PromptData {
  id: string
  name: string
  content: string
  category: string | null
  description: string | null
}

export interface PromptsFormData {
  name: string
  content: string
  category: string
  description: string
}

export interface PromptsTransformOptions {
  labels: {
    title: string
    createPrompt: string
    editPrompt: string
    name: string
    category: string
    description: string
    content: string
    create: string
    update: string
    cancel: string
    edit: string
    delete: string
    noPrompts: string
    loading: string
  }
  editingId: string | null
  formData: PromptsFormData
  isSubmitting: boolean
  isLoading: boolean
  prompts: PromptData[]
}

function createPromptFormA2UI(options: PromptsTransformOptions): A2UICardNode {
  const { labels, editingId, formData, isSubmitting } = options

  const formChildren: A2UINode[] = [
    {
      type: "form-field",
      label: labels.name,
      required: true,
      children: [
        {
          type: "input",
          id: "name",
          value: formData.name,
          inputType: "text",
          onChange: { action: "setName" },
        },
      ],
    },
    {
      type: "form-field",
      label: labels.category,
      children: [
        {
          type: "input",
          id: "category",
          value: formData.category,
          inputType: "text",
          onChange: { action: "setCategory" },
        },
      ],
    },
    {
      type: "form-field",
      label: labels.description,
      children: [
        {
          type: "input",
          id: "description",
          value: formData.description,
          inputType: "text",
          onChange: { action: "setDescription" },
        },
      ],
    },
    {
      type: "form-field",
      label: labels.content,
      required: true,
      children: [
        {
          type: "textarea",
          id: "content",
          value: formData.content,
          rows: 6,
          onChange: { action: "setContent" },
        },
      ],
    },
  ]

  const buttons: A2UINode[] = [
    {
      type: "button",
      text: editingId ? labels.update : labels.create,
      variant: "primary",
      disabled: isSubmitting,
      onClick: { action: "submitForm" },
    },
  ]

  if (editingId) {
    buttons.push({
      type: "button",
      text: labels.cancel,
      variant: "secondary",
      onClick: { action: "resetForm" },
    })
  }

  formChildren.push({
    type: "row",
    gap: "0.5rem",
    children: buttons,
  })

  return {
    type: "card",
    hoverable: false,
    children: [
      {
        type: "column",
        gap: "1rem",
        children: [
          {
            type: "text",
            text: editingId ? labels.editPrompt : labels.createPrompt,
            variant: "h3",
          },
          {
            type: "form",
            onSubmit: { action: "submitForm" },
            children: formChildren,
          },
        ],
      },
    ],
  }
}

function createPromptListA2UI(options: PromptsTransformOptions): A2UIColumnNode {
  const { labels, isLoading, prompts } = options

  if (isLoading) {
    return {
      type: "column",
      children: [
        {
          type: "text",
          text: labels.loading,
          color: "muted",
        },
      ],
    }
  }

  if (prompts.length === 0) {
    return {
      type: "column",
      children: [
        {
          type: "card",
          hoverable: false,
          style: { padding: "2rem", textAlign: "center" },
          children: [
            {
              type: "text",
              text: labels.noPrompts,
              color: "muted",
            },
          ],
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
              {
                type: "text",
                text: prompt.name,
                variant: "h4",
              },
              {
                type: "badge",
                text: prompt.category || "default",
                color: "default",
              },
              ...(prompt.description
                ? [
                    {
                      type: "text" as const,
                      text: prompt.description,
                      variant: "body" as const,
                      color: "muted" as const,
                    },
                  ]
                : []),
              {
                type: "text",
                text: prompt.content.length > 100 ? prompt.content.slice(0, 100) + "..." : prompt.content,
                variant: "body",
                color: "muted",
              },
            ],
          },
          {
            type: "row",
            gap: "0.5rem",
            children: [
              {
                type: "link",
                text: labels.edit,
                variant: "primary",
                onClick: { action: "edit", args: [prompt.id] },
              },
              {
                type: "link",
                text: labels.delete,
                variant: "primary",
                style: { color: "var(--destructive)" },
                onClick: { action: "delete", args: [prompt.id] },
              },
            ],
          },
        ],
      } as A2UIRowNode,
    ],
  }))

  return {
    type: "column",
    gap: "0.75rem",
    children: promptCards,
  }
}

export function createPromptsPageA2UI(options: PromptsTransformOptions): A2UIColumnNode {
  const { labels } = options

  return {
    type: "column",
    gap: "2rem",
    children: [
      {
        type: "text",
        text: labels.title,
        variant: "h2",
      },
      {
        type: "row",
        gap: "2rem",
        style: { display: "grid", gridTemplateColumns: "1fr 1fr" },
        children: [
          createPromptFormA2UI(options),
          {
            type: "column",
            gap: "1rem",
            children: [
              {
                type: "text",
                text: labels.title,
                variant: "h3",
              },
              createPromptListA2UI(options),
            ],
          },
        ],
      },
    ],
  }
}
