"use client"

import { useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UINavNode, A2UINode } from "@/lib/a2ui"

interface NavigationHeaderProps {
  onLogout: () => void
}

export function NavigationHeader({ onLogout }: NavigationHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useI18n()

  const handleAction = useCallback(
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "navigate":
          const href = args?.[0] as string
          if (href) router.push(href)
          break
        case "logout":
          onLogout()
          break
      }
    },
    [router, onLogout]
  )

  const navChildren: A2UINode[] = [
    { type: "nav-link", text: t("nav.tasks"), active: pathname === "/tasks", onClick: { action: "navigate", args: ["/tasks"] } },
    { type: "nav-link", text: t("nav.reverse"), active: pathname === "/reverse", onClick: { action: "navigate", args: ["/reverse"] } },
    { type: "nav-link", text: t("nav.insights"), active: pathname === "/insights", onClick: { action: "navigate", args: ["/insights"] } },
    { type: "nav-link", text: t("nav.prompts"), active: pathname === "/prompts", onClick: { action: "navigate", args: ["/prompts"] } },
    { type: "spacer" },
    { type: "button", text: t("auth.logout"), variant: "secondary", size: "sm", onClick: { action: "logout" } },
  ]

  const navNode: A2UINavNode = {
    type: "nav",
    brand: t("app.title"),
    children: navChildren,
  }

  const themeNode: A2UINode = {
    type: "theme-switcher",
  }

  return (
    <header>
      <div className="relative">
        <A2UIRenderer node={navNode} onAction={handleAction} />
        <div className="absolute right-20 top-1/2 -translate-y-1/2">
          <A2UIRenderer node={themeNode} />
        </div>
      </div>
    </header>
  )
}
