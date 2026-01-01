/**
 * WeChat Official Account Style Presets
 *
 * Inline CSS styles for WeChat-compatible HTML export.
 * WeChat editor strips <style> tags, so all styles must be inline.
 */

// ==================== Types ====================

export type StylePreset = "default" | "elegant" | "tech"

export interface WechatStyles {
  // Headings
  h1: string
  h2: string
  h3: string
  h4: string
  h5: string
  h6: string
  // Text
  p: string
  strong: string
  em: string
  del: string
  // Links
  a: string
  // Lists
  ul: string
  ol: string
  li: string
  // Code
  code: string
  pre: string
  // Blockquote
  blockquote: string
  // Table
  table: string
  th: string
  td: string
  // Horizontal rule
  hr: string
  // Image
  img: string
  // Container
  article: string
}

// ==================== Style Presets ====================

/**
 * Default style - Clean and readable
 */
const defaultStyles: WechatStyles = {
  article: `
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 16px;
    line-height: 1.8;
    color: #333;
    word-wrap: break-word;
  `.trim().replace(/\s+/g, " "),

  h1: `
    font-size: 24px;
    font-weight: bold;
    margin: 24px 0 16px 0;
    color: #1a1a1a;
    border-bottom: 1px solid #eee;
    padding-bottom: 8px;
  `.trim().replace(/\s+/g, " "),

  h2: `
    font-size: 20px;
    font-weight: bold;
    margin: 20px 0 14px 0;
    color: #1a1a1a;
    border-bottom: 1px solid #f0f0f0;
    padding-bottom: 6px;
  `.trim().replace(/\s+/g, " "),

  h3: `
    font-size: 18px;
    font-weight: bold;
    margin: 18px 0 12px 0;
    color: #333;
  `.trim().replace(/\s+/g, " "),

  h4: `
    font-size: 16px;
    font-weight: bold;
    margin: 16px 0 10px 0;
    color: #333;
  `.trim().replace(/\s+/g, " "),

  h5: `
    font-size: 15px;
    font-weight: bold;
    margin: 14px 0 8px 0;
    color: #555;
  `.trim().replace(/\s+/g, " "),

  h6: `
    font-size: 14px;
    font-weight: bold;
    margin: 12px 0 6px 0;
    color: #666;
  `.trim().replace(/\s+/g, " "),

  p: `
    font-size: 16px;
    line-height: 1.8;
    margin: 12px 0;
    color: #3f3f3f;
    text-align: justify;
  `.trim().replace(/\s+/g, " "),

  strong: `
    font-weight: bold;
    color: #1a1a1a;
  `.trim().replace(/\s+/g, " "),

  em: `
    font-style: italic;
  `.trim().replace(/\s+/g, " "),

  del: `
    text-decoration: line-through;
    color: #999;
  `.trim().replace(/\s+/g, " "),

  a: `
    color: #576b95;
    text-decoration: none;
  `.trim().replace(/\s+/g, " "),

  ul: `
    margin: 12px 0;
    padding-left: 24px;
  `.trim().replace(/\s+/g, " "),

  ol: `
    margin: 12px 0;
    padding-left: 24px;
  `.trim().replace(/\s+/g, " "),

  li: `
    margin: 6px 0;
    line-height: 1.8;
  `.trim().replace(/\s+/g, " "),

  code: `
    font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
    font-size: 14px;
    background-color: #f5f5f5;
    padding: 2px 6px;
    border-radius: 3px;
    color: #d14;
  `.trim().replace(/\s+/g, " "),

  pre: `
    font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
    font-size: 14px;
    background-color: #f8f8f8;
    padding: 16px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 16px 0;
    line-height: 1.6;
    border: 1px solid #e8e8e8;
  `.trim().replace(/\s+/g, " "),

  blockquote: `
    margin: 16px 0;
    padding: 12px 16px;
    background-color: #f9f9f9;
    border-left: 4px solid #ddd;
    color: #666;
    font-size: 15px;
  `.trim().replace(/\s+/g, " "),

  table: `
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 15px;
  `.trim().replace(/\s+/g, " "),

  th: `
    background-color: #f5f5f5;
    padding: 10px 12px;
    border: 1px solid #ddd;
    font-weight: bold;
    text-align: left;
  `.trim().replace(/\s+/g, " "),

  td: `
    padding: 10px 12px;
    border: 1px solid #ddd;
  `.trim().replace(/\s+/g, " "),

  hr: `
    border: none;
    border-top: 1px solid #eee;
    margin: 24px 0;
  `.trim().replace(/\s+/g, " "),

  img: `
    max-width: 100%;
    height: auto;
    margin: 16px 0;
    border-radius: 4px;
  `.trim().replace(/\s+/g, " "),
}

/**
 * Elegant style - Magazine-like with refined typography
 */
const elegantStyles: WechatStyles = {
  ...defaultStyles,

  article: `
    font-family: "PingFang SC", "Microsoft YaHei", -apple-system, sans-serif;
    font-size: 17px;
    line-height: 2;
    color: #2c2c2c;
    letter-spacing: 0.5px;
  `.trim().replace(/\s+/g, " "),

  h1: `
    font-size: 26px;
    font-weight: 600;
    margin: 32px 0 20px 0;
    color: #1a1a1a;
    text-align: center;
  `.trim().replace(/\s+/g, " "),

  h2: `
    font-size: 22px;
    font-weight: 600;
    margin: 28px 0 16px 0;
    color: #1a1a1a;
    position: relative;
    padding-left: 16px;
    border-left: 4px solid #07c160;
  `.trim().replace(/\s+/g, " "),

  h3: `
    font-size: 19px;
    font-weight: 600;
    margin: 24px 0 12px 0;
    color: #333;
  `.trim().replace(/\s+/g, " "),

  p: `
    font-size: 17px;
    line-height: 2;
    margin: 16px 0;
    color: #2c2c2c;
    text-indent: 2em;
    text-align: justify;
  `.trim().replace(/\s+/g, " "),

  blockquote: `
    margin: 20px 0;
    padding: 16px 20px;
    background: linear-gradient(to right, #f8faf9, #fff);
    border-left: 4px solid #07c160;
    color: #555;
    font-size: 16px;
    font-style: italic;
  `.trim().replace(/\s+/g, " "),

  a: `
    color: #07c160;
    text-decoration: none;
    border-bottom: 1px dashed #07c160;
  `.trim().replace(/\s+/g, " "),
}

/**
 * Tech style - Developer-friendly with better code display
 */
const techStyles: WechatStyles = {
  ...defaultStyles,

  article: `
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 16px;
    line-height: 1.75;
    color: #24292e;
  `.trim().replace(/\s+/g, " "),

  h1: `
    font-size: 28px;
    font-weight: 700;
    margin: 28px 0 18px 0;
    color: #0366d6;
    border-bottom: 2px solid #0366d6;
    padding-bottom: 10px;
  `.trim().replace(/\s+/g, " "),

  h2: `
    font-size: 22px;
    font-weight: 600;
    margin: 24px 0 14px 0;
    color: #24292e;
    border-bottom: 1px solid #e1e4e8;
    padding-bottom: 8px;
  `.trim().replace(/\s+/g, " "),

  h3: `
    font-size: 18px;
    font-weight: 600;
    margin: 20px 0 12px 0;
    color: #24292e;
  `.trim().replace(/\s+/g, " "),

  p: `
    font-size: 16px;
    line-height: 1.75;
    margin: 14px 0;
    color: #24292e;
  `.trim().replace(/\s+/g, " "),

  code: `
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 13px;
    background-color: rgba(27, 31, 35, 0.05);
    padding: 3px 6px;
    border-radius: 3px;
    color: #e36209;
  `.trim().replace(/\s+/g, " "),

  pre: `
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 13px;
    background-color: #f6f8fa;
    padding: 16px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 16px 0;
    line-height: 1.5;
    border: 1px solid #e1e4e8;
  `.trim().replace(/\s+/g, " "),

  blockquote: `
    margin: 16px 0;
    padding: 0 16px;
    background-color: transparent;
    border-left: 4px solid #dfe2e5;
    color: #6a737d;
    font-size: 15px;
  `.trim().replace(/\s+/g, " "),

  a: `
    color: #0366d6;
    text-decoration: none;
  `.trim().replace(/\s+/g, " "),

  table: `
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 14px;
  `.trim().replace(/\s+/g, " "),

  th: `
    background-color: #f6f8fa;
    padding: 8px 12px;
    border: 1px solid #dfe2e5;
    font-weight: 600;
    text-align: left;
  `.trim().replace(/\s+/g, " "),

  td: `
    padding: 8px 12px;
    border: 1px solid #dfe2e5;
  `.trim().replace(/\s+/g, " "),
}

// ==================== Exports ====================

export const WECHAT_STYLES: Record<StylePreset, WechatStyles> = {
  default: defaultStyles,
  elegant: elegantStyles,
  tech: techStyles,
}

export const STYLE_PRESET_LABELS: Record<StylePreset, { en: string; zh: string }> = {
  default: { en: "Default", zh: "默认" },
  elegant: { en: "Elegant", zh: "优雅" },
  tech: { en: "Tech", zh: "技术" },
}

/**
 * Get style preset by name
 */
export function getStylePreset(preset: StylePreset = "default"): WechatStyles {
  return WECHAT_STYLES[preset]
}

/**
 * Get inline style for an HTML element
 */
export function getElementStyle(
  element: keyof WechatStyles,
  preset: StylePreset = "default"
): string {
  return WECHAT_STYLES[preset][element]
}
