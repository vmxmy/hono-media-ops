/**
 * WeChat Official Account Style Presets
 *
 * Inline CSS styles for WeChat-compatible HTML export.
 * WeChat editor strips <style> tags, so all styles must be inline.
 */

// ==================== Types ====================

export type StylePreset = "default" | "elegant" | "tech" | "modern"

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
  sup: string
  sub: string
  kbd: string
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
  // Highlight
  mark: string
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
  // Components
  callout: string
  figcaption: string
  checkbox: string
}

// ==================== Style Presets ====================

/**
 * Default style - Best practices for WeChat Official Account
 */
const defaultStyles: WechatStyles = {
  article: `
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 17px;
    line-height: 1.9;
    color: #2c2c2c;
    word-wrap: break-word;
  `.trim().replace(/\s+/g, " "),

  callout: `
    margin: 16px 0;
    padding: 16px;
    border-radius: 4px;
    background-color: #f7f7f7;
    font-size: 16px;
    line-height: 1.6;
    color: #555;
  `.trim().replace(/\s+/g, " "),

  figcaption: `
    display: block;
    text-align: center;
    font-size: 14px;
    color: #888;
    margin-top: -10px;
    margin-bottom: 24px;
    line-height: 1.5;
  `.trim().replace(/\s+/g, " "),

  checkbox: `
    display: inline-block;
    margin-right: 6px;
    color: #666;
    font-size: 16px;
  `.trim().replace(/\s+/g, " "),

  h1: `
    font-size: 26px;
    font-weight: 700;
    margin: 28px 0 16px 0;
    color: #111;
    border-bottom: 2px solid #f0f0f0;
    padding-bottom: 10px;
  `.trim().replace(/\s+/g, " "),

  h2: `
    font-size: 22px;
    font-weight: 700;
    margin: 24px 0 14px 0;
    color: #1a1a1a;
    border-left: 4px solid #07c160;
    padding-left: 10px;
  `.trim().replace(/\s+/g, " "),

  h3: `
    font-size: 19px;
    font-weight: 600;
    margin: 20px 0 10px 0;
    color: #333;
  `.trim().replace(/\s+/g, " "),

  h4: `
    font-size: 17px;
    font-weight: 600;
    margin: 18px 0 8px 0;
    color: #444;
  `.trim().replace(/\s+/g, " "),

  h5: `
    font-size: 16px;
    font-weight: 600;
    margin: 16px 0 8px 0;
    color: #555;
  `.trim().replace(/\s+/g, " "),

  h6: `
    font-size: 15px;
    font-weight: 600;
    margin: 14px 0 6px 0;
    color: #666;
  `.trim().replace(/\s+/g, " "),

  p: `
    font-size: 17px;
    line-height: 1.9;
    margin: 14px 0;
    color: #2f2f2f;
    text-align: left;
  `.trim().replace(/\s+/g, " "),

  strong: `
    font-weight: 700;
    color: #1a1a1a;
  `.trim().replace(/\s+/g, " "),

  sup: `
    font-size: 12px;
    vertical-align: super;
  `.trim().replace(/\s+/g, " "),

  sub: `
    font-size: 12px;
    vertical-align: sub;
  `.trim().replace(/\s+/g, " "),

  kbd: `
    display: inline-block;
    padding: 2px 6px;
    font-size: 13px;
    line-height: 1.2;
    color: #333;
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 3px;
    box-shadow: inset 0 -1px 0 #ddd;
    font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
  `.trim().replace(/\s+/g, " "),

  em: `
    font-style: italic;
  `.trim().replace(/\s+/g, " "),

  del: `
    text-decoration: line-through;
    color: #999;
  `.trim().replace(/\s+/g, " "),

  a: `
    color: #1e6fd9;
    text-decoration: none;
  `.trim().replace(/\s+/g, " "),

  ul: `
    margin: 12px 0;
    padding-left: 22px;
  `.trim().replace(/\s+/g, " "),

  ol: `
    margin: 12px 0;
    padding-left: 22px;
  `.trim().replace(/\s+/g, " "),

  li: `
    margin: 6px 0;
    line-height: 1.8;
  `.trim().replace(/\s+/g, " "),

  code: `
    font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
    font-size: 14px;
    background-color: #f6f7f9;
    padding: 2px 6px;
    border-radius: 3px;
    color: #d14;
  `.trim().replace(/\s+/g, " "),

  pre: `
    font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
    font-size: 14px;
    background-color: #f7f8fa;
    padding: 16px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 16px 0;
    line-height: 1.6;
    border: 1px solid #eceff3;
  `.trim().replace(/\s+/g, " "),

  blockquote: `
    margin: 16px 0;
    padding: 12px 16px;
    background-color: #f7f8fa;
    border-left: 4px solid #dfe3e8;
    color: #555;
    font-size: 16px;
  `.trim().replace(/\s+/g, " "),

  mark: `
    background-color: #fff3bf;
    padding: 0 2px;
    border-radius: 2px;
  `.trim().replace(/\s+/g, " "),

  table: `
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 15px;
  `.trim().replace(/\s+/g, " "),

  th: `
    background-color: #f6f7f9;
    padding: 10px 12px;
    border: 1px solid #e6e8ec;
    font-weight: 600;
    text-align: left;
  `.trim().replace(/\s+/g, " "),

  td: `
    padding: 10px 12px;
    border: 1px solid #e6e8ec;
  `.trim().replace(/\s+/g, " "),

  hr: `
    border: none;
    border-top: 1px solid #eceff3;
    margin: 24px 0;
  `.trim().replace(/\s+/g, " "),

  img: `
    max-width: 100%;
    height: auto;
    margin: 18px 0;
    border-radius: 6px;
  `.trim().replace(/\s+/g, " "),
}

/**
 * Elegant style - Magazine-like with refined typography
 */
const elegantStyles: WechatStyles = {
  ...defaultStyles,

  article: `
    font-family: "Noto Serif SC", "Songti SC", "STSong", "PingFang SC", -apple-system, serif;
    font-size: 17px;
    line-height: 2.05;
    color: #242424;
    letter-spacing: 0.6px;
  `.trim().replace(/\s+/g, " "),

  h1: `
    font-size: 28px;
    font-weight: 600;
    margin: 32px 0 18px 0;
    color: #1a1a1a;
    letter-spacing: 1px;
    text-align: center;
  `.trim().replace(/\s+/g, " "),

  h2: `
    font-size: 23px;
    font-weight: 600;
    margin: 28px 0 14px 0;
    color: #1a1a1a;
    border-bottom: 1px solid #e6e1da;
    padding-bottom: 6px;
  `.trim().replace(/\s+/g, " "),

  h3: `
    font-size: 20px;
    font-weight: 600;
    margin: 22px 0 10px 0;
    color: #2f2f2f;
  `.trim().replace(/\s+/g, " "),

  p: `
    font-size: 17px;
    line-height: 2.05;
    margin: 18px 0;
    color: #242424;
    text-indent: 0;
    text-align: left;
  `.trim().replace(/\s+/g, " "),

  sup: `
    font-size: 12px;
    vertical-align: super;
  `.trim().replace(/\s+/g, " "),

  sub: `
    font-size: 12px;
    vertical-align: sub;
  `.trim().replace(/\s+/g, " "),

  kbd: `
    display: inline-block;
    padding: 2px 6px;
    font-size: 13px;
    line-height: 1.2;
    color: #3a2f24;
    background: #f4ecde;
    border: 1px solid #d8c7ab;
    border-radius: 3px;
    box-shadow: inset 0 -1px 0 #d8c7ab;
    font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
  `.trim().replace(/\s+/g, " "),

  blockquote: `
    margin: 20px 0;
    padding: 16px 20px;
    background: #fbfaf7;
    border-left: 3px solid #cdbb9a;
    color: #4f4f4f;
    font-size: 16px;
    font-style: italic;
  `.trim().replace(/\s+/g, " "),

  mark: `
    background-color: #f4ecde;
    padding: 0 2px;
    border-radius: 2px;
  `.trim().replace(/\s+/g, " "),

  a: `
    color: #07c160;
    text-decoration: none;
    border-bottom: 1px dashed #07c160;
  `.trim().replace(/\s+/g, " "),

  callout: `
    margin: 20px 0;
    padding: 20px;
    background-color: #fafafa;
    border: 1px solid #eee;
    font-size: 16px;
    line-height: 1.8;
    color: #555;
    text-indent: 0;
  `.trim().replace(/\s+/g, " "),

  figcaption: `
    display: block;
    text-align: center;
    font-size: 14px;
    font-family: "KaiTi", "STKaiti", serif;
    color: #666;
    margin-top: -12px;
    margin-bottom: 28px;
  `.trim().replace(/\s+/g, " "),

  checkbox: `
    display: inline-block;
    margin-right: 6px;
    color: #8c6b3f;
    font-size: 16px;
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

  sup: `
    font-size: 12px;
    vertical-align: super;
  `.trim().replace(/\s+/g, " "),

  sub: `
    font-size: 12px;
    vertical-align: sub;
  `.trim().replace(/\s+/g, " "),

  kbd: `
    display: inline-block;
    padding: 2px 6px;
    font-size: 13px;
    line-height: 1.2;
    color: #24292e;
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    border-radius: 3px;
    box-shadow: inset 0 -1px 0 #d0d7de;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
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

  mark: `
    background-color: #fff1c2;
    padding: 0 2px;
    border-radius: 2px;
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

  callout: `
    margin: 16px 0;
    padding: 16px;
    background-color: #f1f8ff;
    border: 1px solid #c8e1ff;
    border-radius: 6px;
    font-size: 15px;
    line-height: 1.6;
    color: #24292e;
  `.trim().replace(/\s+/g, " "),

  figcaption: `
    display: block;
    text-align: center;
    font-size: 13px;
    color: #586069;
    margin-top: -10px;
    margin-bottom: 24px;
  `.trim().replace(/\s+/g, " "),
}

/**
 * Modern style - Clean, card-like with fresh colors and gradients
 */
const modernStyles: WechatStyles = {
  ...defaultStyles,

  article: `
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 16px;
    line-height: 1.8;
    color: #333;
    letter-spacing: 0.05em;
    text-align: justify;
  `.trim().replace(/\s+/g, " "),

  h1: `
    font-size: 24px;
    font-weight: 700;
    margin: 40px 0 20px 0;
    color: #1f2937;
    text-align: center;
    background-image: linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%);
    background-repeat: no-repeat;
    background-size: 100% 0.4em;
    background-position: 0 88%;
  `.trim().replace(/\s+/g, " "),

  h2: `
    font-size: 20px;
    font-weight: 700;
    margin: 30px 0 16px 0;
    color: #111827;
    padding-left: 12px;
    border-left: 5px solid #3b82f6;
    border-radius: 2px;
  `.trim().replace(/\s+/g, " "),

  h3: `
    font-size: 18px;
    font-weight: 600;
    margin: 24px 0 12px 0;
    color: #1f2937;
    padding-left: 8px;
  `.trim().replace(/\s+/g, " "),

  p: `
    font-size: 16px;
    line-height: 1.8;
    margin: 16px 0;
    color: #374151;
  `.trim().replace(/\s+/g, " "),

  strong: `
    font-weight: 700;
    color: #ef4444;
  `.trim().replace(/\s+/g, " "),

  blockquote: `
    margin: 24px 0;
    padding: 16px;
    background-color: #f3f4f6;
    border-radius: 8px;
    border-left: none;
    color: #4b5563;
    font-size: 15px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  `.trim().replace(/\s+/g, " "),

  code: `
    font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
    font-size: 14px;
    background-color: #fef2f2;
    padding: 2px 6px;
    border-radius: 4px;
    color: #ef4444;
  `.trim().replace(/\s+/g, " "),

  pre: `
    font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
    font-size: 13px;
    background-color: #1f2937;
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 24px 0;
    line-height: 1.6;
    color: #e5e7eb;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  `.trim().replace(/\s+/g, " "),

  a: `
    color: #3b82f6;
    text-decoration: none;
    border-bottom: 1px solid #93c5fd;
  `.trim().replace(/\s+/g, " "),

  sup: `
    font-size: 12px;
    vertical-align: super;
  `.trim().replace(/\s+/g, " "),

  sub: `
    font-size: 12px;
    vertical-align: sub;
  `.trim().replace(/\s+/g, " "),

  kbd: `
    display: inline-block;
    padding: 2px 6px;
    font-size: 13px;
    line-height: 1.2;
    color: #1f2937;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 3px;
    box-shadow: inset 0 -1px 0 #e5e7eb;
    font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
  `.trim().replace(/\s+/g, " "),

  img: `
    max-width: 100%;
    height: auto;
    margin: 24px 0;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  `.trim().replace(/\s+/g, " "),

  hr: `
    border: none;
    height: 1px;
    background: linear-gradient(to right, transparent, #d1d5db, transparent);
    margin: 40px 0;
  `.trim().replace(/\s+/g, " "),

  callout: `
    margin: 24px 0;
    padding: 16px;
    background-color: #eff6ff;
    border-radius: 8px;
    border-left: 4px solid #3b82f6;
    color: #1e3a8a;
    font-size: 15px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  `.trim().replace(/\s+/g, " "),

  figcaption: `
    display: block;
    text-align: center;
    font-size: 14px;
    color: #6b7280;
    margin-top: -16px;
    margin-bottom: 32px;
    font-style: italic;
  `.trim().replace(/\s+/g, " "),

  checkbox: `
    display: inline-block;
    margin-right: 6px;
    color: #1f2937;
    font-size: 16px;
  `.trim().replace(/\s+/g, " "),
}

// ==================== Exports ====================

export const WECHAT_STYLES: Record<StylePreset, WechatStyles> = {
  default: defaultStyles,
  elegant: elegantStyles,
  tech: techStyles,
  modern: modernStyles,
}

export const STYLE_PRESET_LABELS: Record<StylePreset, { en: string; zh: string }> = {
  default: { en: "Default", zh: "默认" },
  elegant: { en: "Elegant", zh: "优雅" },
  tech: { en: "Tech", zh: "技术" },
  modern: { en: "Modern", zh: "现代" },
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
