"use client"

/**
 * Auto-Save Hook
 *
 * Provides automatic content saving with debounce support.
 * Displays save status indicator (saving/saved/error).
 */

import { useState, useCallback, useRef, useEffect } from "react"

// ==================== Types ====================

export type SaveStatus = "idle" | "saving" | "saved" | "error"

export interface UseAutoSaveOptions {
  /** Initial content value */
  initialValue: string
  /** Debounce delay in milliseconds (default: 2000ms) */
  debounceMs?: number
  /** Callback to save content - should throw on error */
  onSave: (value: string) => Promise<void>
  /** Callback when save succeeds */
  onSaveSuccess?: () => void
  /** Callback when save fails */
  onSaveError?: (error: Error) => void
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean
}

export interface UseAutoSaveReturn {
  /** Current content value */
  value: string
  /** Update content value (triggers auto-save after debounce) */
  setValue: (value: string) => void
  /** Current save status */
  saveStatus: SaveStatus
  /** Error message if save failed */
  error: string | null
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean
  /** Last saved timestamp */
  lastSavedAt: Date | null
  /** Force save immediately (bypasses debounce) */
  forceSave: () => Promise<void>
  /** Reset to initial value */
  reset: () => void
}

// ==================== Constants ====================

const DEFAULT_DEBOUNCE_MS = 2000

// ==================== Hook ====================

export function useAutoSave(options: UseAutoSaveOptions): UseAutoSaveReturn {
  const {
    initialValue,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    onSave,
    onSaveSuccess,
    onSaveError,
    enabled = true,
  } = options

  // State
  const [value, setValueInternal] = useState(initialValue)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  // Refs for tracking
  const lastSavedValue = useRef(initialValue)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const isSaving = useRef(false)

  // Compute if there are unsaved changes
  const hasUnsavedChanges = value !== lastSavedValue.current

  // Update initial value when it changes from parent
  useEffect(() => {
    if (initialValue !== lastSavedValue.current && !hasUnsavedChanges) {
      setValueInternal(initialValue)
      lastSavedValue.current = initialValue
    }
  }, [initialValue, hasUnsavedChanges])

  // Save function
  const performSave = useCallback(
    async (valueToSave: string) => {
      // Skip if already saving or no changes
      if (isSaving.current || valueToSave === lastSavedValue.current) {
        return
      }

      isSaving.current = true
      setSaveStatus("saving")
      setError(null)

      try {
        await onSave(valueToSave)

        lastSavedValue.current = valueToSave
        setLastSavedAt(new Date())
        setSaveStatus("saved")
        onSaveSuccess?.()

        // Reset to idle after showing "saved" for 2 seconds
        setTimeout(() => {
          setSaveStatus((current) => (current === "saved" ? "idle" : current))
        }, 2000)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Save failed"
        setError(errorMessage)
        setSaveStatus("error")
        onSaveError?.(err instanceof Error ? err : new Error(errorMessage))
      } finally {
        isSaving.current = false
      }
    },
    [onSave, onSaveSuccess, onSaveError]
  )

  // Set value with debounced auto-save
  const setValue = useCallback(
    (newValue: string) => {
      setValueInternal(newValue)

      if (!enabled) return

      // Clear existing debounce timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }

      // Set new debounce timer
      debounceTimer.current = setTimeout(() => {
        void performSave(newValue)
      }, debounceMs)
    },
    [enabled, debounceMs, performSave]
  )

  // Force save immediately
  const forceSave = useCallback(async () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
    await performSave(value)
  }, [value, performSave])

  // Reset to initial value
  const reset = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
    setValueInternal(initialValue)
    lastSavedValue.current = initialValue
    setSaveStatus("idle")
    setError(null)
  }, [initialValue])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [])

  // Save on unmount if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges])

  return {
    value,
    setValue,
    saveStatus,
    error,
    hasUnsavedChanges,
    lastSavedAt,
    forceSave,
    reset,
  }
}

// ==================== Helper Components ====================

/**
 * Get display text for save status
 */
export function getSaveStatusText(
  status: SaveStatus,
  hasUnsavedChanges: boolean,
  locale: "en" | "zh-CN" = "en"
): string {
  const texts = {
    en: {
      idle: hasUnsavedChanges ? "Unsaved changes" : "",
      saving: "Saving...",
      saved: "Saved",
      error: "Save failed",
    },
    "zh-CN": {
      idle: hasUnsavedChanges ? "有未保存的更改" : "",
      saving: "保存中...",
      saved: "已保存",
      error: "保存失败",
    },
  }

  return texts[locale][status]
}

/**
 * Get CSS class for save status indicator
 */
export function getSaveStatusClass(status: SaveStatus): string {
  switch (status) {
    case "saving":
      return "text-yellow-600 dark:text-yellow-400"
    case "saved":
      return "text-green-600 dark:text-green-400"
    case "error":
      return "text-red-600 dark:text-red-400"
    default:
      return "text-muted-foreground"
  }
}
