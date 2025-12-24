// Login Page A2UI Transformer
// Converts login state into A2UI declarative JSON format

import type { A2UINode, A2UIPageNode, A2UIFormNode, A2UICardNode } from "./generated/types"

export interface LoginTransformOptions {
  labels: {
    title: string
    description: string
    username: string
    accessCode: string
    loginButton: string
    loggingIn: string
  }
  error?: string
  loading?: boolean
}

export function createLoginPageA2UI(options: LoginTransformOptions): A2UIPageNode {
  const { labels, error, loading } = options

  const formChildren: A2UINode[] = [
    // Username field
    {
      type: "form-field",
      label: labels.username,
      required: true,
      children: [
        {
          type: "input",
          id: "username",
          placeholder: labels.username,
          inputType: "text",
          onChange: { action: "setUsername" },
        },
      ],
    },
    // Access code field
    {
      type: "form-field",
      label: labels.accessCode,
      required: true,
      children: [
        {
          type: "input",
          id: "accessCode",
          placeholder: labels.accessCode,
          inputType: "password",
          onChange: { action: "setAccessCode" },
        },
      ],
    },
  ]

  // Add error alert if present
  if (error) {
    formChildren.push({
      type: "alert",
      message: error,
      variant: "error",
    })
  }

  // Add submit button
  formChildren.push({
    type: "button",
    id: "submit",
    text: loading ? labels.loggingIn : labels.loginButton,
    variant: "primary",
    disabled: loading,
    style: { width: "100%" },
    onClick: { action: "submit" },
  })

  const form: A2UIFormNode = {
    type: "form",
    onSubmit: { action: "submit" },
    children: formChildren,
  }

  const card: A2UICardNode = {
    type: "card",
    hoverable: false,
    style: { width: "100%", maxWidth: "28rem", padding: "2rem" },
    children: [
      {
        type: "column",
        gap: "1.5rem",
        children: [
          {
            type: "text",
            text: labels.title,
            variant: "h2",
            style: { textAlign: "center" },
          },
          {
            type: "text",
            text: labels.description,
            color: "muted",
            style: { textAlign: "center" },
          },
          form,
        ],
      },
    ],
  }

  return {
    type: "page",
    centered: true,
    children: [card],
  }
}
