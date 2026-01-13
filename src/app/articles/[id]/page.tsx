import type { Metadata } from "next"
import { articleService } from "@/server/services/article.service"
import { ArticleClient } from "./article-client"

interface Props {
  params: Promise<{ id: string }>
}

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params

  try {
    const article = await articleService.getByTaskId(id)

    if (!article) {
      return {
        title: "文章未找到 | Wonton",
        description: "该文章不存在或尚未发布",
      }
    }

    const displayTitle = article.articleTitle || article.topic
    const description = article.articleSubtitle
      || (article.articleMarkdown?.slice(0, 160).replace(/\s+/g, " ").trim() + "...")
      || "AI 驱动的内容创作平台"

    return {
      title: displayTitle,
      description,
      openGraph: {
        title: displayTitle,
        description,
        type: "article",
        ...(article.coverUrl && { images: [{ url: article.coverUrl }] }),
      },
      twitter: {
        card: article.coverUrl ? "summary_large_image" : "summary",
        title: displayTitle,
        description,
        ...(article.coverUrl && { images: [article.coverUrl] }),
      },
    }
  } catch (error) {
    console.error("Failed to generate metadata:", error)
    return {
      title: "Wonton",
      description: "AI 驱动的内容创作平台",
    }
  }
}

export default async function ArticleDetailPage({ params }: Props) {
  const { id } = await params

  return <ArticleClient id={id} />
}
