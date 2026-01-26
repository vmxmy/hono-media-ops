import type { A2UINode, A2UICardNode, A2UIRowNode } from "../../lib/a2ui"
import { buildStandardCardNode } from "../../lib/a2ui/article-card"
import { createServerTranslator, type ServerLocale } from "../../lib/i18n/server"
import type { TaskWithMaterial } from "../services/task.service"

type SduiTasksMeta = {
  processingCount: number
  hasActiveTasks: boolean
}

type BuildTasksSduiOptions = {
  tasks: TaskWithMaterial[]
  search: string
  compact: boolean
  viewingTaskId?: string
  locale: ServerLocale
}

const ACTIVE_STATUSES = new Set(["pending", "processing"])

export function buildTasksSdui(options: BuildTasksSduiOptions): { nodes: A2UINode; meta: SduiTasksMeta } {
  const { tasks, search, compact, viewingTaskId, locale } = options
  const t = createServerTranslator(locale)
  const dateLocale = locale === "zh-CN" ? "zh-CN" : "en-US"

  const formatWordCount = (articleWordCount?: number | null, totalWordCount?: number) => {
    if (articleWordCount && articleWordCount > 0) {
      return locale === "zh-CN"
        ? `${articleWordCount.toLocaleString(dateLocale)} 字`
        : `${articleWordCount.toLocaleString(dateLocale)} words`
    }
    if (totalWordCount && totalWordCount > 0) {
      return locale === "zh-CN"
        ? `目标 ${totalWordCount.toLocaleString(dateLocale)} 字`
        : `Target ${totalWordCount.toLocaleString(dateLocale)} words`
    }
    return locale === "zh-CN" ? "字数未知" : "Unknown word count"
  }

  const buildTaskCard = (task: TaskWithMaterial, highlight = false): A2UICardNode => {
    const canStop = task.status === "pending" || task.status === "processing"
    const canRetry = task.status === "failed" || task.status === "cancelled"
    const canViewArticle = task.status === "completed"
    const canEdit = task.status === "pending" || task.status === "failed" || task.status === "cancelled"

    const actions: A2UINode[] = []

    if (canViewArticle) {
      actions.push({
        type: "button",
        text: t("article.viewArticle"),
        variant: "primary",
        size: "sm",
        onClick: { action: "viewArticle", args: [task.id, task.topic] },
      })
      actions.push({
        type: "button",
        text: t("taskForm.regenerateTitle"),
        variant: "secondary",
        size: "sm",
        onClick: {
          action: "regenerate",
          args: [task.id, task.topic, task.keywords, task.coverPromptId, task.refMaterialId],
        },
      })
    }

    if (canRetry) {
      actions.push({
        type: "button",
        text: t("task.retry"),
        variant: "secondary",
        size: "sm",
        onClick: { action: "retry", args: [task.id] },
      })
    }

    if (canStop) {
      actions.push({
        type: "button",
        text: t("task.stop"),
        variant: "secondary",
        size: "sm",
        onClick: { action: "stop", args: [task.id] },
      })
    }

    actions.push({
      type: "button",
      text: t("common.delete"),
      variant: "destructive",
      size: "sm",
      onClick: { action: "delete", args: [task.id] },
    })

    const displayTitle = task.articleTitle || task.topic || t("tasks.untitledTask")

    const headerNodes: A2UINode[] = [
      {
        type: "text",
        text: displayTitle,
        variant: "h4",
        className: "line-clamp-2",
      } as A2UINode,
      ...(task.articleSubtitle
        ? [
            {
              type: "text",
              text: task.articleSubtitle,
              variant: "body",
              color: "muted",
              className: "text-sm line-clamp-2",
            } as A2UINode,
          ]
        : []),
      {
        type: "row",
        align: "center",
        gap: "0.5rem",
        children: [
          { type: "text", text: t(`status.${task.status}`), variant: "caption", color: "muted" },
          { type: "text", text: "·", variant: "caption", color: "muted" },
          { type: "text", text: formatWordCount(task.articleWordCount, task.totalWordCount), variant: "caption", color: "muted" },
        ],
      } as A2UIRowNode,
    ]

    const hasProgress = task.status === "processing" && task.currentChapter != null && task.totalChapters != null && task.totalChapters > 0
    if (hasProgress) {
      const progressPercent = Math.min(Math.round((task.currentChapter! / task.totalChapters!) * 100), 100)
      const isPolishing = task.currentChapter! >= task.totalChapters!
      headerNodes.push({
        type: "column",
        gap: "0.25rem",
        children: [
          {
            type: "progress",
            status: "processing",
            value: progressPercent,
            className: "h-1.5",
          },
          {
            type: "row",
            align: "center",
            gap: "0.5rem",
            children: [
              {
                type: "text",
                text: isPolishing
                  ? t("tasks.polishing")
                  : t("tasks.writingProgress", { current: task.currentChapter!, total: task.totalChapters! }),
                variant: "caption",
                color: "primary",
              },
              {
                type: "container",
                className: "w-1.5 h-1.5 rounded-full bg-primary animate-pulse",
              },
            ],
          },
        ],
      })
    }

    const bodyNodes: A2UINode[] = compact
      ? []
      : [
          {
            type: "row",
            align: "start",
            gap: "0.5rem",
            children: [
              { type: "text", text: `${t("taskForm.topic")}:`, variant: "caption", color: "muted", className: "shrink-0" },
              {
                type: "editable-text",
                value: task.topic || "",
                placeholder: t("tasks.untitledTask"),
                variant: "caption",
                editable: canEdit,
                onChange: { action: "updateTopic", args: [task.id] },
                className: "text-sm leading-normal flex-1",
              },
            ],
          },
          {
            type: "row",
            align: "start",
            gap: "0.5rem",
            children: [
              { type: "text", text: `${t("taskForm.keywords")}:`, variant: "caption", color: "muted", className: "shrink-0" },
              {
                type: "editable-text",
                value: task.keywords || "",
                placeholder: t("tasks.noKeywords"),
                variant: "caption",
                multiline: true,
                editable: canEdit,
                onChange: { action: "updateKeywords", args: [task.id] },
                style: {
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                },
              },
            ],
          },
        ]

    const footerNodes: A2UINode[] = [
      {
        type: "row",
        justify: "between",
        align: "center",
        wrap: true,
        gap: "0.5rem",
        children: [
          {
            type: "column",
            gap: "0.35rem",
            children: [
              ...(task.refMaterial
                ? [
                    {
                      type: "column",
                      gap: "0.35rem",
                      children: [
                        {
                          type: "text",
                          text: `风格: ${task.refMaterial.styleName ?? t("tasks.refMaterial")}`,
                          variant: "caption",
                          color: "primary",
                        },
                        task.refMaterial.sourceUrl
                          ? ({
                              type: "link",
                              text: `原文: ${task.refMaterial.sourceTitle ?? task.refMaterial.sourceUrl}`,
                              href: task.refMaterial.sourceUrl,
                              external: true,
                              className: "text-xs max-w-[var(--a2ui-ref-title-max)] overflow-hidden text-ellipsis whitespace-[var(--a2ui-ref-title-white-space)]",
                            } as A2UINode)
                          : ({
                              type: "text",
                              text: `原文: ${task.refMaterial.sourceTitle ?? "-"}`,
                              variant: "caption",
                              color: "muted",
                              className: "max-w-[var(--a2ui-ref-title-max)] overflow-hidden text-ellipsis whitespace-[var(--a2ui-ref-title-white-space)]",
                            } as A2UINode),
                      ],
                    },
                  ]
                : []),
              {
                type: "row",
                align: "center",
                gap: "0.5rem",
                children: [
                  {
                    type: "text",
                    text: `${t("tasks.created")}: ${new Date(task.createdAt).toLocaleString(dateLocale)}`,
                    variant: "caption",
                    color: "muted",
                  },
                ],
              } as A2UIRowNode,
            ],
          },
          { type: "row", gap: "0.5rem", children: actions } as A2UIRowNode,
        ],
      } as A2UIRowNode,
    ]

    return buildStandardCardNode({
      id: `task-${task.id}`,
      hoverable: true,
      cover: task.coverUrl
        ? {
            type: "image",
            src: task.coverUrl,
            alt: task.topic,
            className: "w-full h-40 object-cover",
          }
        : {
            type: "container",
            className: "w-full h-40 bg-muted flex items-center justify-center",
            children: [{ type: "text", text: t("tasks.title"), color: "muted" }],
          },
      header: headerNodes,
      body: bodyNodes,
      footer: footerNodes,
      cardStyle: {
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: 0,
        ...(highlight
          ? {
              boxShadow: "0 0 0 2px var(--primary)",
              backgroundColor: "var(--accent)",
            }
          : {}),
      },
    })
  }

  const hasSearch = search.trim().length > 0
  const emptyActions: A2UINode[] = hasSearch
    ? [
        { type: "text", text: t("tasks.tryDifferentKeywords"), variant: "caption", color: "muted" } as A2UINode,
        { type: "button", text: t("tasks.clearSearch"), variant: "secondary", size: "sm", onClick: { action: "clearSearch" } } as A2UINode,
      ]
    : []
  const emptyContent: A2UINode = {
    type: "column",
    gap: "0.75rem",
    className: "items-center",
    children: [
      { type: "text", text: hasSearch ? t("tasks.noSearchResults") : t("tasks.noTasks"), color: "muted" } as A2UINode,
      ...emptyActions,
    ],
  }
  const listContent: A2UINode = tasks.length === 0
    ? {
        type: "card",
        hoverable: false,
        className: "p-8 text-center",
        children: [emptyContent],
      }
    : {
        type: "column",
        gap: "1rem",
        children: tasks.map((task) => buildTaskCard(task, task.id === viewingTaskId)),
      }

  const processingCount = tasks.filter((task) => ACTIVE_STATUSES.has(task.status)).length

  return {
    nodes: listContent,
    meta: {
      processingCount,
      hasActiveTasks: processingCount > 0,
    },
  }
}
