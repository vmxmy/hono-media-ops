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
  const [formData, setFormData] = useState({
    sourceUrl: "",
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

  // Query for current pipeline progress (when analyzing)
  const { data: currentPipeline } = api.pipeline.getById.useQuery(
    { id: pipelineId! },
    {
      enabled: !!pipelineId && step === "analyzing",
      refetchInterval: step === "analyzing" ? 3000 : false,
    }
  )

  // Watch for pipeline status changes
  useEffect(() => {
    if (currentPipeline) {
      if (currentPipeline.status === "pending_selection") {
        setStep("selection")
      } else if (currentPipeline.status === "processing") {
        setStep("processing")
      } else if (currentPipeline.status === "completed") {
        setStep("completed")
      } else if (currentPipeline.status === "failed") {
        setStep("input")
        setPipelineId(null)
      }
    }
  }, [currentPipeline])

  // Create mutation
  const createMutation = api.pipeline.create.useMutation({
    onSuccess: (data) => {
      setPipelineId(data.id)
      setStep("analyzing")
      refetchHistory()
    },
  })

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
        case "setSourceUrl":
          setFormData((prev) => ({ ...prev, sourceUrl: args?.[0] as string }))
          break
        case "setTopic":
          setFormData((prev) => ({ ...prev, topic: args?.[0] as string }))
          break
        case "analyze":
          if (formData.sourceUrl && formData.topic) {
            createMutation.mutate(formData)
          }
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
          setFormData({ sourceUrl: "", topic: "" })
          break
      }
    },
    [formData, createMutation, history, router]
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
                  { type: "text", text: "参考文章 URL", variant: "caption", color: "muted" },
                  {
                    type: "input",
                    id: "source-url",
                    name: "source-url",
                    placeholder: "粘贴微信公众号或其他文章链接...",
                    value: formData.sourceUrl,
                    inputType: "text",
                    onChange: { action: "setSourceUrl" },
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
            disabled: !formData.sourceUrl || !formData.topic || createMutation.isPending,
            onClick: { action: "analyze" },
          },
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

  // Build selection state node (placeholder for now)
  const buildSelectionNode = (): A2UICardNode => ({
    type: "card",
    className: "p-6",
    children: [
      {
        type: "column",
        gap: "1rem",
        children: [
          { type: "text", text: "选择封面风格", variant: "h3" },
          { type: "text", text: "风格分析完成，请选择封面风格", color: "muted" },
          {
            type: "button",
            text: "新建创作",
            variant: "secondary",
            onClick: { action: "newPipeline" },
          },
        ],
      },
    ],
  })

  // Build processing state node
  const buildProcessingNode = (): A2UICardNode => ({
    type: "card",
    className: "p-6",
    children: [
      {
        type: "column",
        gap: "1rem",
        className: "items-center text-center",
        children: [
          { type: "text", text: "正在生成内容...", variant: "h3" },
          { type: "progress", value: 30, status: "processing" },
          { type: "text", text: "生成中", variant: "caption", color: "muted" },
        ],
      },
    ],
  })

  // Build completed state node
  const buildCompletedNode = (): A2UICardNode => ({
    type: "card",
    className: "p-6",
    children: [
      {
        type: "column",
        gap: "1rem",
        children: [
          { type: "text", text: "创作完成", variant: "h3" },
          { type: "badge", text: "已完成", color: "success" },
          {
            type: "button",
            text: "新建创作",
            variant: "primary",
            onClick: { action: "newPipeline" },
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

  return <A2UIRenderer node={appShellNode} onAction={handleAction} />
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
