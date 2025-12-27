"use client"

import { Toaster } from "sonner"

/**
 * A2UI Toaster Provider
 *
 * 放置在 App Layout 中，为整个应用提供 toast 功能。
 * 遵循 A2UI 设计规范的视觉风格。
 */
export function A2UIToaster() {
  return (
    <Toaster
      position="top-center"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        style: {
          background: "var(--card)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
        },
        classNames: {
          success: "!bg-emerald-50 !border-emerald-200 !text-emerald-900 dark:!bg-emerald-950 dark:!border-emerald-800 dark:!text-emerald-100",
          error: "!bg-red-50 !border-red-200 !text-red-900 dark:!bg-red-950 dark:!border-red-800 dark:!text-red-100",
          warning: "!bg-amber-50 !border-amber-200 !text-amber-900 dark:!bg-amber-950 dark:!border-amber-800 dark:!text-amber-100",
          info: "!bg-blue-50 !border-blue-200 !text-blue-900 dark:!bg-blue-950 dark:!border-blue-800 dark:!text-blue-100",
        },
      }}
    />
  )
}
