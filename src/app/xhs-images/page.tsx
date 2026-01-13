"use client"

import { useState, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { api } from "@/trpc/react"
import { useI18n } from "@/contexts/i18n-context"
import { A2UIRenderer, a2uiToast, showConfirmToast } from "@/components/a2ui"
import { CreateXhsImageModal } from "@/components/create-xhs-image-modal"
import type {
  A2UIAppShellNode,
  A2UIColumnNode,
  A2UINode,
  A2UIRowNode,
} from "@/lib/a2ui"
import { buildNavItems } from "@/lib/navigation"

// Polling interval in milliseconds
const POLLING_INTERVAL = 5000

interface XhsImage {
  id: string
  index: number
  type: "cover" | "content" | "ending"
  wechatUrl: string | null
  r2Url: string | null
  coreMessage: string | null
  textContent: string | null
}

interface XhsJob {
  id: string
  sourceUrl: string
  sourceTitle: string | null
  totalImages: number
  completedImages: number
  status: "pending" | "processing" | "completed" | "failed"
  errorMessage: string | null
  ratio: string | null
  resolution: string | null
  createdAt: Date
}

interface XhsJobWithImages extends XhsJob {
  images: XhsImage[]
}

export default function XhsImagesPage() {
  const { t } = useI18n()
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const mounted = status !== "loading"
  const logout = () => signOut({ callbackUrl: "/login" })
  const navItems = buildNavItems(t)

  // Track which job is in zoomed (full-size) mode
  const [zoomedJobId, setZoomedJobId] = useState<string | null>(null)
  // Modal state for generating new images
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)

  // Get processing count for smart polling
  const { data: processingCountData = 0 } = api.xhsImages.getProcessingCount.useQuery(undefined, {
    enabled: mounted,
  })
  const processingCount = processingCountData as number

  // Query all jobs - this returns jobs with imageCount only
  const {
    data: jobsData,
    isLoading,
    error,
    refetch: invalidateJobs,
  } = api.xhsImages.getAll.useQuery(
    { page: 1, pageSize: 50 },
    {
      enabled: mounted,
      refetchInterval: processingCount > 0 ? POLLING_INTERVAL : false,
    }
  )

  // Get all job IDs to fetch their images
  const jobIds = (jobsData?.jobs ?? []).map(j => j.id)

  // Fetch images for all jobs in one batch query per job
  // We'll use individual queries but they'll be cached
  const jobsWithImages = api.useQueries((t) =>
    jobIds.map(id => t.xhsImages.getById({ id }))
  )

  // Combine jobs with their images
  const jobs: XhsJobWithImages[] = (jobsData?.jobs ?? []).map((job, index) => {
    const jobData = jobsWithImages[index]?.data
    return {
      ...job,
      images: (jobData?.images ?? []) as XhsImage[],
    }
  })

  const isPolling = processingCount > 0

  const deleteMutation = api.xhsImages.delete.useMutation({
    onSuccess: () => {
      invalidateJobs()
      a2uiToast.success(t("reverse.deleteSuccess"))
    },
    onError: () => {
      a2uiToast.error(t("reverse.deleteFailed"))
    },
  })

  const publishMutation = api.xhsImages.publish.useMutation({
    onSuccess: () => {
      a2uiToast.success(t("xhsImages.publishSuccess"))
    },
    onError: (error) => {
      a2uiToast.error(error.message || t("xhsImages.publishFailed"))
    },
  })

  const handleDelete = (id: string) => {
    showConfirmToast(t("xhsImages.deleteConfirm"), () => deleteMutation.mutate({ id }), {
      label: t("common.confirm"),
    })
  }

  const handlePublish = (id: string) => {
    publishMutation.mutate({ id })
  }

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      a2uiToast.success(t("xhsImages.urlCopied"))
    } catch {
      a2uiToast.error(t("reverse.copyFailed"))
    }
  }

  const getImageTypeLabel = (type: "cover" | "content" | "ending") => {
    switch (type) {
      case "cover":
        return t("xhsImages.coverImage")
      case "content":
        return t("xhsImages.contentImage")
      case "ending":
        return t("xhsImages.endingImage")
    }
  }

  const getStatusBadge = (status: string): A2UINode => {
    const colorMap: Record<string, "default" | "processing" | "success" | "destructive"> = {
      pending: "default",
      processing: "processing",
      completed: "success",
      failed: "destructive",
    }
    const labelMap: Record<string, string> = {
      pending: t("status.pending"),
      processing: t("status.processing"),
      completed: t("status.completed"),
      failed: t("status.failed"),
    }
    return {
      type: "badge",
      text: labelMap[status] ?? status,
      color: colorMap[status] ?? "default",
    }
  }

  // Build single image thumbnail - supports normal and zoomed modes
  const buildImageThumbnail = (image: XhsImage, jobId: string, isZoomed: boolean): A2UINode => {
    const imageUrl = image.r2Url || image.wechatUrl
    const aspectClass = "aspect-[3/4]"

    if (!imageUrl) {
      // Placeholder for pending images
      return {
        type: "container",
        className: `${aspectClass} bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/20`,
        children: [
          {
            type: "column",
            gap: "0.25rem",
            className: "items-center",
            children: [
              { type: "text", text: `#${image.index}`, color: "muted", variant: "caption" },
              { type: "text", text: getImageTypeLabel(image.type), color: "muted", variant: "caption" },
            ],
          },
        ],
      }
    }

    return {
      type: "card",
      hoverable: true,
      className: "group relative overflow-hidden rounded-lg cursor-pointer p-0",
      onClick: { action: "toggleZoom", args: [jobId] },
      children: [
        {
          type: "image",
          src: imageUrl,
          alt: image.coreMessage || `Image ${image.index}`,
          className: `w-full h-full ${aspectClass} object-cover transition-transform group-hover:scale-105`,
        },
        // Info overlay with type badge
        {
          type: "container",
          className: "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
          children: [
            {
              type: "container",
              className: "absolute bottom-0 left-0 right-0 p-2",
              children: [
                {
                  type: "row",
                  justify: "between",
                  align: "center",
                  children: [
                    {
                      type: "badge",
                      text: getImageTypeLabel(image.type),
                      color: image.type === "cover" ? "primary" : image.type === "ending" ? "secondary" : "default",
                    },
                  ],
                } as A2UIRowNode,
              ],
            },
          ],
        },
        // Zoom indicator
        ...(isZoomed ? [] : [{
          type: "container" as const,
          className: "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
          children: [{
            type: "badge" as const,
            text: "🔍 " + t("common.expand"),
            color: "default" as const,
          }],
        }]),
      ],
    }
  }

  // Build image grid for a job - supports normal and zoomed modes
  const buildImageGrid = (images: XhsImage[], jobId: string, jobStatus: string, totalImages: number, isZoomed: boolean): A2UINode => {
    if (images.length === 0 && jobStatus === "pending") {
      return {
        type: "container",
        className: "py-6 text-center bg-muted/30 rounded-lg",
        children: [
          {
            type: "column",
            gap: "0.5rem",
            className: "items-center",
            children: [
              { type: "text", text: "⏳", variant: "h3" },
              { type: "text", text: t("status.pending"), color: "muted" },
              { type: "text", text: `${totalImages} ${t("xhsImages.imageCount", { count: "" }).replace("{count}", "")}`, color: "muted", variant: "caption" },
            ],
          },
        ],
      }
    }

    if (images.length === 0) {
      return {
        type: "container",
        className: "py-4 text-center",
        children: [{ type: "text", text: t("xhsImages.noImages"), color: "muted" }],
      }
    }

    // Sort: cover first, then by index
    const sortedImages = [...images].sort((a, b) => {
      if (a.type === "cover" && b.type !== "cover") return -1
      if (b.type === "cover" && a.type !== "cover") return 1
      return a.index - b.index
    })

    // Different grid layouts for normal vs zoomed mode
    // Normal: more columns, smaller images
    // Zoomed: fewer columns, larger images
    const gridClass = isZoomed
      ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
      : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"

    return {
      type: "column",
      gap: "0.75rem",
      children: [
        // Zoom mode header with collapse button
        ...(isZoomed ? [{
          type: "row" as const,
          justify: "between" as const,
          align: "center" as const,
          children: [
            {
              type: "text" as const,
              text: `📷 ${images.length} ${t("xhsImages.imageCount", { count: "" }).replace("{count}", "")}`,
              variant: "body" as const,
              color: "muted" as const,
            },
            {
              type: "button" as const,
              text: "🔙 " + t("common.collapse"),
              variant: "secondary" as const,
              size: "sm" as const,
              onClick: { action: "toggleZoom", args: [jobId] },
            },
          ],
        }] : []),
        // Image grid
        {
          type: "container",
          className: gridClass,
          children: [
            // All images
            ...sortedImages.map(img => buildImageThumbnail(img, jobId, isZoomed)),
            // Placeholders for pending images during processing
            ...(jobStatus === "processing"
              ? Array.from({ length: Math.max(0, totalImages - images.length) }, (_, i) => ({
                  type: "container" as const,
                  className: "aspect-[3/4] bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/20 animate-pulse",
                  children: [
                    { type: "text" as const, text: "⏳", color: "muted" as const, variant: "caption" as const },
                  ],
                }))
              : []),
          ],
        },
      ],
    }
  }

  // Build job card with inline images
  const buildJobCard = (job: XhsJobWithImages): A2UINode => {
    const progressPercent = job.totalImages > 0
      ? Math.round((job.completedImages / job.totalImages) * 100)
      : 0
    const isProcessing = job.status === "processing"
    const isFailed = job.status === "failed"
    const isZoomed = zoomedJobId === job.id

    return {
      type: "card",
      id: `job-${job.id}`,
      hoverable: false,
      className: `overflow-hidden transition-all ${isZoomed ? "ring-2 ring-primary" : ""}`,
      children: [
        {
          type: "column",
          gap: "0",
          children: [
            // Header: title, status, meta
            {
              type: "container",
              className: "p-4 border-b border-border",
              children: [
                {
                  type: "column",
                  gap: "0.5rem",
                  children: [
                    // Title row
                    {
                      type: "row",
                      justify: "between",
                      align: "start",
                      gap: "1rem",
                      children: [
                        {
                          type: "column",
                          gap: "0.25rem",
                          className: "flex-1 min-w-0",
                          children: [
                            {
                              type: "text",
                              text: job.sourceTitle || t("reverse.untitled"),
                              variant: "h4",
                              className: "line-clamp-1",
                            },
                            job.sourceUrl ? {
                              type: "link",
                              text: job.sourceUrl,
                              href: job.sourceUrl,
                              external: true,
                              className: "text-xs truncate block max-w-md text-muted-foreground hover:text-primary",
                            } as A2UINode : null,
                          ].filter(Boolean) as A2UINode[],
                        },
                        {
                          type: "row",
                          gap: "0.5rem",
                          align: "center",
                          children: [
                            getStatusBadge(job.status),
                            ...(job.status === "completed" ? [{
                              type: "button" as const,
                              text: publishMutation.isPending ? t("xhsImages.publishing") : t("xhsImages.publish"),
                              variant: "primary" as const,
                              size: "sm" as const,
                              disabled: publishMutation.isPending,
                              onClick: { action: "publish", args: [job.id] },
                            }] : []),
                            {
                              type: "button",
                              text: t("common.delete"),
                              variant: "ghost",
                              size: "sm",
                              onClick: { action: "delete", args: [job.id] },
                            },
                          ],
                        },
                      ],
                    } as A2UIRowNode,
                    // Meta row: image count, ratio, date
                    {
                      type: "row",
                      gap: "0.75rem",
                      align: "center",
                      className: "text-muted-foreground",
                      children: [
                        {
                          type: "text",
                          text: `📷 ${job.images.length}/${job.totalImages}`,
                          variant: "caption",
                          color: "muted",
                        },
                        {
                          type: "text",
                          text: `${job.ratio || "3:4"} · ${job.resolution || "2K"}`,
                          variant: "caption",
                          color: "muted",
                        },
                        {
                          type: "text",
                          text: new Date(job.createdAt).toLocaleDateString(),
                          variant: "caption",
                          color: "muted",
                        },
                      ],
                    } as A2UIRowNode,
                    // Progress bar for processing
                    ...(isProcessing ? [{
                      type: "progress" as const,
                      status: "processing" as const,
                      value: progressPercent,
                      className: "h-1.5",
                    }] : []),
                    // Error message
                    ...(isFailed && job.errorMessage ? [{
                      type: "text" as const,
                      text: `❌ ${job.errorMessage}`,
                      variant: "caption" as const,
                      color: "destructive" as const,
                    }] : []),
                  ],
                } as A2UIColumnNode,
              ],
            },
            // Image grid - always visible, with zoom support
            {
              type: "container",
              className: `p-4 ${isZoomed ? "bg-muted/40" : "bg-muted/20"}`,
              children: [buildImageGrid(job.images, job.id, job.status, job.totalImages, isZoomed)],
            },
          ],
        },
      ],
    }
  }

  // Build list content
  const getListContent = (): A2UINode => {
    if (error) {
      return {
        type: "card",
        hoverable: false,
        className: "p-8 text-center",
        children: [{ type: "text", text: `Error: ${error.message}`, color: "destructive" }],
      }
    }

    if (isLoading) {
      return {
        type: "row",
        justify: "center",
        className: "py-12",
        children: [{ type: "text", text: t("common.loading"), color: "muted" }],
      }
    }

    if (jobs.length === 0) {
      return {
        type: "card",
        hoverable: false,
        className: "p-12 text-center",
        children: [
          {
            type: "column",
            gap: "0.75rem",
            className: "items-center",
            children: [
              { type: "text", text: "📷", variant: "h1" },
              { type: "text", text: t("xhsImages.noJobs"), color: "muted" },
            ],
          },
        ],
      }
    }

    return {
      type: "column",
      gap: "1.5rem",
      children: jobs.map(job => buildJobCard(job)),
    }
  }

  // Header node
  const headerNode: A2UIColumnNode = {
    type: "column",
    gap: "1rem",
    children: [
      {
        type: "row",
        justify: "between",
        align: "center",
        wrap: true,
        gap: "0.75rem",
        children: [
          {
            type: "row",
            align: "center",
            gap: "0.75rem",
            children: [
              { type: "text", text: t("xhsImages.title"), variant: "h2", weight: "bold" },
              ...(isPolling ? [{
                type: "badge" as const,
                text: t("tasks.polling", { count: processingCount }),
                color: "processing" as const,
              }] : []),
            ],
          },
          {
            type: "button",
            text: t("xhsImages.generate"),
            variant: "primary",
            icon: "plus",
            onClick: { action: "openGenerateModal" },
          },
        ],
      },
    ],
  }

  // Action handler
  const handleA2UIAction = useCallback(
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
        case "delete":
          handleDelete(args?.[0] as string)
          break
        case "publish":
          handlePublish(args?.[0] as string)
          break
        case "copyUrl":
          handleCopyUrl(args?.[0] as string)
          break
        case "toggleZoom": {
          const jobId = args?.[0] as string
          setZoomedJobId(prev => prev === jobId ? null : jobId)
          break
        }
        case "openGenerateModal":
          setIsGenerateModalOpen(true)
          break
      }
    },
    [router]
  )

  if (!mounted) return null

  // Build content
  const contentNode: A2UINode = {
    type: "container",
    className: "flex-1 min-h-0 flex flex-col overflow-hidden",
    children: [
      {
        type: "container",
        className: "shrink-0 pb-4",
        children: [headerNode],
      },
      {
        type: "scroll-area",
        className: "flex-1 min-h-0",
        children: [
          {
            type: "container",
            className: "flex flex-col gap-4 pb-4",
            children: [getListContent()],
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
    children: [contentNode],
  }

  return (
    <>
      <A2UIRenderer node={appShellNode} onAction={handleA2UIAction} />
      <CreateXhsImageModal
        isOpen={isGenerateModalOpen}
        onClose={() => {
          setIsGenerateModalOpen(false)
          invalidateJobs()
        }}
      />
    </>
  )
}
