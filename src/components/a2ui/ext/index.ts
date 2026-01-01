"use client"

import { A2UIStatCard } from "./stat-card"
import { A2UIEmptyState } from "./empty-state"
import { A2UIMarkdown } from "./markdown"
import { A2UITaskStatusCard } from "../business/task-status-card"

export { A2UIStatCard, A2UIEmptyState, A2UIMarkdown, A2UITaskStatusCard }

export const ExtComponents = {
  "stat-card": A2UIStatCard,
  "empty-state": A2UIEmptyState,
  markdown: A2UIMarkdown,
  "task-status-card": A2UITaskStatusCard,
}
