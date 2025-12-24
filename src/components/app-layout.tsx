"use client"

import { useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { useI18n } from "@/contexts/i18n-context"

interface AppLayoutProps {
  children: React.ReactNode
  onLogout: () => void
}

export function AppLayout({ children, onLogout }: AppLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useI18n()

  const navItems = [
    { key: "tasks", path: "/tasks", label: t("nav.tasks") },
    { key: "reverse", path: "/reverse", label: t("nav.reverse") },
    { key: "insights", path: "/insights", label: t("nav.insights") },
    { key: "prompts", path: "/prompts", label: t("nav.prompts") },
  ]

  const handleNavigate = useCallback(
    (path: string) => {
      router.push(path)
    },
    [router]
  )

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-56 border-r border-border bg-card">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-14 items-center border-b border-border px-4">
            <span className="text-lg font-semibold">{t("app.title")}</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => handleNavigate(item.path)}
                className={`flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === item.path
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="ml-56 flex flex-1 flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-4 border-b border-border bg-background px-6">
          <ThemeSwitcher />
          <button
            onClick={onLogout}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {t("auth.logout")}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
