/**
 * Rehype plugin for PlantUML diagram rendering
 * Converts ```plantuml code blocks to SVG diagrams
 */
import { visit } from "unist-util-visit"
import { deflateSync } from "fflate"
import type { Root, Element } from "hast"
import type { Plugin } from "unified"

export interface PlantUMLOptions {
  /**
   * PlantUML server URL
   * @default 'https://www.plantuml.com/plantuml'
   */
  serverUrl?: string
  /**
   * Output format
   * @default 'svg'
   */
  format?: "svg" | "png"
  /**
   * CSS class name for the container
   * @default 'plantuml-diagram'
   */
  className?: string
  /**
   * Whether to inline SVG content (for WeChat)
   * @default false
   */
  inlineSvg?: boolean
}

/**
 * PlantUML 6-bit encoding function
 * Based on official spec: https://plantuml.com/text-encoding
 */
function encode6bit(b: number): string {
  if (b < 10) return String.fromCharCode(48 + b)
  b -= 10
  if (b < 26) return String.fromCharCode(65 + b)
  b -= 26
  if (b < 26) return String.fromCharCode(97 + b)
  b -= 26
  if (b === 0) return "-"
  if (b === 1) return "_"
  return "?"
}

/**
 * Append 3 bytes to encoded string
 */
function append3bytes(b1: number, b2: number, b3: number): string {
  const c1 = b1 >> 2
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4)
  const c3 = ((b2 & 0xf) << 2) | (b3 >> 6)
  const c4 = b3 & 0x3f
  return (
    encode6bit(c1 & 0x3f) +
    encode6bit(c2 & 0x3f) +
    encode6bit(c3 & 0x3f) +
    encode6bit(c4 & 0x3f)
  )
}

/**
 * PlantUML base64 encoding
 */
function encode64(data: string): string {
  let result = ""
  for (let i = 0; i < data.length; i += 3) {
    if (i + 2 === data.length) {
      result += append3bytes(data.charCodeAt(i), data.charCodeAt(i + 1), 0)
    } else if (i + 1 === data.length) {
      result += append3bytes(data.charCodeAt(i), 0, 0)
    } else {
      result += append3bytes(
        data.charCodeAt(i),
        data.charCodeAt(i + 1),
        data.charCodeAt(i + 2)
      )
    }
  }
  return result
}

/**
 * Deflate compress using fflate
 */
function performDeflate(input: string): string {
  const inputBytes = new TextEncoder().encode(input)
  const compressed = deflateSync(inputBytes, { level: 9 })
  return String.fromCharCode(...compressed)
}

/**
 * Encode PlantUML code to server format
 * UTF-8 → Deflate → PlantUML Base64
 */
function encodePlantUML(code: string): string {
  const deflated = performDeflate(code)
  return encode64(deflated)
}

/**
 * Generate PlantUML image URL
 */
function generatePlantUMLUrl(
  code: string,
  serverUrl: string,
  format: string
): string {
  const finalCode =
    !code.trim().includes("@start") || !code.trim().includes("@end")
      ? `@startuml\n${code.trim()}\n@enduml`
      : code

  const encoded = encodePlantUML(finalCode)
  return `${serverUrl}/${format}/${encoded}`
}

/**
 * Extract text content from HAST element
 */
function getTextContent(node: Element): string {
  let text = ""
  if (node.children) {
    for (const child of node.children) {
      if (child.type === "text") {
        text += child.value
      } else if (child.type === "element") {
        text += getTextContent(child)
      }
    }
  }
  return text
}

/**
 * Check if element has plantuml language class
 */
function isPlantUMLCode(node: Element): boolean {
  const className = node.properties?.className
  if (Array.isArray(className)) {
    return className.some(
      (c) =>
        c === "language-plantuml" ||
        c === "lang-plantuml" ||
        c === "hljs-plantuml"
    )
  }
  if (typeof className === "string") {
    return (
      className.includes("language-plantuml") ||
      className.includes("lang-plantuml")
    )
  }
  return false
}

/**
 * Rehype plugin for PlantUML
 */
export const rehypePlantUML: Plugin<[PlantUMLOptions?], Root> = (
  options = {}
) => {
  const serverUrl = options.serverUrl ?? "https://www.plantuml.com/plantuml"
  const format = options.format ?? "svg"
  const className = options.className ?? "plantuml-diagram"
  const inlineSvg = options.inlineSvg ?? false

  return (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      // Look for <pre><code class="language-plantuml">...</code></pre>
      if (node.tagName !== "pre" || !parent || index === undefined) return

      const codeElement = node.children.find(
        (child): child is Element =>
          child.type === "element" && child.tagName === "code"
      )

      if (!codeElement || !isPlantUMLCode(codeElement)) return

      const code = getTextContent(codeElement)
      if (!code.trim()) return

      const imageUrl = generatePlantUMLUrl(code, serverUrl, format)

      // Create replacement element
      const newNode: Element = {
        type: "element",
        tagName: "div",
        properties: {
          className: [className],
          style: "text-align: center; margin: 16px 0; overflow-x: auto;",
        },
        children: inlineSvg
          ? [
              {
                type: "element",
                tagName: "div",
                properties: {
                  className: ["plantuml-svg-container"],
                  "data-plantuml-url": imageUrl,
                  style: "display: inline-block; max-width: 100%;",
                },
                children: [
                  {
                    type: "element",
                    tagName: "img",
                    properties: {
                      src: imageUrl,
                      alt: "PlantUML Diagram",
                      style: "max-width: 100%; height: auto;",
                      loading: "lazy",
                    },
                    children: [],
                  },
                ],
              },
            ]
          : [
              {
                type: "element",
                tagName: "img",
                properties: {
                  src: imageUrl,
                  alt: "PlantUML Diagram",
                  style: "max-width: 100%; height: auto;",
                  loading: "lazy",
                },
                children: [],
              },
            ],
      }

      // Replace the pre element with the new div
      parent.children.splice(index, 1, newNode)
    })
  }
}

export default rehypePlantUML
