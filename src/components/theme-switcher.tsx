"use client"

import { useState, useRef, useEffect, useMemo } from "react"
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

  const themeItems = useMemo<A2UINode[]>(() => {
    const items: A2UINode[] = [
      {
        type: "link",
        text: t("settings.defaultTheme"),
        variant: !palette ? "primary" : "default",
        onClick: { action: "setPalette", args: [null] },
        style: { display: "block", width: "100%", textAlign: "left", padding: "0.375rem 0.5rem" },
      },
    ]

    tweakcnThemes.forEach((theme) => {
      items.push({
        type: "link",
        text: theme.title,
        variant: palette === theme.name ? "primary" : "default",
        onClick: { action: "setPalette", args: [theme.name] },
        style: { display: "block", width: "100%", textAlign: "left", padding: "0.375rem 0.5rem" },
      })
    })

    return items
  }, [palette, t])

  const dropdownNode: A2UINode | null = isOpen
    ? {
        type: "container",
        style: {
          position: "absolute",
          right: 0,
          top: "100%",
          marginTop: "0.5rem",
          width: "16rem",
          zIndex: 50,
        },
        children: [
          {
            type: "card",
            hoverable: false,
            style: { padding: "0.75rem" },
            children: [
              {
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
              },
              {
                type: "text",
                text: t("settings.theme"),
                variant: "caption",
                color: "muted",
                style: { marginTop: "0.75rem", marginBottom: "0.5rem" },
              },
              {
                type: "container",
                style: { maxHeight: "12rem", overflowY: "auto" },
                children: [
                  {
                    type: "column",
                    gap: "0.25rem",
                    children: themeItems,
                  },
                ],
              },
              {
                type: "text",
                text: isDark ? t("settings.dark") : t("settings.light"),
                variant: "caption",
                color: "muted",
                style: { marginTop: "0.5rem" },
              },
            ],
          },
        ],
      }
    : null

  const rootNode: A2UINode = {
    type: "container",
    style: { position: "relative" },
    children: [
      {
        type: "button",
        text: "⚙",
        size: "sm",
        variant: "secondary",
        onClick: { action: "toggleOpen" },
        style: { width: "2.25rem", height: "2.25rem", padding: 0 },
      },
      ...(dropdownNode ? [dropdownNode] : []),
    ],
  }

  return (
    <div ref={dropdownRef}>
      <A2UIRenderer node={rootNode} onAction={handleAction} />
    </div>
  )
}
