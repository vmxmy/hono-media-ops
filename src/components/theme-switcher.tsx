"use client"

import { useState, useRef, useEffect } from "react"
import { useTheme, type PaletteTheme } from "@/contexts/theme-context"
import { useI18n, type Locale } from "@/contexts/i18n-context"
import { tweakcnThemes } from "@/lib/tweakcn-themes"

export function ThemeSwitcher() {
  const { appearance, palette, setAppearance, setPalette } = useTheme()
  const { locale, setLocale, t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Determine if we're in dark mode
  useEffect(() => {
    const checkDark = () => {
      if (appearance === "dark") return true
      if (appearance === "light") return false
      // system mode - check media query
      return window.matchMedia("(prefers-color-scheme: dark)").matches
    }
    setIsDark(checkDark())

    if (appearance === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
      mediaQuery.addEventListener("change", handler)
      return () => mediaQuery.removeEventListener("change", handler)
    }
  }, [appearance])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/80"
        title={t("settings.title")}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-border bg-popover p-3 shadow-lg">
          {/* Language */}
          <div className="mb-3">
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              {t("settings.language")}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setLocale("zh-CN")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  locale === "zh-CN"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                中文
              </button>
              <button
                onClick={() => setLocale("en")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  locale === "en"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Appearance */}
          <div className="mb-3">
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              {t("settings.appearance")}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setAppearance("light")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  appearance === "light"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
                {t("settings.light")}
              </button>
              <button
                onClick={() => setAppearance("dark")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  appearance === "dark"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
                {t("settings.dark")}
              </button>
              <button
                onClick={() => setAppearance("system")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  appearance === "system"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
                {t("settings.auto")}
              </button>
            </div>
          </div>

          {/* Theme */}
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              {t("settings.theme")}
            </div>
            <div className="max-h-48 overflow-y-auto scrollbar-thin">
              <button
                onClick={() => {
                  setPalette(null)
                  setIsOpen(false)
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  !palette
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-secondary"
                }`}
              >
                <div className="flex gap-0.5">
                  <span className="h-4 w-4 rounded-full bg-primary" />
                </div>
                {t("settings.defaultTheme")}
              </button>
              {tweakcnThemes.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => {
                    setPalette(theme.name as PaletteTheme)
                    setIsOpen(false)
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                    palette === theme.name
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-secondary"
                  }`}
                >
                  <ThemePreview themeName={theme.name} isDark={isDark} />
                  {theme.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ThemePreview({ themeName, isDark }: { themeName: string; isDark: boolean }) {
  // Need both theme class AND light/dark class for CSS variables to apply
  const themeClass = `theme-${themeName} ${isDark ? "dark" : "light"}`
  return (
    <div className={`${themeClass} flex gap-0.5`} style={{ isolation: "isolate" }}>
      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: "var(--ds-primary)" }} />
      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: "var(--ds-secondary)" }} />
      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: "var(--ds-accent)" }} />
    </div>
  )
}
