"use client"

import { useCallback } from "react"
import { signOut, useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UIAppShellNode } from "@/lib/a2ui"
import { useI18n } from "@/contexts/i18n-context"
import { buildGroupedNavItems } from "@/lib/navigation"

interface DashboardShellProps {
  children: React.ReactNode
}

/**
 * Shared dashboard shell with navigation
 * All authenticated pages should wrap their content with this component
 */
export function DashboardShell({ children }: DashboardShellProps) {
  const { t } = useI18n()
  const { status } = useSession()
  const pathname = usePathname()

  const handleAction = useCallback(
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "navigate": {
          const href = args?.[0] as string
          if (href) window.location.href = href
          break
        }
        case "logout":
          signOut({ callbackUrl: "/login" })
          break
      }
    },
    []
  )

  if (status === "loading") {
    return null
  }

  const appShellNode: A2UIAppShellNode = {
    type: "app-shell",
    brand: t("app.title"),
    logoSrc: "/logo.png",
    logoAlt: "Wonton",
    navItems: [], // Keep for backwards compatibility
    navEntries: buildGroupedNavItems(t),
    activePath: pathname,
    onNavigate: { action: "navigate" },
    onLogout: { action: "logout" },
    children: [
      {
        type: "container",
        children: [children as any],
      },
    ],
  }

  return <A2UIRenderer node={appShellNode} onAction={handleAction} />
}
