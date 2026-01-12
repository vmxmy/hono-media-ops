export type ChapterLike = {
  id?: string
  actNumber: number
  actName?: string | null
  formattedContent?: string | null
  rawContent?: string | null
}

export type MediaLike = {
  act_number?: number
  r2_url?: string
  wechat_media_url?: string
  media_id?: string
  uploaded_at?: string
}

export interface AssembleChaptersOptions {
  /** Whether to prepend chapter headings if content is empty */
  includeActHeading?: boolean
  /** Media items for chapters; will insert after heading */
  media?: MediaLike[] | MediaLike | null
  /** For multiple media per act, pick "first" or "latest" */
  mediaStrategy?: "first" | "latest"
  /** Whether to include chapter markers for parsing */
  includeMarkers?: boolean
}

export type ParsedChapter = {
  id: string
  actNumber: number
  content: string
}

const MARKER_REGEX = /<!--\s*ACT:(\d+)\s+ID:([a-f0-9-]+)\s*-->/gi

export function parseChapterMarkdown(markdown: string): ParsedChapter[] {
  const matches = Array.from(markdown.matchAll(MARKER_REGEX))
  if (matches.length === 0) return []

  const results: ParsedChapter[] = []
  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i]
    if (!match || typeof match.index !== "number") continue

    const actNumber = Number(match[1])
    const id = match[2]
    const start = match.index + match[0].length
    const end = i + 1 < matches.length && typeof matches[i + 1]?.index === "number"
      ? (matches[i + 1]!.index as number)
      : markdown.length
    const content = markdown.slice(start, end).trim()

    if (!id || !Number.isFinite(actNumber)) continue
    results.push({ id, actNumber, content })
  }

  return results
}

export function assembleChapterMarkdown(
  chapters: ChapterLike[],
  options: AssembleChaptersOptions = {}
): string {
  if (!chapters || chapters.length === 0) return ""

  const { includeActHeading = true, media, mediaStrategy = "first", includeMarkers = false } = options

  const sorted = [...chapters].sort((a, b) => (a.actNumber ?? 0) - (b.actNumber ?? 0))

  const mediaByAct: Record<number, MediaLike[]> = {}
  const mediaArray = Array.isArray(media) ? media : media ? [media] : []
  for (const item of mediaArray) {
    const actRaw = item.act_number
    const act = typeof actRaw === "number" ? actRaw : Number(actRaw)
    if (!Number.isFinite(act)) continue
    mediaByAct[act] = mediaByAct[act] ?? []
    mediaByAct[act].push(item)
  }

  const pickMedia = (act: number): MediaLike | null => {
    const list = mediaByAct[act]
    if (!list || list.length === 0) return null
    if (mediaStrategy === "latest") {
      return [...list].sort((a, b) =>
        String(a.uploaded_at || "").localeCompare(String(b.uploaded_at || ""))
      ).slice(-1)[0] ?? null
    }
    return list[0] ?? null
  }

  const insertImageAfterHeading = (content: string, imageMarkdown: string): string => {
    const lines = content.split("\n")
    const headingIndex = lines.findIndex((line) => /^#{1,6}\s+/.test(line.trim()))
    if (headingIndex === -1) {
      return [imageMarkdown, content].filter(Boolean).join("\n\n")
    }
    const result = [
      ...lines.slice(0, headingIndex + 1),
      "",
      imageMarkdown,
      "",
      ...lines.slice(headingIndex + 1),
    ]
    return result.join("\n")
  }

  const parts = sorted.map((chapter) => {
    let content = chapter.formattedContent ?? chapter.rawContent ?? ""
    const items: string[] = []

    if (content.trim().length > 0) {
      const hasHeading = /^#{1,6}\s+/.test(content.trimStart())
      if (!hasHeading && includeActHeading && chapter.actName) {
        content = `## ${chapter.actName}\n\n${content}`
      }
      items.push(content)
    } else if (includeActHeading && chapter.actName) {
      items.push(`## ${chapter.actName}`)
    }

    const mediaItem = pickMedia(chapter.actNumber)
    const mediaUrl = mediaItem?.r2_url || mediaItem?.wechat_media_url
    if (mediaUrl) {
      const altText = chapter.actName ?? mediaItem?.media_id ?? ""
      const imageMarkdown = `![${altText}](${mediaUrl})`
      if (items.length > 0) {
        const merged = insertImageAfterHeading(items.join("\n\n"), imageMarkdown)
        const withMarker = includeMarkers && chapter.id
          ? `<!-- ACT:${chapter.actNumber} ID:${chapter.id} -->\n\n${merged}`
          : merged
        return withMarker
      }
      items.push(imageMarkdown)
    }

    const body = items.filter(Boolean).join("\n\n")
    if (includeMarkers && chapter.id) {
      return `<!-- ACT:${chapter.actNumber} ID:${chapter.id} -->\n\n${body}`.trim()
    }
    return body
  })

  return parts.filter(Boolean).join("\n\n")
}
