"use client"

import { A2UIAppShell, A2UIThemeSwitcher } from "./app-shell"
import { A2UIMaterialsTable } from "./materials-table"
import { A2UIArticleViewerModal } from "./article-viewer"
import { A2UICreateTaskModal, A2UIReverseSubmitModal } from "./task-modals"
import { A2UITaskStatusCard } from "./task-status-card"

export {
  A2UIAppShell,
  A2UIThemeSwitcher,
  A2UIMaterialsTable,
  A2UIArticleViewerModal,
  A2UICreateTaskModal,
  A2UIReverseSubmitModal,
  A2UITaskStatusCard,
}

export const BusinessComponents = {
  "app-shell": A2UIAppShell,
  "theme-switcher": A2UIThemeSwitcher,
  "materials-table": A2UIMaterialsTable,
  "article-viewer-modal": A2UIArticleViewerModal,
  "create-task-modal": A2UICreateTaskModal,
  "reverse-submit-modal": A2UIReverseSubmitModal,
  "task-status-card": A2UITaskStatusCard,
}
