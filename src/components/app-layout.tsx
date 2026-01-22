"use client"

import { useCallback, useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer, A2UIToaster } from "@/components/a2ui"
import type { A2UINode, A2UIButtonNode } from "@/lib/a2ui"
import { CreateHubModal } from "@/components/create-hub-modal"
import { CreateTaskModal } from "@/components/create-task-modal"

interface AppLayoutProps {
  children: React.ReactNode
  onLogout: () => void
}

// Nav item icons
const NavIcons = {
  tasks: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  reverse: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  articles: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  wechatArticles: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  xhsImages: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  prompts: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
    </svg>
  ),
  insights: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  analytics: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  chevronDown: (
    <svg className="h-4 w-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
}

export function AppLayout({ children, onLogout }: AppLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useI18n()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false)

  // Create Hub modal state
  const [isCreateHubOpen, setIsCreateHubOpen] = useState(false)
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [taskInitialData, setTaskInitialData] = useState<{ refMaterialId?: string } | undefined>()

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved !== null) {
      setIsCollapsed(saved === "true")
    }
    const analyticsState = localStorage.getItem("analytics-expanded")
    if (analyticsState !== null) {
      setAnalyticsExpanded(analyticsState === "true")
    }
  }, [])

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newValue = !isCollapsed
    setIsCollapsed(newValue)
    localStorage.setItem("sidebar-collapsed", String(newValue))
  }

  const toggleAnalytics = () => {
    const newValue = !analyticsExpanded
    setAnalyticsExpanded(newValue)
    localStorage.setItem("analytics-expanded", String(newValue))
  }

  const navItems = [
    // Core Functions
    { key: "tasks", path: "/tasks", label: t("nav.tasks"), icon: NavIcons.tasks },
    { key: "reverse", path: "/reverse", label: t("nav.reverse"), icon: NavIcons.reverse },

    // Content Management
    { key: "articles", path: "/articles", label: t("nav.articles"), icon: NavIcons.articles },
    { key: "wechatArticles", path: "/wechat-articles", label: t("nav.wechatArticles"), icon: NavIcons.wechatArticles },
    { key: "xhsImages", path: "/xhs-images", label: t("nav.xhsImages"), icon: NavIcons.xhsImages },

    // Resources
    { key: "prompts", path: "/prompts", label: t("nav.prompts"), icon: NavIcons.prompts },
    { key: "insights", path: "/insights", label: t("nav.insights"), icon: NavIcons.insights },
  ]

  const analyticsItems = [
    { key: "materials", path: "/materials", label: t("nav.materials") },
    { key: "taskAnalytics", path: "/task-analytics", label: t("nav.taskAnalytics") },
    { key: "imagePromptAnalytics", path: "/image-prompt-analytics", label: t("nav.imagePromptAnalytics") },
    { key: "xhsAnalytics", path: "/xhs-analytics", label: t("nav.xhsAnalytics") },
    { key: "wechatArticleAnalytics", path: "/wechat-article-analytics", label: t("nav.wechatArticleAnalytics") },
    { key: "pipelineAnalytics", path: "/pipeline-analytics", label: t("nav.pipelineAnalytics") },
    { key: "embeddingAnalytics", path: "/embedding-analytics", label: t("nav.embeddingAnalytics") },
  ]

  const themeNode: A2UINode = { type: "theme-switcher" }
  const createButtonNode: A2UIButtonNode = {
    type: "button",
    text: t("createHub.title"),
    variant: "primary",
    size: "md",
    icon: "plus",
    hideLabelOn: "sm",
    onClick: { action: "openCreateHub" },
  }

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

  // Handle starting writing from Create Hub
  const handleStartWriting = useCallback((materialId?: string) => {
    setIsCreateHubOpen(false)
    setTaskInitialData(materialId ? { refMaterialId: materialId } : undefined)
    setIsCreateTaskOpen(true)
  }, [])

  // Handle task creation success
  const handleTaskSuccess = useCallback(() => {
    setIsCreateTaskOpen(false)
    setTaskInitialData(undefined)
    // Navigate to tasks page if not already there
    if (pathname !== "/tasks") {
      router.push("/tasks")
    }
  }, [pathname, router])

  const handleHeaderAction = useCallback(
    (action: string) => {
      if (action === "openCreateHub") {
        setIsCreateHubOpen(true)
      }
    },
    []
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
        className={`fixed left-0 top-0 z-50 h-screen border-r border-border bg-card transition-all duration-200 ease-in-out md:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"
        } ${isCollapsed ? "md:w-16" : "md:w-56"}`}
      >
        <div className="flex h-full flex-col">
          {/* Logo with close button on mobile */}
          <div className="flex h-14 items-center justify-between border-b border-border px-3">
            {isCollapsed ? (
              <img src="/logo.png" alt="Wonton" className="mx-auto h-8 w-8 object-contain" />
            ) : (
              <img src="/logo.png" alt="Wonton" className="h-8 w-auto" />
            )}
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
          <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => handleNavigate(item.path)}
                title={isCollapsed ? item.label : undefined}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  pathname === item.path
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                } ${isCollapsed ? "justify-center px-2" : ""}`}
              >
                {item.icon}
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            ))}

            {/* Analytics Section */}
            {!isCollapsed && (
              <>
                <button
                  onClick={toggleAnalytics}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground mt-2"
                >
                  {NavIcons.analytics}
                  <span className="flex-1 text-left">{t("nav.analytics")}</span>
                  <span className={analyticsExpanded ? "rotate-180" : ""}>
                    {NavIcons.chevronDown}
                  </span>
                </button>
                {analyticsExpanded && (
                  <div className="space-y-1 pl-4">
                    {analyticsItems.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => handleNavigate(item.path)}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                          pathname === item.path
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </nav>

          {/* Collapse toggle button (desktop only) */}
          <div className="hidden border-t border-border p-2 md:block">
            <button
              onClick={toggleCollapsed}
              className="flex w-full items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              title={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
            >
              <svg
                className={`h-5 w-5 transition-transform ${isCollapsed ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

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
      <div className={`flex flex-1 flex-col transition-all duration-200 ${isCollapsed ? "md:ml-16" : "md:ml-56"}`}>
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

          <div className="flex items-center gap-3">
            {/* Create Button */}
            <A2UIRenderer node={createButtonNode} onAction={handleHeaderAction} />
            <A2UIRenderer node={themeNode} />
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

      {/* Create Hub Modal */}
      <CreateHubModal
        isOpen={isCreateHubOpen}
        onClose={() => setIsCreateHubOpen(false)}
        onStartWriting={handleStartWriting}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => {
          setIsCreateTaskOpen(false)
          setTaskInitialData(undefined)
        }}
        onSuccess={handleTaskSuccess}
        initialData={taskInitialData}
      />
    </div>
  )
}
