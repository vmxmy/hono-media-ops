"use client"

import { useCallback, useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIToaster } from "@/components/a2ui"

interface AppLayoutProps {
  children: React.ReactNode
  onLogout: () => void
}

export function AppLayout({ children, onLogout }: AppLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useI18n()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navItems = [
    { key: "tasks", path: "/tasks", label: t("nav.tasks") },
    { key: "reverse", path: "/reverse", label: t("nav.reverse") },
    { key: "insights", path: "/insights", label: t("nav.insights") },
    { key: "prompts", path: "/prompts", label: t("nav.prompts") },
  ]

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleNavigate = useCallback(
    (path: string) => {
      router.push(path)
      setIsMobileMenuOpen(false)
    },
    [router]
  )

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile by default, shown when menu is open */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-64 border-r border-border bg-card transition-transform duration-200 ease-in-out md:w-56 md:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo with close button on mobile */}
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <span className="text-lg font-semibold">{t("app.title")}</span>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent md:hidden"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => handleNavigate(item.path)}
                className={`flex w-full items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  pathname === item.path
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Mobile logout button */}
          <div className="border-t border-border p-3 md:hidden">
            <button
              onClick={onLogout}
              className="flex w-full items-center rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {t("auth.logout")}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content - full width on mobile, offset on desktop */}
      <div className="flex flex-1 flex-col md:ml-56">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-background px-4 md:justify-end md:px-6">
          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent md:hidden"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <button
              onClick={onLogout}
              className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:block"
            >
              {t("auth.logout")}
            </button>
          </div>
        </header>

        {/* Page content - responsive padding */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      {/* A2UI Toast Provider */}
      <A2UIToaster />
    </div>
  )
}
