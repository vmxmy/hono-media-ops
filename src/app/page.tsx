"use client"

import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { useI18n } from "@/contexts/i18n-context"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UINode, A2UIColumnNode } from "@/lib/a2ui"

export default function LoginPage() {
  const router = useRouter()
  const { t } = useI18n()
  const { data: session, status } = useSession()
  const [username, setUsername] = useState("")
  const [accessCode, setAccessCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Redirect to tasks if already authenticated
  useEffect(() => {
    if (session) {
      router.push("/tasks")
    }
  }, [session, router])

  const handleCredentialsLogin = async () => {
    setError("")
    setIsLoading(true)

    const result = await signIn("credentials", {
      username,
      accessCode,
      redirect: false,
    })

    setIsLoading(false)

    if (result?.error) {
      setError(t("auth.invalidCredentials"))
    } else if (result?.ok) {
      router.push("/tasks")
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
        case "submitCredentials":
          handleCredentialsLogin()
          break
        case "signInGoogle":
          signIn("google", { callbackUrl: "/tasks" })
          break
        case "signInGitHub":
          signIn("github", { callbackUrl: "/tasks" })
          break
      }
    },
    [username, accessCode, t, router]
  )

  // Build login page with A2UI
  const buildLoginPage = (): A2UIColumnNode => ({
    type: "column",
    gap: "1.5rem",
    children: [
      // Header
      {
        type: "column",
        gap: "0.5rem",
        style: { textAlign: "center" },
        children: [
          { type: "text", text: t("app.title"), variant: "h2", weight: "bold" },
          { type: "text", text: t("app.description"), color: "muted" },
        ],
      },
      // Credentials Form
      {
        type: "column",
        gap: "1rem",
        children: [
          // Username field
          {
            type: "form-field",
            label: t("auth.username"),
            required: true,
            children: [
              {
                type: "input",
                id: "username",
                value: username,
                placeholder: t("auth.usernamePlaceholder"),
                inputType: "text",
                onChange: { action: "setUsername" },
              } as A2UINode,
            ],
          },
          // Access code field
          {
            type: "form-field",
            label: t("auth.accessCode"),
            required: true,
            children: [
              {
                type: "input",
                id: "accessCode",
                value: accessCode,
                placeholder: t("auth.accessCodePlaceholder"),
                inputType: "password",
                onChange: { action: "setAccessCode" },
              } as A2UINode,
            ],
          },
          // Error message
          ...(error
            ? [{ type: "alert", message: error, variant: "error" } as A2UINode]
            : []),
          // Submit button
          {
            type: "button",
            text: isLoading ? t("common.loading") : t("auth.signIn"),
            variant: "primary",
            size: "lg",
            fullWidth: true,
            disabled: isLoading,
            onClick: { action: "submitCredentials" },
          },
        ],
      },
      // Divider with text
      {
        type: "row",
        align: "center",
        gap: "1rem",
        children: [
          { type: "divider" },
          {
            type: "text",
            text: t("auth.orContinueWith"),
            variant: "caption",
            color: "muted",
            style: { whiteSpace: "nowrap" },
          },
          { type: "divider" },
        ],
      },
      // OAuth Buttons
      {
        type: "column",
        gap: "0.75rem",
        children: [
          {
            type: "button",
            text: t("auth.signInWithGoogle"),
            variant: "outline",
            size: "lg",
            icon: "google",
            fullWidth: true,
            onClick: { action: "signInGoogle" },
          },
          {
            type: "button",
            text: t("auth.signInWithGitHub"),
            variant: "outline",
            size: "lg",
            icon: "github",
            fullWidth: true,
            onClick: { action: "signInGitHub" },
          },
        ],
      },
    ],
  })

  // Show loading while checking session
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">{t("common.loading")}</div>
      </div>
    )
  }

  return (
    <>
      <div className="absolute right-4 top-4">
        <ThemeSwitcher />
      </div>
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-lg">
          <A2UIRenderer node={buildLoginPage()} onAction={handleAction} />
        </div>
      </div>
    </>
  )
}
