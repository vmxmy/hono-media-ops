import { a2uiToast } from "./toast"

export interface A2UIConfirmToastOptions {
  label?: string
  description?: string
  duration?: number
}

export const DEFAULT_CONFIRM_TOAST_DURATION = 5000
export const DEFAULT_CONFIRM_TOAST_LABEL = "Confirm"

export const showConfirmToast = (
  message: string,
  onConfirm: () => void,
  options?: A2UIConfirmToastOptions
) => {
  return a2uiToast.warning(message, {
    description: options?.description,
    duration: options?.duration ?? DEFAULT_CONFIRM_TOAST_DURATION,
    action: {
      label: options?.label ?? DEFAULT_CONFIRM_TOAST_LABEL,
      onClick: onConfirm,
    },
  })
}
