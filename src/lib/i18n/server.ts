import enMessages from "../../locales/en.json"
import zhCNMessages from "../../locales/zh-CN.json"

export type ServerLocale = "en" | "zh-CN"

const MESSAGES: Record<ServerLocale, Record<string, string>> = {
  en: enMessages as Record<string, string>,
  "zh-CN": zhCNMessages as Record<string, string>,
}

function formatMessage(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key]?.toString() ?? `{${key}}`)
}

export function createServerTranslator(locale: ServerLocale) {
  return (key: string, vars?: Record<string, string | number>) => {
    const messages = MESSAGES[locale] ?? MESSAGES["zh-CN"]
    const template = messages[key] ?? MESSAGES.en[key] ?? key
    return formatMessage(template, vars)
  }
}
