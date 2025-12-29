"use client"

import { useState, useRef, useEffect } from "react"
import { useTheme, type PaletteTheme } from "@/contexts/theme-context"
import { useI18n, type Locale } from "@/contexts/i18n-context"
import { tweakcnThemes } from "@/lib/tweakcn-themes"
import { A2UIRenderer } from "@/components/a2ui"
import type { A2UINode } from "@/lib/a2ui"

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

  const handleAction = (action: string, args?: unknown[]) => {
    switch (action) {
      case "toggleOpen":
        setIsOpen((prev) => !prev)
        break
      case "setLocale": {
        const next = args?.[0] as Locale
        if (next) {
          setLocale(next)
          setIsOpen(false)
        }
        break
      }
      case "setAppearance": {
        const next = args?.[0] as "light" | "dark" | "system"
        if (next) {
          setAppearance(next)
        }
        break
      }
      case "setPalette": {
        const next = args?.[0] as PaletteTheme | null
        setPalette(next)
        setIsOpen(false)
        break
      }
    }
  }

  // Render color bar for a theme
  const renderColorBar = (colors: readonly string[], isSelected: boolean) => (
    <div
      style={{
        display: "flex",
        width: "3rem",
        height: "0.75rem",
        borderRadius: "0.25rem",
        overflow: "hidden",
        border: isSelected ? "2px solid var(--ds-foreground)" : "1px solid var(--ds-border)",
        flexShrink: 0,
      }}
    >
      {colors.map((color, i) => (
        <div key={i} style={{ flex: 1, backgroundColor: color }} />
      ))}
    </div>
  )

  // Render theme list using React (not A2UI) to support color bars
  const renderThemeList = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      {/* Default theme */}
      <button
        onClick={() => handleAction("setPalette", [null])}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent ${
          !palette ? "text-primary font-medium" : "text-foreground"
        }`}
      >
        <div
          style={{
            display: "flex",
            width: "3rem",
            height: "0.75rem",
            borderRadius: "0.25rem",
            overflow: "hidden",
            border: !palette ? "2px solid var(--ds-foreground)" : "1px solid var(--ds-border)",
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1, backgroundColor: "var(--ds-primary)" }} />
          <div style={{ flex: 1, backgroundColor: "var(--ds-secondary)" }} />
          <div style={{ flex: 1, backgroundColor: "var(--ds-accent)" }} />
          <div style={{ flex: 1, backgroundColor: "var(--ds-muted)" }} />
        </div>
        <span>{t("settings.defaultTheme")}</span>
      </button>

      {/* Theme list */}
      {tweakcnThemes.map((theme) => {
        const isSelected = palette === theme.name
        return (
          <button
            key={theme.name}
            onClick={() => handleAction("setPalette", [theme.name])}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent ${
              isSelected ? "text-primary font-medium" : "text-foreground"
            }`}
          >
            {renderColorBar(theme.colors, isSelected)}
            <span>{theme.title}</span>
          </button>
        )
      })}
    </div>
  )

  const headerNode: A2UINode = {
    type: "row",
    justify: "between",
    align: "center",
    children: [
      {
        type: "row",
        gap: "0.25rem",
        children: [
          {
            type: "button",
            text: "中",
            size: "sm",
            variant: locale === "zh-CN" ? "primary" : "secondary",
            onClick: { action: "setLocale", args: ["zh-CN"] },
          },
          {
            type: "button",
            text: "En",
            size: "sm",
            variant: locale === "en" ? "primary" : "secondary",
            onClick: { action: "setLocale", args: ["en"] },
          },
        ],
      },
      {
        type: "row",
        gap: "0.25rem",
        children: [
          {
            type: "button",
            text: "☀",
            size: "sm",
            variant: appearance === "light" ? "primary" : "secondary",
            onClick: { action: "setAppearance", args: ["light"] },
          },
          {
            type: "button",
            text: "🌙",
            size: "sm",
            variant: appearance === "dark" ? "primary" : "secondary",
            onClick: { action: "setAppearance", args: ["dark"] },
          },
          {
            type: "button",
            text: "🖥",
            size: "sm",
            variant: appearance === "system" ? "primary" : "secondary",
            onClick: { action: "setAppearance", args: ["system"] },
          },
        ],
      },
    ],
  }

  const triggerNode: A2UINode = {
    type: "button",
    text: "⚙",
    size: "sm",
    variant: "secondary",
    onClick: { action: "toggleOpen" },
    style: { width: "2.25rem", height: "2.25rem", padding: 0 },
  }

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <A2UIRenderer node={triggerNode} onAction={handleAction} />

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-64 z-50 rounded-lg border border-border bg-card p-3 shadow-lg"
        >
          <A2UIRenderer node={headerNode} onAction={handleAction} />

          <p className="mt-3 mb-2 text-xs text-muted-foreground">{t("settings.theme")}</p>

          <div style={{ maxHeight: "12rem", overflowY: "auto" }}>
            {renderThemeList()}
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            {isDark ? t("settings.dark") : t("settings.light")}
          </p>
        </div>
      )}
    </div>
  )
}
