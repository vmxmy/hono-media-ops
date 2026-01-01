"use client"

import { useState, useCallback, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer, a2uiToast } from "@/components/a2ui"
import type { A2UIAppShellNode, A2UIColumnNode, A2UINode, A2UIRowNode, A2UITabsNode } from "@/lib/a2ui"
import { buildNavItems } from "@/lib/navigation"

type StorageProvider = "local" | "r2" | "s3"

export default function ProfilePage() {
  const { t } = useI18n()
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const mounted = status !== "loading"
  const logout = () => signOut({ callbackUrl: "/login" })
  const navItems = buildNavItems(t)

  // Profile queries and mutations
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

  // Storage config queries and mutations
  const { data: storageConfig, refetch: refetchStorageConfig } = api.userStorageConfig.get.useQuery(
    undefined,
    { enabled: mounted }
  )
  const upsertStorageConfig = api.userStorageConfig.upsert.useMutation({
    onSuccess: () => {
      a2uiToast.success(t("profile.storageSaved"))
      void refetchStorageConfig()
    },
    onError: (error) => {
      a2uiToast.error(error.message)
    },
  })
  const testStorageConnection = api.userStorageConfig.testConnection.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        a2uiToast.success(t("profile.storageTestSuccess"))
      } else {
        a2uiToast.error(`${t("profile.storageTestFailed")}: ${result.error}`)
      }
    },
    onError: (error) => {
      a2uiToast.error(`${t("profile.storageTestFailed")}: ${error.message}`)
    },
  })
  const setStorageActive = api.userStorageConfig.setActive.useMutation({
    onSuccess: () => {
      void refetchStorageConfig()
    },
    onError: (error) => {
      a2uiToast.error(error.message)
    },
  })

  // Profile state
  const [displayName, setDisplayName] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Storage config state
  const [storageProvider, setStorageProvider] = useState<StorageProvider>("local")
  const [storageBucket, setStorageBucket] = useState("")
  const [storageAccessKey, setStorageAccessKey] = useState("")
  const [storageSecretKey, setStorageSecretKey] = useState("")
  const [storagePublicDomain, setStoragePublicDomain] = useState("")
  const [storageR2AccountId, setStorageR2AccountId] = useState("")
  const [storageS3Region, setStorageS3Region] = useState("us-east-1")
  const [storageS3Endpoint, setStorageS3Endpoint] = useState("")
  const [storageConfigName, setStorageConfigName] = useState("")
  const [storageConfigInitialized, setStorageConfigInitialized] = useState(false)

  // Sync profile name from API
  useEffect(() => {
    if (profile?.name) {
      setDisplayName(profile.name)
    }
  }, [profile?.name])

  // Sync storage config from API (only on initial load)
  useEffect(() => {
    if (storageConfig && !storageConfigInitialized) {
      setStorageProvider(storageConfig.provider)
      setStorageBucket(storageConfig.bucket ?? "")
      setStorageAccessKey(storageConfig.accessKeyId ?? "")
      setStoragePublicDomain(storageConfig.publicDomain ?? "")
      setStorageR2AccountId(storageConfig.r2AccountId ?? "")
      setStorageS3Region(storageConfig.s3Region ?? "us-east-1")
      setStorageS3Endpoint(storageConfig.s3Endpoint ?? "")
      setStorageConfigName(storageConfig.name ?? "")
      setStorageConfigInitialized(true)
      // Don't sync secret key - it's never returned
    }
  }, [storageConfig, storageConfigInitialized])

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

        // Profile actions
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

        // Storage config actions
        case "setStorageProvider":
          setStorageProvider(args?.[0] as StorageProvider)
          break
        case "setStorageBucket":
          setStorageBucket(args?.[0] as string)
          break
        case "setStorageAccessKey":
          setStorageAccessKey(args?.[0] as string)
          break
        case "setStorageSecretKey":
          setStorageSecretKey(args?.[0] as string)
          break
        case "setStoragePublicDomain":
          setStoragePublicDomain(args?.[0] as string)
          break
        case "setStorageR2AccountId":
          setStorageR2AccountId(args?.[0] as string)
          break
        case "setStorageS3Region":
          setStorageS3Region(args?.[0] as string)
          break
        case "setStorageS3Endpoint":
          setStorageS3Endpoint(args?.[0] as string)
          break
        case "setStorageConfigName":
          setStorageConfigName(args?.[0] as string)
          break
        case "saveStorageConfig":
          upsertStorageConfig.mutate({
            provider: storageProvider,
            bucket: storageBucket || undefined,
            accessKeyId: storageAccessKey || undefined,
            secretAccessKey: storageSecretKey || undefined,
            publicDomain: storagePublicDomain || undefined,
            r2AccountId: storageR2AccountId || undefined,
            s3Region: storageS3Region || undefined,
            s3Endpoint: storageS3Endpoint || undefined,
            name: storageConfigName || undefined,
          })
          break
        case "testStorageConnection":
          // Pass current form values for testing (allows testing unsaved config)
          testStorageConnection.mutate({
            provider: storageProvider,
            bucket: storageBucket || undefined,
            accessKeyId: storageAccessKey || undefined,
            secretAccessKey: storageSecretKey || undefined,
            publicDomain: storagePublicDomain || undefined,
            r2AccountId: storageR2AccountId || undefined,
            s3Region: storageS3Region || undefined,
            s3Endpoint: storageS3Endpoint || undefined,
          })
          break
        case "toggleStorageActive":
          if (storageConfig) {
            setStorageActive.mutate({ isActive: !storageConfig.isActive })
          }
          break
      }
    },
    [
      router, logout,
      displayName, currentPassword, newPassword, confirmPassword, updateProfile, updatePassword,
      storageProvider, storageBucket, storageAccessKey, storageSecretKey, storagePublicDomain,
      storageR2AccountId, storageS3Region, storageS3Endpoint, storageConfigName,
      storageConfig, upsertStorageConfig, testStorageConnection, setStorageActive,
      t
    ]
  )

  const profileCard: A2UINode = {
    type: "card",
    children: [
      {
        type: "form",
        id: "profile-form",
        onSubmit: { action: "saveProfile" },
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
                    id: "display-name",
                    name: "display-name",
                    value: displayName,
                    placeholder: t("profile.displayNamePlaceholder"),
                    autocomplete: "name",
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
                    buttonType: "submit",
                    disabled: updateProfile.isPending,
                  },
                ],
              } as A2UIRowNode,
            ],
          },
        ],
      },
    ],
  }

  const passwordCard: A2UINode = {
    type: "card",
    children: [
      {
        type: "form",
        id: "password-form",
        onSubmit: { action: "savePassword" },
        children: [
          {
            type: "column",
            gap: "1rem",
            children: [
              { type: "text", text: t("profile.passwordTitle"), variant: "h3", weight: "semibold" },
              // Hidden username field for password managers accessibility
              {
                type: "input",
                id: "username-for-password",
                name: "username",
                value: profile?.email ?? profile?.name ?? "",
                inputType: "text",
                autocomplete: "username",
                style: { display: "none" },
              } as A2UINode,
              {
                type: "form-field",
                label: t("profile.currentPassword"),
                required: true,
                children: [
                  {
                    type: "input",
                    id: "current-password",
                    name: "current-password",
                    value: currentPassword,
                    placeholder: t("profile.currentPasswordPlaceholder"),
                    inputType: "password",
                    autocomplete: "current-password",
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
                    id: "new-password",
                    name: "new-password",
                    value: newPassword,
                    placeholder: t("profile.newPasswordPlaceholder"),
                    inputType: "password",
                    autocomplete: "new-password",
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
                    id: "confirm-password",
                    name: "confirm-password",
                    value: confirmPassword,
                    placeholder: t("profile.confirmPasswordPlaceholder"),
                    inputType: "password",
                    autocomplete: "new-password",
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
                    buttonType: "submit",
                    disabled: updatePassword.isPending,
                  },
                ],
              } as A2UIRowNode,
            ],
          },
        ],
      },
    ],
  }

  // Build storage config form fields based on provider
  const buildStorageFields = (): A2UINode[] => {
    const fields: A2UINode[] = []

    // Common fields for R2 and S3
    if (storageProvider !== "local") {
      fields.push(
        {
          type: "form-field",
          label: t("profile.storageBucket"),
          required: true,
          children: [
            {
              type: "input",
              value: storageBucket,
              placeholder: "my-bucket",
              onChange: { action: "setStorageBucket" },
            } as A2UINode,
          ],
        },
        {
          type: "form-field",
          label: t("profile.storageAccessKey"),
          required: true,
          children: [
            {
              type: "input",
              value: storageAccessKey,
              placeholder: "AKIAIOSFODNN7EXAMPLE",
              onChange: { action: "setStorageAccessKey" },
            } as A2UINode,
          ],
        },
        {
          type: "form-field",
          label: t("profile.storageSecretKey"),
          required: !storageConfig?.hasSecretKey,
          children: [
            {
              type: "input",
              value: storageSecretKey,
              placeholder: storageConfig?.hasSecretKey ? "••••••••••••" : "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
              inputType: "password",
              onChange: { action: "setStorageSecretKey" },
            } as A2UINode,
          ],
        },
        {
          type: "form-field",
          label: t("profile.storagePublicDomain"),
          required: true,
          children: [
            {
              type: "input",
              value: storagePublicDomain,
              placeholder: "https://cdn.example.com",
              onChange: { action: "setStoragePublicDomain" },
            } as A2UINode,
          ],
        }
      )
    }

    // R2 specific
    if (storageProvider === "r2") {
      fields.push({
        type: "form-field",
        label: t("profile.storageR2AccountId"),
        required: true,
        children: [
          {
            type: "input",
            value: storageR2AccountId,
            placeholder: "abc123def456",
            onChange: { action: "setStorageR2AccountId" },
          } as A2UINode,
        ],
      })
    }

    // S3 specific
    if (storageProvider === "s3") {
      fields.push(
        {
          type: "form-field",
          label: t("profile.storageS3Region"),
          required: true,
          children: [
            {
              type: "input",
              value: storageS3Region,
              placeholder: "us-east-1",
              onChange: { action: "setStorageS3Region" },
            } as A2UINode,
          ],
        },
        {
          type: "form-field",
          label: t("profile.storageS3Endpoint"),
          children: [
            {
              type: "input",
              value: storageS3Endpoint,
              placeholder: "https://s3.amazonaws.com",
              onChange: { action: "setStorageS3Endpoint" },
            } as A2UINode,
          ],
        }
      )
    }

    // Config name (optional, for all providers)
    if (storageProvider !== "local") {
      fields.push({
        type: "form-field",
        label: t("profile.storageConfigName"),
        children: [
          {
            type: "input",
            value: storageConfigName,
            placeholder: "My Storage",
            onChange: { action: "setStorageConfigName" },
          } as A2UINode,
        ],
      })
    }

    return fields
  }

  const storageCard: A2UINode = {
    type: "card",
    children: [
      {
        type: "column",
        gap: "1rem",
        children: [
          // Header with status badge
          {
            type: "row",
            justify: "between",
            align: "center",
            children: [
              { type: "text", text: t("profile.storageTitle"), variant: "h3", weight: "semibold" },
              storageConfig && storageProvider !== "local" ? {
                type: "badge",
                text: storageConfig.isActive ? t("profile.storageActive") : t("profile.storageInactive"),
                color: storageConfig.isActive ? "completed" : "pending",
              } : null,
            ].filter(Boolean) as A2UINode[],
          } as A2UIRowNode,

          // Provider selector
          {
            type: "form-field",
            label: t("profile.storageProvider"),
            children: [
              {
                type: "select",
                value: storageProvider,
                options: [
                  { value: "local", label: t("profile.storageLocal") },
                  { value: "r2", label: t("profile.storageR2") },
                  { value: "s3", label: t("profile.storageS3") },
                ],
                onChange: { action: "setStorageProvider" },
              } as A2UINode,
            ],
          },

          // Dynamic fields based on provider
          ...buildStorageFields(),

          // Action buttons
          {
            type: "row",
            gap: "0.5rem",
            justify: "end",
            children: [
              // Test connection button (for R2/S3, works with unsaved config too)
              ...(storageProvider !== "local" ? [{
                type: "button",
                text: t("profile.storageTest"),
                variant: "outline",
                onClick: { action: "testStorageConnection" },
                disabled: testStorageConnection.isPending,
              }] : []),
              // Activate/Deactivate button (only for R2/S3 with saved config)
              ...(storageProvider !== "local" && storageConfig ? [{
                type: "button",
                text: storageConfig.isActive ? t("profile.storageDeactivate") : t("profile.storageActivate"),
                variant: storageConfig.isActive ? "destructive" : "secondary",
                onClick: { action: "toggleStorageActive" },
                disabled: setStorageActive.isPending,
              }] : []),
              // Save button
              {
                type: "button",
                text: t("common.save"),
                variant: "primary",
                onClick: { action: "saveStorageConfig" },
                disabled: upsertStorageConfig.isPending,
              },
            ] as A2UINode[],
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
      {
        type: "tabs",
        tabs: [
          { label: t("profile.tabProfile"), content: profileCard },
          { label: t("profile.tabPassword"), content: passwordCard },
          { label: t("profile.tabStorage"), content: storageCard },
        ],
      } as A2UITabsNode,
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
