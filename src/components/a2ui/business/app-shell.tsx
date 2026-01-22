"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Pencil, BookOpen, Newspaper, BarChart3, Image, Images, User, Zap, Library, ChevronDown } from "lucide-react"
import type {
  A2UIAppShellNode,
  A2UINode,
  A2UIButtonNode,
  A2UIThemeSwitcherNode,
} from "@/lib/a2ui"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"
import { dispatchA2UIAction } from "@/lib/a2ui/registry"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { A2UIRenderer } from "@/components/a2ui/renderer"
import { A2UIToaster } from "../toaster"
import { CreateHubModal } from "@/components/create-hub-modal"
import { CreateTaskModal } from "@/components/create-task-modal"
import { CreateXhsImageModal } from "@/components/create-xhs-image-modal"
import { useI18n } from "@/contexts/i18n-context"
import type { NavEntry } from "@/lib/navigation"

export function A2UIThemeSwitcher({
  node,
}: A2UIComponentProps<A2UIThemeSwitcherNode>) {
  return (
    <div style={node.style}>
      <ThemeSwitcher />
    </div>
  )
}

const NavIcons: Record<string, React.ReactNode> = {
  pipeline: <Zap className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
  tasks: <Pencil className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
  articles: <BookOpen className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
  wechatArticles: <Library className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
  reverse: <Newspaper className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
  xhsImages: <Images className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
  insights: <BarChart3 className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
  prompts: <Image className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
  analytics: <BarChart3 className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
  materials: <Library className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
  taskAnalytics: <BarChart3 className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
  imagePromptAnalytics: <Image className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
  xhsAnalytics: <Images className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
  wechatArticleAnalytics: <Library className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
  pipelineAnalytics: <Zap className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
  embeddingAnalytics: <BarChart3 className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
}

export function A2UIAppShell({
  node,
  onAction,
  renderChildren,
}: A2UIComponentProps<A2UIAppShellNode>) {
  const router = useRouter()
  const { status } = useSession()
  const { t } = useI18n()
  const isAuthenticated = status === "authenticated"
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  // Support both flat navItems and grouped navEntries
  const navEntries = (node.navEntries ?? node.navItems.map(item => ({ ...item, type: undefined }))) as NavEntry[]
  const activeItem = navEntries
    .flatMap(entry => (entry as any).type === "group" ? (entry as any).items : [entry])
    .find((item: any) => item.path === node.activePath)
  const homePath = navEntries[0] && "path" in navEntries[0] ? navEntries[0].path : "/"

  // Create Hub modal state
  const [isCreateHubOpen, setIsCreateHubOpen] = useState(false)
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [isCreateXhsImageOpen, setIsCreateXhsImageOpen] = useState(false)
  const [taskInitialData, setTaskInitialData] = useState<{ refMaterialId?: string } | undefined>()

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved !== null) {
      setIsCollapsed(saved === "true")
    }
    // Load expanded groups state
    const savedGroups = localStorage.getItem("nav-groups-expanded")
    if (savedGroups) {
      try {
        setExpandedGroups(JSON.parse(savedGroups))
      } catch (e) {
        // ignore parse errors
      }
    }
  }, [])

  const toggleCollapsed = () => {
    const newValue = !isCollapsed
    setIsCollapsed(newValue)
    localStorage.setItem("sidebar-collapsed", String(newValue))
  }

  const toggleGroup = (groupKey: string) => {
    const newValue = !expandedGroups[groupKey]
    const newGroups = { ...expandedGroups, [groupKey]: newValue }
    setExpandedGroups(newGroups)
    localStorage.setItem("nav-groups-expanded", JSON.stringify(newGroups))
  }

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [node.activePath])

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
      dispatchA2UIAction(onAction, node.onNavigate, [path])
      setIsMobileMenuOpen(false)
      setIsUserMenuOpen(false)
    },
    [node.onNavigate, onAction]
  )

  const handleHome = useCallback(() => {
    dispatchA2UIAction(onAction, node.onNavigate, [homePath])
    setIsMobileMenuOpen(false)
  }, [node.onNavigate, onAction, homePath])

  const handleLogout = useCallback(() => {
    dispatchA2UIAction(onAction, node.onLogout)
    setIsUserMenuOpen(false)
  }, [node.onLogout, onAction])

  // Handle starting writing from Create Hub
  const handleStartWriting = useCallback((materialId?: string) => {
    setIsCreateHubOpen(false)
    setTaskInitialData(materialId ? { refMaterialId: materialId } : undefined)
    setIsCreateTaskOpen(true)
  }, [])

  // Handle generating XHS images from Create Hub
  const handleGenerateXhsImages = useCallback(() => {
    setIsCreateHubOpen(false)
    setIsCreateXhsImageOpen(true)
  }, [])

  // Handle task creation success
  const handleTaskSuccess = useCallback(() => {
    setIsCreateTaskOpen(false)
    setTaskInitialData(undefined)
    // Navigate to tasks page if not already there
    if (node.activePath !== "/tasks") {
      router.push("/tasks")
    }
  }, [node.activePath, router])

  const handleHeaderAction = useCallback(
    (action: string, args?: unknown[]) => {
      if (action === "openCreateHub") {
        setIsCreateHubOpen(true)
        return
      }
      onAction?.(action, args)
    },
    [onAction]
  )

  const headerActions = node.headerActions as A2UINode[] | undefined
  const createButtonNode: A2UIButtonNode = {
    type: "button",
    text: t("createHub.title"),
    variant: "primary",
    size: "md",
    icon: "plus",
    hideLabelOn: "sm",
    onClick: { action: "openCreateHub" },
  }
  const headerActionNodes = isAuthenticated
    ? [createButtonNode, ...(headerActions ?? [])]
    : headerActions

  return (
    <div className="flex h-screen overflow-hidden bg-background" style={node.style}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:text-foreground focus:shadow"
      >
        跳到主内容
      </a>
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen border-r border-border bg-card transition-all duration-200 ease-in-out md:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"
        } ${isCollapsed ? "md:w-16" : "md:w-56"}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center justify-between border-b border-border px-3">
            <Link
              href={homePath}
              onClick={handleHome}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              title={node.brand ?? "Home"}
              aria-label={node.brand ?? "Home"}
            >
              {node.logoSrc ? (
                <img
                  src={node.logoSrc}
                  alt={node.logoAlt ?? node.brand ?? ""}
                  className={`object-contain ${isCollapsed ? "h-8 w-8" : "h-8 w-auto"}`}
                />
              ) : (
                !isCollapsed && <span className="text-lg font-semibold text-foreground">{node.brand}</span>
              )}
              {!isCollapsed && node.brand && (
                <span className="text-sm font-medium text-muted-foreground">
                  {node.brand}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden"
              aria-label="关闭菜单"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 space-y-1 p-2 overflow-y-auto" id="app-shell-nav">
            {navEntries.map((entry) => {
              // Regular nav item
              if (!("type" in entry) || !entry.type) {
                const item = entry as any
                const isActive = node.activePath === item.path
                const icon = NavIcons[item.key]
                const showLabel = isMobileMenuOpen || !isCollapsed
                return (
                  <Link
                    key={item.key}
                    href={item.path}
                    onClick={() => handleNavigate(item.path)}
                    title={!showLabel ? item.label : undefined}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    } ${!showLabel ? "justify-center px-2 md:justify-center md:px-2" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {icon}
                    {showLabel && <span>{item.label}</span>}
                  </Link>
                )
              }

              // Nav group
              if (entry.type === "group") {
                const group = entry as any
                const showLabel = isMobileMenuOpen || !isCollapsed
                const isExpanded = expandedGroups[group.key] ?? false
                const groupIcon = NavIcons[group.key]

                // When collapsed, don't show groups at all
                if (!showLabel) {
                  return null
                }

                return (
                  <div key={group.key}>
                    {group.collapsible ? (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.key)}
                          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground mt-2"
                          aria-expanded={isExpanded}
                        >
                          {groupIcon}
                          <span className="flex-1 text-left">{group.label}</span>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            aria-hidden="true"
                          />
                        </button>
                        {isExpanded && (
                          <div className="space-y-1 pl-4">
                            {group.items.map((item: any) => {
                              const isActive = node.activePath === item.path
                              return (
                                <Link
                                  key={item.key}
                                  href={item.path}
                                  onClick={() => handleNavigate(item.path)}
                                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                                    isActive
                                      ? "bg-primary text-primary-foreground"
                                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                  }`}
                                  aria-current={isActive ? "page" : undefined}
                                >
                                  <span>{item.label}</span>
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      // Non-collapsible group (just render items directly)
                      group.items.map((item: any) => {
                        const isActive = node.activePath === item.path
                        const icon = NavIcons[item.key]
                        return (
                          <Link
                            key={item.key}
                            href={item.path}
                            onClick={() => handleNavigate(item.path)}
                            className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            }`}
                            aria-current={isActive ? "page" : undefined}
                          >
                            {icon}
                            <span>{item.label}</span>
                          </Link>
                        )
                      })
                    )}
                  </div>
                )
              }

              return null
            })}
          </nav>

          <div className="hidden border-t border-border p-2 md:block">
            <button
              onClick={toggleCollapsed}
              className="flex w-full items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              title={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
              aria-label={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
            >
              <svg
                className={`h-5 w-5 transition-transform ${isCollapsed ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {node.onLogout && (
            <div className="border-t border-border p-3 md:hidden">
              <button
                onClick={handleLogout}
                className="flex w-full items-center rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {node.logoutLabel ?? "退出"}
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden transition-all duration-200 ${isCollapsed ? "md:ml-16" : "md:ml-56"}`}>
        <header className="z-30 flex h-14 flex-shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 md:px-6">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden"
            aria-label="打开菜单"
            aria-expanded={isMobileMenuOpen}
            aria-controls="app-shell-nav"
            type="button"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex flex-1 items-center gap-4">
            <div className="hidden items-center gap-2 md:flex">
              {node.logoSrc && (
                <img
                  src={node.logoSrc}
                  alt={node.logoAlt ?? node.brand ?? ""}
                  className="h-6 w-6 rounded-md object-contain"
                />
              )}
              <span className="text-sm font-semibold text-foreground">
                {activeItem?.label ?? node.brand ?? ""}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {headerActionNodes && (
                <A2UIRenderer node={headerActionNodes} onAction={handleHeaderAction} />
              )}
              {node.onLogout && (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen((prev) => !prev)}
                    className="flex items-center justify-center rounded-md border border-border p-2 text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label="用户中心"
                    aria-expanded={isUserMenuOpen}
                    aria-controls="user-menu"
                    type="button"
                  >
                    <User className="h-4 w-4" aria-hidden="true" />
                  </button>
                  {isUserMenuOpen && (
                    <div
                      id="user-menu"
                      className="absolute right-0 top-10 z-40 w-40 rounded-md border border-border bg-popover shadow-lg"
                      role="menu"
                    >
                      <Link
                        href="/profile"
                        onClick={() => handleNavigate("/profile")}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        role="menuitem"
                      >
                        个人资料
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        role="menuitem"
                        type="button"
                      >
                        {node.logoutLabel ?? "退出"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <main id="main-content" className="flex min-h-0 flex-1 flex-col overflow-auto p-4 md:p-6">
          {node.children && renderChildren?.(node.children)}
        </main>
      </div>

      <A2UIToaster />

      {/* Create Hub Modal */}
      <CreateHubModal
        isOpen={isCreateHubOpen}
        onClose={() => setIsCreateHubOpen(false)}
        onStartWriting={handleStartWriting}
        onGenerateXhsImages={handleGenerateXhsImages}
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

      {/* Create XHS Image Modal */}
      <CreateXhsImageModal
        isOpen={isCreateXhsImageOpen}
        onClose={() => setIsCreateXhsImageOpen(false)}
      />
    </div>
  )
}
