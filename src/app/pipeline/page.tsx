"use client"

import { useState, useCallback, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer } from "@/components/a2ui"
import type {
  A2UIAppShellNode,
  A2UINode,
  A2UICardNode,
  A2UIRowNode,
} from "@/lib/a2ui"
import { buildNavItems } from "@/lib/navigation"
import { SwipeSelector } from "@/components/swipe-selector"

// Pipeline step type
type PipelineStep = "input" | "analyzing" | "selection" | "processing" | "completed"

// Pipeline status type (from router)
type PipelineStatus = "analyzing" | "pending_selection" | "processing" | "completed" | "failed"

// Pipeline item type
interface PipelineItem {
  id: string
  sourceUrl: string
  topic: string
  keywords: string | null
  status: PipelineStatus
  createdAt: Date
  styleAnalysisId: string | null
  imagePromptId: string | null
}

export default function PipelinePage() {
  const { t } = useI18n()
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const mounted = status !== "loading"
  const logout = () => signOut({ callbackUrl: "/login" })
  const navItems = buildNavItems(t)

  const [step, setStep] = useState<PipelineStep>("input")
  const [pipelineId, setPipelineId] = useState<string | null>(null)
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null)
  const [materialSearchQuery, setMaterialSearchQuery] = useState("")
  const [promptSearchQuery, setPromptSearchQuery] = useState("")
  const [formData, setFormData] = useState({
    topic: "",
  })

  // Query for history
  const { data: history, refetch: refetchHistory } = api.pipeline.getAll.useQuery(
    {
      page: 1,
      pageSize: 10,
    },
    { enabled: mounted }
  )

  const { data: materialsData, isLoading: materialsLoading } = api.reverseLogs.getAll.useQuery(
    {
      page: 1,
      pageSize: 50,
      search: materialSearchQuery || undefined,
    },
    { enabled: mounted }
  )

  const materials = materialsData?.logs ?? []
  const resolvedMaterialId = selectedMaterialId ?? materials[0]?.id ?? null

  const { data: promptsData, isLoading: promptsLoading } = api.imagePrompts.getAll.useQuery(
    {
      page: 1,
      pageSize: 50,
      search: promptSearchQuery || undefined,
    },
    { enabled: mounted }
  )

  const prompts = promptsData?.items ?? []
  const resolvedPromptId = selectedPromptId ?? prompts[0]?.id ?? null
  const resolvedMaterial = resolvedMaterialId
    ? materials.find((material) => material.id === resolvedMaterialId) ?? null
    : null
  const resolvedSourceUrl = resolvedMaterial?.sourceUrl ?? ""

  // Query for current pipeline data
  const { data: currentPipeline } = api.pipeline.getById.useQuery(
    { id: pipelineId! },
    {
      enabled: !!pipelineId && step !== "input",
    }
  )

  // Query for progress (when processing or completed)
  const { data: progress } = api.pipeline.getProgress.useQuery(
    { id: pipelineId ?? "" },
    {
      enabled: !!pipelineId && (step === "processing" || step === "completed"),
      refetchInterval: step === "processing" ? 3000 : false,
    }
  )

  // Query for sorted image prompts (when in selection step)
  const { data: sortedPrompts } = api.pipeline.getSortedImagePrompts.useQuery(
    { pipelineId: pipelineId ?? "" },
    {
      enabled: !!pipelineId && step === "selection",
    }
  )

  // Create mutation (triggers style analysis)
  const createMutation = api.pipeline.create.useMutation({
    onSuccess: (data) => {
      setPipelineId(data.id)
      setStep("analyzing")
      refetchHistory()
    },
  })

  // Create quick mutation
  const createQuickMutation = api.pipeline.createQuick.useMutation({
    onSuccess: (data) => {
      setPipelineId(data.id)
      setStep("processing")
      refetchHistory()
    },
  })

  // Select style mutation
  const selectStyleMutation = api.pipeline.selectStyle.useMutation({
    onSuccess: () => {
      // Style selected, ready to start generation
    },
  })

  // Start generation mutation
  const startMutation = api.pipeline.start.useMutation({
    onSuccess: () => {
      setStep("processing")
    },
  })

  // Watch for pipeline status changes
  useEffect(() => {
    if (currentPipeline) {
      if (currentPipeline.status === "processing") {
        setStep("processing")
      } else if (currentPipeline.status === "completed") {
        setStep("completed")
      } else if (currentPipeline.status === "failed") {
        setStep("input")
        setPipelineId(null)
      }
    }
  }, [currentPipeline])

  // Monitor completion status
  useEffect(() => {
    if (progress?.status === "completed") {
      setStep("completed")
    } else if (progress?.status === "failed") {
      setStep("input")
      setPipelineId(null)
    }
  }, [progress?.status])

  useEffect(() => {
    if (!materials.length) {
      if (selectedMaterialId) setSelectedMaterialId(null)
      return
    }
    if (!selectedMaterialId || !materials.some((material) => material.id === selectedMaterialId)) {
      setSelectedMaterialId(materials[0]?.id ?? null)
    }
  }, [materials, selectedMaterialId])

  useEffect(() => {
    if (!prompts.length) {
      if (selectedPromptId) setSelectedPromptId(null)
      return
    }
    if (!selectedPromptId || !prompts.some((prompt) => prompt.id === selectedPromptId)) {
      setSelectedPromptId(prompts[0]?.id ?? null)
    }
  }, [prompts, selectedPromptId])

  // Build the action handler
  const handleAction = useCallback(
    (action: string, args?: unknown[]) => {
      switch (action) {
        case "navigate": {
          const href = args?.[0] as string
          if (href) router.push(href)
          break
        }
        case "logout":
          logout()
          break
        case "setTopic":
          setFormData((prev) => ({ ...prev, topic: args?.[0] as string }))
          break
        case "setMaterialSearch":
          setMaterialSearchQuery((args?.[0] as string) ?? "")
          break
        case "setPromptSearch":
          setPromptSearchQuery((args?.[0] as string) ?? "")
          break
        case "selectMaterial":
          setSelectedMaterialId((args?.[0] as string) ?? null)
          break
        case "analyze":
          if (!formData.topic || !resolvedMaterialId || !resolvedSourceUrl) return
          createMutation.mutate({
            sourceUrl: resolvedSourceUrl,
            topic: formData.topic,
          })
          break
        case "selectPrompt": {
          const promptId = args?.[0]
          if (typeof promptId !== "string" || !pipelineId) return
          setSelectedPromptId(promptId)
          selectStyleMutation.mutate({
            pipelineId,
            imagePromptId: promptId,
          })
          break
        }
        case "startGeneration":
          if (!pipelineId || !selectedPromptId) return
          startMutation.mutate({ pipelineId })
          break
        case "viewPipeline": {
          const id = args?.[0] as string
          const pipeline = history?.items.find((item) => item.id === id)
          if (pipeline) {
            setPipelineId(id)
            // Navigate to the appropriate step based on pipeline status
            switch (pipeline.status) {
              case "analyzing":
                setStep("analyzing")
                break
              case "pending_selection":
                setStep("selection")
                break
              case "processing":
                setStep("processing")
                break
              case "completed":
                setStep("completed")
                break
              case "failed":
                setStep("input")
                break
            }
          }
          break
        }
        case "newPipeline":
          setStep("input")
          setPipelineId(null)
          setSelectedPromptId(null)
          setSelectedMaterialId(null)
          setMaterialSearchQuery("")
          setFormData({ topic: "" })
          break
        case "previewArticle":
          // TODO: Open article preview modal
          break
        case "copyArticle":
          // TODO: Copy article content to clipboard
          break
        case "previewImages":
          // TODO: Open image gallery preview
          break
        case "downloadAll":
          // TODO: Download all XHS images
          break
        case "publishToXhs":
          // TODO: Trigger XHS publishing flow
          break
      }
    },
    [
      formData,
      createMutation,
      selectStyleMutation,
      startMutation,
      history,
      router,
      pipelineId,
      selectedPromptId,
      materials,
      resolvedMaterialId,
    ]
  )

  // Build input form node
  const buildInputNode = (): A2UICardNode => ({
    type: "card",
    className: "p-6",
    children: [
      {
        type: "column",
        gap: "1.5rem",
        children: [
          { type: "text", text: "快速创作", variant: "h2" },
          {
            type: "column",
            gap: "1rem",
            children: [
              {
                type: "column",
                gap: "0.25rem",
                children: [
                  { type: "text", text: "当前素材", variant: "caption", color: "muted" },
                  {
                    type: "input",
                    id: "material-search",
                    name: "material-search",
                    placeholder: "搜索素材标题或风格...",
                    value: materialSearchQuery,
                    inputType: "text",
                    onChange: { action: "setMaterialSearch" },
                  },
                  materialsLoading
                    ? { type: "text", text: "素材加载中...", variant: "caption", color: "muted" }
                    : materials.length
                      ? {
                          type: "material-swipe-selector",
                          title: "滑动选择素材",
                          items: materials.map((material) => {
                            const styleName = material.styleName ?? material.sourceTitle ?? ""
                            const metaParts: string[] = []
                            if (material.wordCount) metaParts.push(`约${material.wordCount}字`)
                            if (material.primaryType) metaParts.push(material.primaryType)
                            return {
                              id: material.id,
                              name: styleName || "未命名素材",
                              subtitle: material.sourceTitle && material.sourceTitle !== styleName
                                ? material.sourceTitle
                                : "",
                              meta: metaParts.length ? metaParts.join(" · ") : "",
                              previewUrl: "",
                              linkUrl: material.sourceUrl ?? "",
                            }
                          }),
                          selectedId: resolvedMaterialId ?? "",
                          action: { action: "selectMaterial" },
                        }
                      : {
                          type: "text",
                          text: materialSearchQuery.trim()
                            ? "没有匹配的素材"
                            : "暂无素材。请先在素材仓库中添加一些素材。",
                          variant: "caption",
                          color: "muted",
                        },
                ],
              },
              {
                type: "column",
                gap: "0.25rem",
                children: [
                  { type: "text", text: "新话题", variant: "caption", color: "muted" },
                  {
                    type: "input",
                    id: "topic",
                    name: "topic",
                    placeholder: "输入你想写的话题...",
                    value: formData.topic,
                    inputType: "text",
                    onChange: { action: "setTopic" },
                  },
                ],
              },
            ],
          },
          {
            type: "button",
            text: createMutation.isPending ? "分析中..." : "分析风格",
            variant: "primary",
            disabled: !resolvedMaterialId || !resolvedSourceUrl || !formData.topic || createMutation.isPending,
            onClick: { action: "analyze" },
          },
          ...(!resolvedSourceUrl && resolvedMaterialId
            ? [{
                type: "text" as const,
                text: "该素材缺少原文链接，无法用于快速创作。",
                variant: "caption" as const,
                color: "muted" as const,
              }]
            : []),
        ],
      },
    ],
  })

  // Build analyzing state node
  const buildAnalyzingNode = (): A2UICardNode => ({
    type: "card",
    className: "p-6",
    children: [
      {
        type: "column",
        gap: "1rem",
        className: "items-center text-center",
        children: [
          { type: "text", text: "正在分析文章风格...", variant: "h3" },
          { type: "progress", value: 50, status: "processing" },
          { type: "text", text: "约需 30 秒", variant: "caption", color: "muted" },
        ],
      },
    ],
  })

  // Build selection state node
  const buildSelectionNode = (): A2UINode => {
    return {
      type: "column",
      gap: "1.5rem",
      children: [
        {
          type: "card",
          className: "p-6",
          children: [
            {
              type: "column",
              gap: "0.5rem",
              children: [
                { type: "text", text: "✅ 风格分析完成", variant: "h3" },
                { type: "text", text: currentPipeline?.topic ?? "", variant: "body", color: "muted" },
              ],
            },
          ],
        },
        {
          type: "card",
          className: "p-6",
          children: [
            {
              type: "column",
              gap: "1rem",
              children: [
                { type: "text", text: "🎨 选择视觉风格", variant: "h3" },
                { type: "text", text: "💡 此风格同时用于封面和小红书图文", variant: "caption", color: "muted" },
                {
                  type: "button",
                  text: startMutation.isPending ? "生成中..." : "🚀 开始生成",
                  variant: "primary",
                  disabled: !selectedPromptId || startMutation.isPending,
                  onClick: { action: "startGeneration" },
                },
                {
                  type: "text",
                  text: "将生成：文章 + 封面 + 9张图文",
                  variant: "caption",
                  color: "muted",
                  className: "text-center",
                },
              ],
            },
          ],
        },
      ],
    }
  }

  // Build processing state node
  const buildProcessingNode = (): A2UICardNode => ({
    type: "card",
    className: "p-6",
    children: [
      {
        type: "column",
        gap: "1rem",
        children: [
          { type: "text", text: "⚡ 正在生成...", variant: "h3" },
          {
            type: "progress",
            value: progress?.totalProgress ?? 0,
            status: "processing",
          },
          {
            type: "row",
            gap: "1rem",
            children: [
              {
                type: "text",
                text: `📄 文章 ${progress?.article.completed ?? 0}/${progress?.article.total ?? 0} 章节`,
                variant: "body",
              },
              {
                type: "badge",
                text: (progress?.article.total ?? 0) > 0 &&
                      progress?.article.completed === progress?.article.total ? "✅" : "✍️",
                color: "default",
              },
            ],
          },
          {
            type: "row",
            gap: "1rem",
            children: [
              {
                type: "text",
                text: `📱 小红书 ${progress?.xhs.completed ?? 0}/${progress?.xhs.total ?? 0} 张`,
                variant: "body",
              },
              {
                type: "badge",
                text: (progress?.xhs.total ?? 0) > 0 &&
                      progress?.xhs.completed === progress?.xhs.total ? "✅" : "🖼️",
                color: "default",
              },
            ],
          },
          {
            type: "text",
            text: "💡 可随时离开，完成后通知你",
            variant: "caption",
            color: "muted",
          },
        ],
      },
    ],
  })

  // Build completed state node
  const buildCompletedNode = (): A2UINode => ({
    type: "column",
    gap: "1.5rem",
    children: [
      {
        type: "card",
        className: "p-6",
        children: [
          {
            type: "column",
            gap: "1rem",
            children: [
              { type: "text", text: "✅ 全部完成！", variant: "h2" },
              { type: "text", text: currentPipeline?.topic ?? "", variant: "body", color: "muted" },
            ],
          },
        ],
      },
      {
        type: "card",
        className: "p-6",
        children: [
          {
            type: "column",
            gap: "1rem",
            children: [
              { type: "text", text: "📄 文章", variant: "h3" },
              { type: "text", text: "文章已生成完成", variant: "body", color: "muted" },
              {
                type: "row",
                gap: "0.5rem",
                children: [
                  {
                    type: "button",
                    text: "预览文章",
                    variant: "secondary",
                    size: "sm",
                    disabled: true,
                    onClick: { action: "previewArticle" },
                  },
                  {
                    type: "button",
                    text: "复制全文",
                    variant: "secondary",
                    size: "sm",
                    disabled: true,
                    onClick: { action: "copyArticle" },
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "card",
        className: "p-6",
        children: [
          {
            type: "column",
            gap: "1rem",
            children: [
              { type: "text", text: "📱 小红书图文", variant: "h3" },
              {
                type: "text",
                text: `${progress?.xhs.total ?? 0} 张图片已生成`,
                variant: "body",
                color: "muted"
              },
              {
                type: "row",
                gap: "0.5rem",
                children: [
                  {
                    type: "button",
                    text: "预览大图",
                    variant: "secondary",
                    size: "sm",
                    disabled: true,
                    onClick: { action: "previewImages" },
                  },
                  {
                    type: "button",
                    text: "下载全部",
                    variant: "secondary",
                    size: "sm",
                    disabled: true,
                    onClick: { action: "downloadAll" },
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "card",
        className: "p-6",
        children: [
          {
            type: "column",
            gap: "0.75rem",
            children: [
              {
                type: "button",
                text: "📤 发布到小红书",
                variant: "primary",
                disabled: true,
                onClick: { action: "publishToXhs" },
              },
              {
                type: "button",
                text: "➕ 开始新创作",
                variant: "secondary",
                onClick: { action: "newPipeline" },
              },
            ],
          },
        ],
      },
    ],
  })

  // Build history list
  const buildHistoryNode = (): A2UINode => {
    const items = history?.items ?? []

    if (items.length === 0) {
      return {
        type: "card",
        className: "p-6",
        children: [
          {
            type: "column",
            gap: "0.5rem",
            className: "items-center text-center",
            children: [
              { type: "text", text: "历史创作", variant: "h3" },
              { type: "text", text: "暂无创作记录", color: "muted" },
            ],
          },
        ],
      }
    }

    return {
      type: "column",
      gap: "1rem",
      children: [
        { type: "text", text: "历史创作", variant: "h3" },
        ...items.map(
          (item): A2UICardNode => ({
            type: "card",
            id: `pipeline-${item.id}`,
            hoverable: true,
            className: "p-4",
            children: [
              {
                type: "column",
                gap: "0.75rem",
                children: [
                  {
                    type: "row",
                    justify: "between",
                    align: "center",
                    children: [
                      {
                        type: "column",
                        gap: "0.25rem",
                        className: "flex-1 min-w-0",
                        children: [
                          {
                            type: "text",
                            text: item.topic,
                            variant: "body",
                            className: "font-medium truncate",
                          },
                          {
                            type: "text",
                            text: new Date(item.createdAt).toLocaleString(),
                            variant: "caption",
                            color: "muted",
                          },
                        ],
                      },
                      {
                        type: "badge",
                        text: getStatusLabel(item.status),
                        color: getStatusColor(item.status),
                      },
                    ],
                  } as A2UIRowNode,
                  {
                    type: "row",
                    gap: "0.5rem",
                    children: [
                      {
                        type: "button",
                        text: "查看",
                        variant: "secondary",
                        size: "sm",
                        onClick: { action: "viewPipeline", args: [item.id] },
                      },
                    ],
                  } as A2UIRowNode,
                ],
              },
            ],
          })
        ),
      ],
    }
  }

  // Build main content based on step
  const buildContentNode = (): A2UINode => {
    switch (step) {
      case "input":
        return buildInputNode()
      case "analyzing":
        return buildAnalyzingNode()
      case "selection":
        return buildSelectionNode()
      case "processing":
        return buildProcessingNode()
      case "completed":
        return buildCompletedNode()
      default:
        return buildInputNode()
    }
  }

  if (!mounted) return null

  const pageNode: A2UINode = {
    type: "container",
    className: "flex-1 min-h-0 flex flex-col overflow-hidden",
    children: [
      {
        type: "scroll-area",
        className: "flex-1 min-h-0",
        children: [
          {
            type: "column",
            gap: "1.5rem",
            className: "max-w-2xl mx-auto py-6",
            children: [buildContentNode(), buildHistoryNode()],
          },
        ],
      },
    ],
  }

  const appShellNode: A2UIAppShellNode = {
    type: "app-shell",
    brand: t("app.title"),
    logoSrc: "/logo.png",
    logoAlt: "Wonton",
    navItems,
    activePath: pathname,
    onNavigate: { action: "navigate" },
    onLogout: { action: "logout" },
    logoutLabel: t("auth.logout"),
    headerActions: [{ type: "theme-switcher" }],
    children: [pageNode],
  }

  return (
    <>
      <A2UIRenderer node={appShellNode} onAction={handleAction} />
      {step === "selection" && sortedPrompts && sortedPrompts.length > 0 && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border rounded-lg shadow-lg p-6 max-w-lg w-full">
            <SwipeSelector
              items={sortedPrompts.map((p) => ({
                id: p.id,
                name: p.title,
                previewUrl: p.previewUrl ?? undefined,
                similarity: p.similarity,
              }))}
              selectedId={selectedPromptId ?? sortedPrompts[0]?.id ?? ""}
              onSelect={(id) => handleAction("selectPrompt", [id])}
              title="选择封面风格"
            />
          </div>
        </div>
      )}
    </>
  )
}

// Helper functions
function getStatusLabel(status: PipelineStatus): string {
  const labels: Record<PipelineStatus, string> = {
    analyzing: "分析中",
    pending_selection: "待选择",
    processing: "生成中",
    completed: "已完成",
    failed: "失败",
  }
  return labels[status] ?? status
}

function getStatusColor(status: PipelineStatus): "default" | "processing" | "success" | "error" {
  const colors: Record<PipelineStatus, "default" | "processing" | "success" | "error"> = {
    analyzing: "processing",
    pending_selection: "default",
    processing: "processing",
    completed: "success",
    failed: "error",
  }
  return colors[status] ?? "default"
}
