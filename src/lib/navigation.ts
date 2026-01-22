import type { I18nKey } from "@/contexts/i18n-context"

export interface NavItem {
  key: string
  path: string
  label: string
}

export interface NavGroup {
  type: "group"
  key: string
  label: string
  collapsible?: boolean
  items: NavItem[]
}

export type NavEntry = NavItem | NavGroup

// Flat list for backwards compatibility
export const NAV_ITEMS = [
  { key: "pipeline", path: "/pipeline", labelKey: "nav.pipeline" as I18nKey },
  { key: "tasks", path: "/tasks", labelKey: "nav.tasks" as I18nKey },
  { key: "reverse", path: "/reverse", labelKey: "nav.reverse" as I18nKey },
  { key: "articles", path: "/articles", labelKey: "nav.articles" as I18nKey },
  { key: "wechatArticles", path: "/wechat-articles", labelKey: "nav.wechatArticles" as I18nKey },
  { key: "xhsImages", path: "/xhs-images", labelKey: "nav.xhsImages" as I18nKey },
  { key: "prompts", path: "/prompts", labelKey: "nav.prompts" as I18nKey },
  { key: "insights", path: "/insights", labelKey: "nav.insights" as I18nKey },
  { key: "materials", path: "/materials", labelKey: "nav.materials" as I18nKey },
  { key: "imagePromptAnalytics", path: "/image-prompt-analytics", labelKey: "nav.imagePromptAnalytics" as I18nKey },
  { key: "taskAnalytics", path: "/task-analytics", labelKey: "nav.taskAnalytics" as I18nKey },
  { key: "xhsAnalytics", path: "/xhs-analytics", labelKey: "nav.xhsAnalytics" as I18nKey },
  { key: "wechatArticleAnalytics", path: "/wechat-article-analytics", labelKey: "nav.wechatArticleAnalytics" as I18nKey },
  { key: "pipelineAnalytics", path: "/pipeline-analytics", labelKey: "nav.pipelineAnalytics" as I18nKey },
  { key: "embeddingAnalytics", path: "/embedding-analytics", labelKey: "nav.embeddingAnalytics" as I18nKey },
]

// Flat navigation (backwards compatible)
export function buildNavItems(t: (key: I18nKey) => string): NavItem[] {
  return NAV_ITEMS.map((item) => ({
    key: item.key,
    path: item.path,
    label: t(item.labelKey),
  }))
}

// Grouped navigation structure
export function buildGroupedNavItems(t: (key: I18nKey) => string): NavEntry[] {
  return [
    { key: "pipeline", path: "/pipeline", label: t("nav.pipeline") },
    { key: "tasks", path: "/tasks", label: t("nav.tasks") },
    { key: "reverse", path: "/reverse", label: t("nav.reverse") },
    { key: "articles", path: "/articles", label: t("nav.articles") },
    { key: "wechatArticles", path: "/wechat-articles", label: t("nav.wechatArticles") },
    { key: "xhsImages", path: "/xhs-images", label: t("nav.xhsImages") },
    { key: "prompts", path: "/prompts", label: t("nav.prompts") },
    { key: "insights", path: "/insights", label: t("nav.insights") },
    {
      type: "group",
      key: "analytics",
      label: t("nav.analytics"),
      collapsible: true,
      items: [
        { key: "materials", path: "/materials", label: t("nav.materials") },
        { key: "taskAnalytics", path: "/task-analytics", label: t("nav.taskAnalytics") },
        { key: "imagePromptAnalytics", path: "/image-prompt-analytics", label: t("nav.imagePromptAnalytics") },
        { key: "xhsAnalytics", path: "/xhs-analytics", label: t("nav.xhsAnalytics") },
        { key: "wechatArticleAnalytics", path: "/wechat-article-analytics", label: t("nav.wechatArticleAnalytics") },
        { key: "pipelineAnalytics", path: "/pipeline-analytics", label: t("nav.pipelineAnalytics") },
        { key: "embeddingAnalytics", path: "/embedding-analytics", label: t("nav.embeddingAnalytics") },
      ],
    },
  ]
}
