"use client"

import { signIn, useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useCallback, Suspense } from "react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UINode, A2UIColumnNode } from "@/lib/a2ui"

/**
 * Sanitizes callback URL to prevent open redirect attacks
 * Allows same-origin relative paths and same-origin absolute URLs
 *
 * Note: This is stricter than the backend (security.ts) which supports
 * ALLOWED_CALLBACK_HOSTS whitelist. If the whitelist is enabled on the
 * backend, this function should be updated to match.
 */
function sanitizeCallbackUrl(url: string | null): string {
  const defaultPath = "/tasks"

  if (!url) return defaultPath

  // Prevent protocol-relative URLs like //evil.com
  if (url.startsWith("//")) return defaultPath

  // Handle relative paths
  if (url.startsWith("/")) {
    // Basic path validation - no encoded characters that could bypass checks
    try {
      const decoded = decodeURIComponent(url)
      if (decoded.includes("//") || decoded.includes("\\")) {
        return defaultPath
      }
    } catch {
      return defaultPath
    }
    return url
  }

  // Handle absolute URLs - only allow same-origin
  try {
    const urlObj = new URL(url)
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : ""

    // Only allow same-origin absolute URLs
    if (currentOrigin && urlObj.origin === currentOrigin) {
      const pathname = urlObj.pathname + urlObj.search
      // Prevent protocol-relative URLs in pathname (e.g., //evil.com from https://site.com//evil.com)
      if (pathname.startsWith("//") || pathname.includes("\\")) {
        return defaultPath
      }
      return pathname
    }
  } catch {
    // Invalid URL
  }

  return defaultPath
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawCallbackUrl = searchParams.get("callbackUrl")
  const callbackUrl = sanitizeCallbackUrl(rawCallbackUrl)
  const errorParam = searchParams.get("error")
  const { t } = useI18n()
  const { data: session, status } = useSession()
  const [username, setUsername] = useState("")
  const [accessCode, setAccessCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Show error from URL params (e.g., AccountDisabled)
  useEffect(() => {
    if (errorParam === "AccountDisabled") {
      setError(t("auth.accountDisabled"))
    }
  }, [errorParam, t])

  // Redirect to tasks if already authenticated
  useEffect(() => {
    if (session) {
      router.push(callbackUrl)
    }
  }, [session, router, callbackUrl])

  const handleCredentialsLogin = async () => {
    // Local input validation
    const trimmedUsername = username.trim()
    const trimmedAccessCode = accessCode.trim()

    if (!trimmedUsername) {
      setError(t("auth.usernameRequired"))
      return
    }

    if (!trimmedAccessCode) {
      setError(t("auth.accessCodeRequired"))
      return
    }

    setError("")
    setIsLoading(true)

    const result = await signIn("credentials", {
      username: trimmedUsername,
      accessCode: trimmedAccessCode,
      redirect: false,
      callbackUrl,
    })

    setIsLoading(false)

    if (result?.error) {
      setError(t("auth.invalidCredentials"))
    } else if (result?.ok) {
      router.push(callbackUrl)
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
          signIn("google", { callbackUrl })
          break
        case "signInGitHub":
          signIn("github", { callbackUrl })
          break
      }
    },
    [username, accessCode, t, router, callbackUrl]
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
        style: { textAlign: "center", alignItems: "center" },
        children: [
          { type: "image", src: "/logo.png", alt: "Wonton", style: { height: "64px", width: "auto" } },
          { type: "text", text: t("app.description"), color: "muted" },
        ],
      },
      // Credentials Form
      {
        type: "form",
        onSubmit: { action: "submitCredentials" },
        children: [
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
                    name: "username",
                    value: username,
                    placeholder: t("auth.usernamePlaceholder"),
                    inputType: "text",
                    autocomplete: "username",
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
                    name: "password",
                    value: accessCode,
                    placeholder: t("auth.accessCodePlaceholder"),
                    inputType: "password",
                    autocomplete: "current-password",
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
                buttonType: "submit",
              },
            ],
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
    const loadingNode: A2UINode = {
      type: "container",
      style: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
      children: [{ type: "text", text: t("common.loading"), color: "muted" }],
    }
    return <A2UIRenderer node={loadingNode} />
  }

  const pageNode: A2UINode = {
    type: "container",
    style: { position: "relative", minHeight: "100vh" },
    children: [
      {
        type: "container",
        style: { position: "absolute", right: "1rem", top: "1rem" },
        children: [{ type: "theme-switcher" } as A2UINode],
      },
      {
        type: "container",
        style: {
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 1rem",
        },
        children: [
          {
            type: "card",
            style: {
              width: "100%",
              maxWidth: "28rem",
              padding: "2rem",
              boxShadow: "0 10px 20px rgba(0, 0, 0, 0.15)",
            },
            children: [buildLoginPage()],
          },
        ],
      },
    ],
  }

  return <A2UIRenderer node={pageNode} onAction={handleAction} />
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" />}>
      <LoginPageContent />
    </Suspense>
  )
}
