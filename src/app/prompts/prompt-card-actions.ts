import type { A2UINode } from "@/lib/a2ui"

export function buildPromptCardActionButtons(
  t: (key: string) => string,
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
