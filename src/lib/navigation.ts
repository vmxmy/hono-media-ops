import type { I18nKey } from "@/contexts/i18n-context"

export const NAV_ITEMS = [
  { key: "pipeline", path: "/pipeline", labelKey: "nav.pipeline" as I18nKey },
  { key: "articles", path: "/articles", labelKey: "nav.articles" as I18nKey },
  { key: "wechatArticles", path: "/wechat-articles", labelKey: "nav.wechatArticles" as I18nKey },
  { key: "tasks", path: "/tasks", labelKey: "nav.tasks" as I18nKey },
  { key: "reverse", path: "/reverse", labelKey: "nav.reverse" as I18nKey },
  { key: "xhsImages", path: "/xhs-images", labelKey: "nav.xhsImages" as I18nKey },
  { key: "insights", path: "/insights", labelKey: "nav.insights" as I18nKey },
  { key: "materials", path: "/materials", labelKey: "nav.materials" as I18nKey },
  { key: "imagePromptAnalytics", path: "/image-prompt-analytics", labelKey: "nav.imagePromptAnalytics" as I18nKey },
  { key: "taskAnalytics", path: "/task-analytics", labelKey: "nav.taskAnalytics" as I18nKey },
  { key: "xhsAnalytics", path: "/xhs-analytics", labelKey: "nav.xhsAnalytics" as I18nKey },
  { key: "wechatArticleAnalytics", path: "/wechat-article-analytics", labelKey: "nav.wechatArticleAnalytics" as I18nKey },
  { key: "pipelineAnalytics", path: "/pipeline-analytics", labelKey: "nav.pipelineAnalytics" as I18nKey },
  { key: "embeddingAnalytics", path: "/embedding-analytics", labelKey: "nav.embeddingAnalytics" as I18nKey },
  { key: "prompts", path: "/prompts", labelKey: "nav.prompts" as I18nKey },
]

export function buildNavItems(t: (key: I18nKey) => string) {
  return NAV_ITEMS.map((item) => ({
    key: item.key,
    path: item.path,
    label: t(item.labelKey),
  }))
}
