"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useI18n } from "@/contexts/i18n-context"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UIPageNode, A2UINode } from "@/lib/a2ui"

export default function LoginPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [username, setUsername] = useState("")
  const [accessCode, setAccessCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, accessCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t("auth.invalidCredentials"))
      }

      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))
      router.push("/tasks")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.invalidCredentials"))
    } finally {
      setLoading(false)
    }
  }

  const handleAction = useCallback(
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "setUsername":
          setUsername(args?.[0] as string)
          break
        case "setAccessCode":
          setAccessCode(args?.[0] as string)
          break
        case "submit":
          handleSubmit()
          break
      }
    },
    [handleSubmit]
  )

  // Build A2UI nodes directly
  const formChildren: A2UINode[] = [
    {
      type: "form-field",
      label: t("auth.username"),
      required: true,
      children: [
        {
          type: "input",
          id: "username",
          value: username,
          placeholder: t("auth.username"),
          inputType: "text",
          onChange: { action: "setUsername" },
        },
      ],
    },
    {
      type: "form-field",
      label: t("auth.accessCode"),
      required: true,
      children: [
        {
          type: "input",
          id: "accessCode",
          value: accessCode,
          placeholder: t("auth.accessCode"),
          inputType: "password",
          onChange: { action: "setAccessCode" },
        },
      ],
    },
  ]

  if (error) {
    formChildren.push({
      type: "alert",
      message: error,
      variant: "error",
    })
  }

  formChildren.push({
    type: "button",
    id: "submit",
    text: loading ? t("auth.loggingIn") : t("auth.loginButton"),
    variant: "primary",
    disabled: loading,
    style: { width: "100%" },
    onClick: { action: "submit" },
  })

  const loginNode: A2UIPageNode = {
    type: "page",
    centered: true,
    children: [
      {
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
                text: t("app.title"),
                variant: "h2",
                style: { textAlign: "center" },
              },
              {
                type: "text",
                text: t("app.description"),
                color: "muted",
                style: { textAlign: "center" },
              },
              {
                type: "form",
                onSubmit: { action: "submit" },
                children: formChildren,
              },
            ],
          },
        ],
      },
    ],
  }

  return (
    <>
      <div className="absolute right-4 top-4">
        <ThemeSwitcher />
      </div>
      <A2UIRenderer node={loginNode} onAction={handleAction} />
    </>
  )
}
