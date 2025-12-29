import type { I18nKey } from "@/contexts/i18n-context"

export const NAV_ITEMS = [
  { key: "tasks", path: "/tasks", labelKey: "nav.tasks" as I18nKey },
  { key: "reverse", path: "/reverse", labelKey: "nav.reverse" as I18nKey },
  { key: "insights", path: "/insights", labelKey: "nav.insights" as I18nKey },
  { key: "prompts", path: "/prompts", labelKey: "nav.prompts" as I18nKey },
]

export function buildNavItems(t: (key: I18nKey) => string) {
  return NAV_ITEMS.map((item) => ({
    key: item.key,
    path: item.path,
    label: t(item.labelKey),
  }))
}
