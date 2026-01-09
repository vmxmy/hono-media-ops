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
    className: "w-9 h-9 p-0",
  }

  const themeOptions = [
    { key: "default", label: t("settings.defaultTheme"), value: null, selected: !palette, colors: null },
    ...tweakcnThemes.map((theme) => ({
      key: theme.name,
      label: theme.title,
      value: theme.name,
      selected: palette === theme.name,
      colors: theme.colors,
    })),
  ]

  const themeListNode: A2UINode = {
    type: "column",
    gap: "0.25rem",
    children: themeOptions.map((option) => ({
      type: "card",
      hoverable: true,
      onClick: { action: "setPalette", args: [option.value] },
      className: `p-2 cursor-pointer ${option.selected ? "border-2 border-[var(--ds-primary)] bg-[var(--ds-accent)]" : "border border-[var(--ds-border)]"}`,
      children: [
        {
          type: "row",
          align: "center",
          gap: "0.5rem",
          children: [
            // Color strip
            ...(option.colors
              ? [
                  {
                    type: "row" as const,
                    gap: "0",
                    className: "rounded overflow-hidden shrink-0",
                    children: option.colors.map((color, idx) => ({
                      type: "container" as const,
                      className: "w-3 h-5",
                      style: { backgroundColor: color },
                      id: `${option.key}-color-${idx}`,
                    })),
                  },
                ]
              : []),
            // Label
            { type: "text", text: option.label, variant: "body" },
          ],
        },
      ],
    })),
  }

  const dropdownNode: A2UINode = {
    type: "container",
    className: "absolute right-0 top-full mt-2 w-64 z-50",
    children: [
      {
        type: "card",
        hoverable: false,
        className: "p-3",
        children: [
          headerNode,
          { type: "text", text: t("settings.theme"), variant: "caption", color: "muted", className: "mt-3 mb-2" },
          {
            type: "container",
            className: "max-h-48 overflow-y-auto",
            children: [themeListNode],
          },
          {
            type: "text",
            text: isDark ? t("settings.dark") : t("settings.light"),
            variant: "caption",
            color: "muted",
            className: "mt-2",
          },
        ],
      },
    ],
  }

  const renderNodes: A2UINode[] = isOpen ? [triggerNode, dropdownNode] : [triggerNode]

  return (
    <div ref={dropdownRef} className="relative">
      <A2UIRenderer node={renderNodes} onAction={handleAction} />
    </div>
  )
}
