"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Pencil, BookOpen, Newspaper, BarChart3, Image, Images, User } from "lucide-react"
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
  tasks: <Pencil className="h-5 w-5 flex-shrink-0" />,
  articles: <BookOpen className="h-5 w-5 flex-shrink-0" />,
  reverse: <Newspaper className="h-5 w-5 flex-shrink-0" />,
  xhsImages: <Images className="h-5 w-5 flex-shrink-0" />,
  insights: <BarChart3 className="h-5 w-5 flex-shrink-0" />,
  prompts: <Image className="h-5 w-5 flex-shrink-0" />,
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
  const activeItem = node.navItems.find((item) => item.path === node.activePath)
  const homePath = node.navItems[0]?.path ?? "/"

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
  }, [])

  const toggleCollapsed = () => {
    const newValue = !isCollapsed
    setIsCollapsed(newValue)
    localStorage.setItem("sidebar-collapsed", String(newValue))
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
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen border-r border-border bg-card transition-all duration-200 ease-in-out md:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"
        } ${isCollapsed ? "md:w-16" : "md:w-56"}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center justify-between border-b border-border px-3">
            <button
              onClick={handleHome}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-accent"
              title={node.brand ?? "Home"}
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
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent md:hidden"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 space-y-1 p-2">
            {node.navItems.map((item) => {
              const isActive = node.activePath === item.path
              const icon = NavIcons[item.key]
              const showLabel = isMobileMenuOpen || !isCollapsed
              return (
                <button
                  key={item.key}
                  onClick={() => handleNavigate(item.path)}
                  title={!showLabel ? item.label : undefined}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  } ${!showLabel ? "justify-center px-2 md:justify-center md:px-2" : ""}`}
                >
                  {icon}
                  {showLabel && <span>{item.label}</span>}
                </button>
              )
            })}
          </nav>

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

          {node.onLogout && (
            <div className="border-t border-border p-3 md:hidden">
              <button
                onClick={handleLogout}
                className="flex w-full items-center rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
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
            className="rounded-md p-2 text-muted-foreground hover:bg-accent md:hidden"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="flex items-center justify-center rounded-md border border-border p-2 text-foreground transition-colors hover:bg-accent"
                    aria-label="用户中心"
                  >
                    <User className="h-4 w-4" />
                  </button>
                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-10 z-40 w-40 rounded-md border border-border bg-popover shadow-lg">
                      <button
                        onClick={() => handleNavigate("/profile")}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                      >
                        个人资料
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
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

        <main className="flex min-h-0 flex-1 flex-col overflow-auto p-4 md:p-6">
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
