/**
 * A2UI Toast Module
 *
 * Toast 是命令式 API，通过 action handler 调用而非渲染为节点。
 * 使用 sonner 作为底层实现。
 *
 * 用法:
 * 1. 在 App Layout 中添加 <A2UIToaster />
 * 2. 在 action handler 中调用 a2uiToast.success("消息")
 */

import { toast as sonnerToast } from "sonner"

export interface A2UIToastOptions {
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

/**
 * A2UI Toast API
 * 符合 A2UI 设计规范的 toast 调用接口
 */
export const a2uiToast = {
  /**
   * 成功提示
   */
  success(message: string, options?: A2UIToastOptions) {
    return sonnerToast.success(message, {
      description: options?.description,
      duration: options?.duration ?? 3000,
      action: options?.action,
    })
  },

  /**
   * 错误提示
   */
  error(message: string, options?: A2UIToastOptions) {
    return sonnerToast.error(message, {
      description: options?.description,
      duration: options?.duration ?? 5000,
      action: options?.action,
    })
  },

  /**
   * 警告提示
   */
  warning(message: string, options?: A2UIToastOptions) {
    return sonnerToast.warning(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
      action: options?.action,
    })
  },

  /**
   * 信息提示
   */
  info(message: string, options?: A2UIToastOptions) {
    return sonnerToast.info(message, {
      description: options?.description,
      duration: options?.duration ?? 3000,
      action: options?.action,
    })
  },

  /**
   * 加载提示 (返回 dismiss 函数)
   */
  loading(message: string) {
    return sonnerToast.loading(message)
  },

  /**
   * 关闭指定 toast
   */
  dismiss(toastId?: string | number) {
    sonnerToast.dismiss(toastId)
  },

  /**
   * Promise 模式 toast
   */
  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: unknown) => string)
    }
  ) {
    return sonnerToast.promise(promise, messages)
  },
}

export type A2UIToast = typeof a2uiToast
