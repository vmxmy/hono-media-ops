"use client"

import { useState, useCallback, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer, a2uiToast } from "@/components/a2ui"
import type { A2UIAppShellNode, A2UIColumnNode, A2UINode, A2UIRowNode } from "@/lib/a2ui"
import { buildNavItems } from "@/lib/navigation"

export default function ProfilePage() {
  const { t } = useI18n()
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const mounted = status !== "loading"
  const logout = () => signOut({ callbackUrl: "/" })
  const navItems = buildNavItems(t)

  const { data: profile } = api.users.getProfile.useQuery(undefined, { enabled: mounted })
  const updateProfile = api.users.updateProfile.useMutation({
    onSuccess: () => {
      a2uiToast.success(t("profile.profileUpdated"))
    },
  })
  const updatePassword = api.users.updatePassword.useMutation({
    onSuccess: () => {
      a2uiToast.success(t("profile.passwordUpdated"))
    },
  })

  const [displayName, setDisplayName] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  useEffect(() => {
    if (profile?.name) {
      setDisplayName(profile.name)
    }
  }, [profile?.name])

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
        case "setDisplayName":
          setDisplayName(args?.[0] as string)
          break
        case "setCurrentPassword":
          setCurrentPassword(args?.[0] as string)
          break
        case "setNewPassword":
          setNewPassword(args?.[0] as string)
          break
        case "setConfirmPassword":
          setConfirmPassword(args?.[0] as string)
          break
        case "saveProfile": {
          const trimmed = displayName.trim()
          if (!trimmed) {
            a2uiToast.error(t("profile.nameRequired"))
            return
          }
          updateProfile.mutate({ name: trimmed })
          break
        }
        case "savePassword": {
          if (newPassword !== confirmPassword) {
            a2uiToast.error(t("profile.passwordMismatch"))
            return
          }
          updatePassword.mutate({
            currentPassword,
            newPassword,
          }, {
            onSuccess: () => {
              setCurrentPassword("")
              setNewPassword("")
              setConfirmPassword("")
            },
            onError: (error) => {
              a2uiToast.error(error.message)
            },
          })
          break
        }
      }
    },
    [router, logout, displayName, currentPassword, newPassword, confirmPassword, updateProfile, updatePassword, t]
  )

  const profileCard: A2UINode = {
    type: "card",
    children: [
      {
        type: "column",
        gap: "1rem",
        children: [
          { type: "text", text: t("profile.profileTitle"), variant: "h3", weight: "semibold" },
          {
            type: "form-field",
            label: t("profile.displayName"),
            required: true,
            children: [
              {
                type: "input",
                value: displayName,
                placeholder: t("profile.displayNamePlaceholder"),
                onChange: { action: "setDisplayName" },
              } as A2UINode,
            ],
          },
          {
            type: "row",
            justify: "end",
            children: [
              {
                type: "button",
                text: t("common.save"),
                variant: "primary",
                onClick: { action: "saveProfile" },
                disabled: updateProfile.isPending,
              },
            ],
          } as A2UIRowNode,
        ],
      },
    ],
  }

  const passwordCard: A2UINode = {
    type: "card",
    children: [
      {
        type: "column",
        gap: "1rem",
        children: [
          { type: "text", text: t("profile.passwordTitle"), variant: "h3", weight: "semibold" },
          {
            type: "form-field",
            label: t("profile.currentPassword"),
            required: true,
            children: [
              {
                type: "input",
                value: currentPassword,
                placeholder: t("profile.currentPasswordPlaceholder"),
                inputType: "password",
                onChange: { action: "setCurrentPassword" },
              } as A2UINode,
            ],
          },
          {
            type: "form-field",
            label: t("profile.newPassword"),
            required: true,
            children: [
              {
                type: "input",
                value: newPassword,
                placeholder: t("profile.newPasswordPlaceholder"),
                inputType: "password",
                onChange: { action: "setNewPassword" },
              } as A2UINode,
            ],
          },
          {
            type: "form-field",
            label: t("profile.confirmPassword"),
            required: true,
            children: [
              {
                type: "input",
                value: confirmPassword,
                placeholder: t("profile.confirmPasswordPlaceholder"),
                inputType: "password",
                onChange: { action: "setConfirmPassword" },
              } as A2UINode,
            ],
          },
          {
            type: "row",
            justify: "end",
            children: [
              {
                type: "button",
                text: t("profile.updatePassword"),
                variant: "primary",
                onClick: { action: "savePassword" },
                disabled: updatePassword.isPending,
              },
            ],
          } as A2UIRowNode,
        ],
      },
    ],
  }

  const pageContent: A2UIColumnNode = {
    type: "column",
    gap: "1.5rem",
    children: [
      { type: "text", text: t("profile.title"), variant: "h2", weight: "bold" },
      profileCard,
      passwordCard,
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
    children: [
      {
        type: "container",
        style: { maxWidth: "960px", margin: "0 auto", width: "100%" },
        children: [pageContent],
      },
    ],
  }

  return <A2UIRenderer node={appShellNode} onAction={handleAction} />
}
