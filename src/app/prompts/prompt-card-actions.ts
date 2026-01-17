import type { A2UINode } from "@/lib/a2ui"
import type { I18nKey } from "@/contexts/i18n-context"

export function buildPromptCardActionButtons(
  t: (key: I18nKey, vars?: Record<string, string | number>) => string,
  promptId: string
): A2UINode[] {
  return [
    {
      type: "button",
      text: t("common.edit"),
      variant: "ghost",
      size: "sm",
      onClick: { action: "edit", args: [promptId], stopPropagation: true },
    },
    {
      type: "button",
      text: t("common.delete"),
      variant: "destructive",
      size: "sm",
      onClick: { action: "delete", args: [promptId], stopPropagation: true },
    },
  ]
}
